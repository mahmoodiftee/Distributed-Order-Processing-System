import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Kafka, Producer } from 'kafkajs';
import { TOPICS, OrderCreatedEvent, StockReservedEvent, StockFailedEvent } from '@order-system/contracts';

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

    async handleOrderCreated(event: OrderCreatedEvent, eventId: string) {
        // kafka event Idempotency check
        if (await this.isProcessed(eventId)) {
            console.log(`Event ${eventId} already processed — skipping`);
            return;
        }

        console.log(`Processing ORDER_CREATED for order ${event.orderId}`);
        /*
        -check product exist or not
        -check stock is available or not
        -deduct the stock
        -record the reservation
         */
        try {
            await this.prisma.$transaction(async (tx) => {
                const product = await tx.product.findUnique({
                    where: { id: event.productId },
                });

                if (!product) throw new Error(`Product ${event.productId} not found`);
                if (product.stock < event.quantity) {
                    throw new Error(`Insufficient stock. Requested: ${event.quantity}, Available: ${product.stock}`);
                }

                await tx.product.update({
                    where: { id: event.productId },
                    data: { stock: product.stock - event.quantity },
                });

                await tx.stockReservation.create({
                    data: {
                        orderId: event.orderId,
                        productId: event.productId,
                        quantity: event.quantity,
                    },
                });
            });

            // Mark event as processed
            await this.markProcessed(eventId, TOPICS.ORDER_CREATED);

            // Emit success event
            const stockReservedEvent: StockReservedEvent = {
                orderId: event.orderId,
                productId: event.productId,
                quantity: event.quantity,
                eventId: `${event.orderId}-stock-reserved`,
            };

            await this.producer.send({
                topic: TOPICS.STOCK_RESERVED,
                messages: [{
                    key: event.orderId,
                    value: JSON.stringify(stockReservedEvent),
                }],
            });

            console.log(`Stock reserved for order ${event.orderId} — emitting STOCK_RESERVED`);

        } catch (error) {

            await this.markProcessed(eventId, TOPICS.ORDER_CREATED);

            // Emit failure
            const stockFailedEvent: StockFailedEvent = {
                orderId: event.orderId,
                reason: error.message,
                eventId: `${event.orderId}-stock-failed`,
            };

            await this.producer.send({
                topic: TOPICS.STOCK_FAILED,
                messages: [{
                    key: event.orderId,
                    value: JSON.stringify(stockFailedEvent),
                }],
            });

            console.log(`Stock reservation FAILED for order ${event.orderId}: ${error.message}`);
        }
    }

    async handlePaymentFailed(orderId: string, eventId: string) {
        if (await this.isProcessed(eventId)) return;

        const reservation = await this.prisma.stockReservation.findUnique({
            where: { orderId },
        });
        /*
        -find reservation
        -add the stock
        -delete the reservation
         */
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
        await this.prisma.processedEvent.create({
            data: { eventId, topic },
        });
    }
}