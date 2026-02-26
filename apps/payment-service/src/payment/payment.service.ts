import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Kafka, Producer } from 'kafkajs';
import { TOPICS, StockReservedEvent } from '@order-system/contracts';

@Injectable()
export class PaymentService implements OnModuleInit {
    private producer: Producer;

    constructor(private prisma: PrismaService) {
        const kafka = new Kafka({ brokers: ['localhost:9092'] });
        this.producer = kafka.producer();
    }

    async onModuleInit() {
        await this.producer.connect();
        console.log('Payment Service producer connected');
    }

    async handleStockReserved(event: StockReservedEvent, eventId: string) {
        if (await this.isProcessed(eventId)) {
            console.log(`Event ${eventId} already processed — skipping`);
            return;
        }

        console.log(`Processing STOCK_RESERVED for order ${event.orderId}`);

        const paymentFailed = Math.random() < 0.5;

        if (paymentFailed) {
            await this.prisma.payment.create({
                data: {
                    orderId: event.orderId,
                    customerId: 'unknown',
                    amount: 0,
                    status: 'FAILED',
                },
            });

            await this.markProcessed(eventId, TOPICS.STOCK_RESERVED);

            await this.producer.send({
                topic: TOPICS.PAYMENT_FAILED,
                messages: [{
                    key: event.orderId,
                    value: JSON.stringify({
                        orderId: event.orderId,
                        reason: 'Payment declined by bank',
                        eventId: `${event.orderId}-payment-failed`,
                    }),
                }],
            });

            await this.producer.send({
                topic: TOPICS.ORDER_FAILED,
                messages: [{
                    key: event.orderId,
                    value: JSON.stringify({
                        orderId: event.orderId,
                        reason: 'Payment declined by bank',
                        eventId: `${event.orderId}-order-failed`,
                    }),
                }],
            });

            console.log(`Payment FAILED for order ${event.orderId}`);
            return;
        }

        await this.prisma.payment.create({
            data: {
                orderId: event.orderId,
                customerId: 'unknown',
                amount: 0,
                status: 'SUCCESS',
            },
        });

        await this.markProcessed(eventId, TOPICS.STOCK_RESERVED);

        await this.producer.send({
            topic: TOPICS.PAYMENT_COMPLETED,
            messages: [{
                key: event.orderId,
                value: JSON.stringify({
                    orderId: event.orderId,
                    eventId: `${event.orderId}-payment-completed`,
                }),
            }],
        });

        console.log(`Payment SUCCESS for order ${event.orderId} — emitting PAYMENT_COMPLETED`);
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
    async getPayment(orderId: string) {
        return this.prisma.payment.findUnique({ where: { orderId } });
    }
}