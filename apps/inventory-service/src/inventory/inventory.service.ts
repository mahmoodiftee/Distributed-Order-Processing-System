import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Kafka, Producer } from 'kafkajs';
import { TOPICS } from '@order-system/contracts';

@Injectable()
export class InventoryService implements OnModuleInit {
    private producer: Producer;

    constructor(private prisma: PrismaService) {
        const kafka = new Kafka({ brokers: ['localhost:9092'] });
        this.producer = kafka.producer();
    }

    async onModuleInit() {
        await this.producer.connect();
        console.log('Inventory Service producer connected');
    }

    // Renamed from handleOrderCreated — now only acts on Saga's command
    async handleReserveStock(data: any, eventId: string) {
        if (await this.isProcessed(eventId)) {
            console.log(`Event ${eventId} already processed — skipping`);
            return;
        }

        console.log(`Inventory received RESERVE_STOCK command for order ${data.orderId}`);

        try {
            await this.prisma.$transaction(async (tx) => {
                const product = await tx.product.findUnique({
                    where: { id: data.productId },
                });

                if (!product) throw new Error(`Product ${data.productId} not found`);
                if (product.stock < data.quantity) {
                    throw new Error(
                        `Insufficient stock. Requested: ${data.quantity}, Available: ${product.stock}`,
                    );
                }

                await tx.product.update({
                    where: { id: data.productId },
                    data: { stock: product.stock - data.quantity },
                });

                await tx.stockReservation.create({
                    data: {
                        orderId: data.orderId,
                        productId: data.productId,
                        quantity: data.quantity,
                    },
                });
            });

            await this.markProcessed(eventId, TOPICS.RESERVE_STOCK);

            // Report result back to Saga
            await this.producer.send({
                topic: TOPICS.STOCK_RESERVED,
                messages: [{
                    key: data.orderId,
                    value: JSON.stringify({
                        orderId: data.orderId,
                        productId: data.productId,
                        quantity: data.quantity,
                        eventId: `stock-reserved-${data.orderId}`,
                    }),
                }],
            });

            console.log(`Stock reserved for order ${data.orderId} — emitting STOCK_RESERVED`);

        } catch (error) {
            await this.markProcessed(eventId, TOPICS.RESERVE_STOCK);

            // Report failure back to Saga
            await this.producer.send({
                topic: TOPICS.STOCK_FAILED,
                messages: [{
                    key: data.orderId,
                    value: JSON.stringify({
                        orderId: data.orderId,
                        reason: error.message,
                        eventId: `stock-failed-${data.orderId}`,
                    }),
                }],
            });

            console.log(`Stock reservation FAILED for order ${data.orderId}: ${error.message}`);
        }
    }

    async handlePaymentFailed(orderId: string, eventId: string) {
        if (await this.isProcessed(eventId)) return;

        const reservation = await this.prisma.stockReservation.findUnique({
            where: { orderId },
        });

        if (reservation) {
            await this.prisma.$transaction(async (tx) => {
                await tx.product.update({
                    where: { id: reservation.productId },
                    data: { stock: { increment: reservation.quantity } },
                });
                await tx.stockReservation.delete({ where: { orderId } });
            });

            console.log(`Stock released for order ${orderId}`);
        }

        await this.markProcessed(eventId, TOPICS.PAYMENT_FAILED);
    }

    private async isProcessed(eventId: string): Promise<boolean> {
        const existing = await this.prisma.processedEvent.findUnique({
            where: { eventId },
        });
        return !!existing;
    }

    private async markProcessed(eventId: string, topic: string) {
        await this.prisma.processedEvent.create({ data: { eventId, topic } });
    }
}