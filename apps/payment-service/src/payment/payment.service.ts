import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Kafka, Producer } from 'kafkajs';
import { TOPICS } from '@order-system/contracts';

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

    // Renamed from handleStockReserved — now only acts on Saga's command
    async handleProcessPayment(data: any, eventId: string) {
        if (await this.isProcessed(eventId)) {
            console.log(`Event ${eventId} already processed — skipping`);
            return;
        }

        console.log(`Payment received PROCESS_PAYMENT command for order ${data.orderId}`);

        const paymentFailed = Math.random() < 0.1;

        if (paymentFailed) {
            await this.prisma.payment.create({
                data: {
                    orderId: data.orderId,
                    customerId: 'unknown',
                    amount: 0,
                    status: 'FAILED',
                },
            });

            await this.markProcessed(eventId, TOPICS.PROCESS_PAYMENT);

            // Report failure back to Saga — Saga decides what to do next
            // Payment does NOT emit ORDER_FAILED — that's Saga's job
            await this.producer.send({
                topic: TOPICS.PAYMENT_FAILED,
                messages: [{
                    key: data.orderId,
                    value: JSON.stringify({
                        orderId: data.orderId,
                        reason: 'Payment declined by bank',
                        eventId: `payment-failed-${data.orderId}`,
                    }),
                }],
            });

            console.log(`Payment FAILED for order ${data.orderId} — Saga will compensate`);
            return;
        }

        await this.prisma.payment.create({
            data: {
                orderId: data.orderId,
                customerId: 'unknown',
                amount: 0,
                status: 'SUCCESS',
            },
        });

        await this.markProcessed(eventId, TOPICS.PROCESS_PAYMENT);

        // Report success back to Saga — Saga confirms the order
        await this.producer.send({
            topic: TOPICS.PAYMENT_COMPLETED,
            messages: [{
                key: data.orderId,
                value: JSON.stringify({
                    orderId: data.orderId,
                    eventId: `payment-completed-${data.orderId}`,
                }),
            }],
        });

        console.log(`Payment SUCCESS for order ${data.orderId} — emitting PAYMENT_COMPLETED`);
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

    async getPayment(orderId: string) {
        return this.prisma.payment.findUnique({ where: { orderId } });
    }
}