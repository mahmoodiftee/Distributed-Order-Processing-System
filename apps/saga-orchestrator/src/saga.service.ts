import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { PrismaService } from './prisma/prisma.service';
import {
    TOPICS,
    OrderCreatedEvent,
    StockReservedEvent,
    StockFailedEvent,
    PaymentCompletedEvent,
    PaymentFailedEvent,
} from '@order-system/contracts';

@Injectable()
export class SagaService implements OnModuleInit {
    private kafka = new Kafka({ brokers: ['localhost:9092'] });
    private producer: Producer = this.kafka.producer();
    private consumer: Consumer = this.kafka.consumer({ groupId: 'saga-orchestrator-group' });

    constructor(private prisma: PrismaService) { }

    async onModuleInit() {
        await this.producer.connect();
        await this.consumer.connect();

        await this.consumer.subscribe({
            topics: [
                TOPICS.ORDER_CREATED,
                TOPICS.STOCK_RESERVED,
                TOPICS.STOCK_FAILED,
                TOPICS.PAYMENT_COMPLETED,
                TOPICS.PAYMENT_FAILED,
            ],
            fromBeginning: true,
        });

        await this.consumer.run({
            eachMessage: async ({ topic, message }) => {
                const payload = JSON.parse(message.value.toString());
                await this.handleEvent(topic, payload);
            },
        });

        console.log('Saga Orchestrator started');

        await this.recoverSagas();
        setInterval(() => this.recoverSagas(), 10_000);
    }

    private async handleEvent(topic: string, data: any) {
        const { eventId } = data;

        const processed = await this.prisma.processedEvent.findUnique({
            where: { eventId },
        });
        if (processed) return;

        switch (topic) {
            case TOPICS.ORDER_CREATED:
                await this.handleOrderCreated(data);
                break;
            case TOPICS.STOCK_RESERVED:
                await this.handleStockReserved(data);
                break;
            case TOPICS.STOCK_FAILED:
                await this.handleStockFailed(data);
                break;
            case TOPICS.PAYMENT_COMPLETED:
                await this.handlePaymentCompleted(data);
                break;
            case TOPICS.PAYMENT_FAILED:
                await this.handlePaymentFailed(data);
                break;
        }

        await this.prisma.processedEvent.create({ data: { eventId, topic } });
    }

    // ── Step 1: Order received → persist saga → command Inventory ──────────

    private async handleOrderCreated(data: OrderCreatedEvent) {
        console.log(`Saga STARTED for order ${data.orderId}`);

        await this.prisma.saga.upsert({
            where: { orderId: data.orderId },
            update: {},
            create: {
                orderId: data.orderId,
                status: 'STARTED',
                currentStep: 'RESERVING_STOCK',
                productId: data.productId,
                quantity: data.quantity,
                totalAmount: data.totalAmount,
            },
        });

        // Saga commands Inventory to reserve stock
        // Inventory does NOT listen to ORDER_CREATED anymore
        await this.producer.send({
            topic: TOPICS.RESERVE_STOCK,
            messages: [{
                key: data.orderId,
                value: JSON.stringify({
                    orderId: data.orderId,
                    productId: data.productId,
                    quantity: data.quantity,
                    totalAmount: data.totalAmount,
                    eventId: `reserve-stock-${data.orderId}`,
                }),
            }],
        });

        console.log(`Saga commanded Inventory to RESERVE_STOCK for order ${data.orderId}`);
    }

    // ── Step 2: Stock reserved → persist step → command Payment ───────────

    private async handleStockReserved(data: StockReservedEvent) {
        console.log(`Stock RESERVED for order ${data.orderId} — commanding Payment`);

        // Persist step transition before acting
        await this.prisma.saga.update({
            where: { orderId: data.orderId },
            data: { status: 'STOCK_RESERVED', currentStep: 'CHARGING_PAYMENT' },
        });

        // Saga commands Payment to process payment
        // Payment does NOT listen to STOCK_RESERVED anymore
        await this.producer.send({
            topic: TOPICS.PROCESS_PAYMENT,
            messages: [{
                key: data.orderId,
                value: JSON.stringify({
                    orderId: data.orderId,
                    eventId: `process-payment-${data.orderId}`,
                }),
            }],
        });

        console.log(`Saga commanded Payment to PROCESS_PAYMENT for order ${data.orderId}`);
    }

    // ── Step 3a: Stock failed → no compensation needed → fail order ────────

    private async handleStockFailed(data: StockFailedEvent) {
        console.log(`Stock FAILED for order ${data.orderId}: ${data.reason}`);

        await this.prisma.saga.update({
            where: { orderId: data.orderId },
            data: { status: 'FAILED', currentStep: 'DONE', reason: data.reason },
        });

        await this.producer.send({
            topic: TOPICS.ORDER_FAILED,
            messages: [{
                key: data.orderId,
                value: JSON.stringify({
                    orderId: data.orderId,
                    reason: data.reason,
                    eventId: `order-failed-${data.orderId}`,
                }),
            }],
        });
    }

    // ── Step 3b: Payment completed → saga done → confirm order ─────────────

    private async handlePaymentCompleted(data: PaymentCompletedEvent) {
        console.log(`Payment COMPLETED for order ${data.orderId} — saga SUCCESS`);

        await this.prisma.saga.update({
            where: { orderId: data.orderId },
            data: { status: 'COMPLETED', currentStep: 'DONE' },
        });

        await this.producer.send({
            topic: TOPICS.ORDER_CONFIRMED,
            messages: [{
                key: data.orderId,
                value: JSON.stringify({
                    orderId: data.orderId,
                    eventId: `order-confirmed-${data.orderId}`,
                }),
            }],
        });
    }

    // ── Step 3c: Payment failed → persist compensating → release stock ─────

    private async handlePaymentFailed(data: PaymentFailedEvent) {
        console.log(`Payment FAILED for order ${data.orderId} — compensating`);

        // Persist COMPENSATING before acting
        await this.prisma.saga.update({
            where: { orderId: data.orderId },
            data: {
                status: 'COMPENSATING',
                currentStep: 'RELEASING_STOCK',
                reason: data.reason,
            },
        });

        await this.compensate(data.orderId, data.reason);
    }

    // ── Compensation ────────────────────────────────────────────────────────

    private async compensate(orderId: string, reason: string) {
        // Tell Inventory to release the reserved stock
        await this.producer.send({
            topic: TOPICS.PAYMENT_FAILED,
            messages: [{
                key: orderId,
                value: JSON.stringify({
                    orderId,
                    reason,
                    eventId: `release-stock-${orderId}`,
                }),
            }],
        });

        // Tell Order Service the order failed
        await this.producer.send({
            topic: TOPICS.ORDER_FAILED,
            messages: [{
                key: orderId,
                value: JSON.stringify({
                    orderId,
                    reason,
                    eventId: `order-failed-${orderId}`,
                }),
            }],
        });

        await this.prisma.saga.update({
            where: { orderId },
            data: { status: 'FAILED', currentStep: 'DONE' },
        });

        console.log(`Compensation complete for order ${orderId}`);
    }

    // ── Recovery on startup ─────────────────────────────────────────────────

    private async recoverSagas() {
        const stuck = await this.prisma.saga.findMany({
            where: {
                status: { in: ['STARTED', 'STOCK_RESERVED', 'COMPENSATING'] },
                // Only touch sagas with no activity for over 30 seconds
                // This prevents retrying sagas currently being processed
                updatedAt: { lt: new Date(Date.now() - 30_000) },
            },
        });

        if (stuck.length === 0) return;

        console.log(`[RECOVERY] Found ${stuck.length} stuck saga(s)`);

        for (const saga of stuck) {
            console.log(`[RECOVERY] Order ${saga.orderId} stuck at: ${saga.status}`);

            if (saga.status === 'STARTED') {
                // Inventory never responded — retry the command
                await this.producer.send({
                    topic: TOPICS.RESERVE_STOCK,
                    messages: [{
                        key: saga.orderId,
                        value: JSON.stringify({
                            orderId: saga.orderId,
                            productId: saga.productId,
                            quantity: saga.quantity,
                            totalAmount: saga.totalAmount,
                            eventId: `reserve-stock-recovery-${saga.orderId}`,
                        }),
                    }],
                });
                console.log(`[RECOVERY] Retried RESERVE_STOCK for order ${saga.orderId}`);
            }

            if (saga.status === 'STOCK_RESERVED') {
                // Payment never responded — retry the command
                // Idempotency in payment service ensures no double charge
                await this.producer.send({
                    topic: TOPICS.PROCESS_PAYMENT,
                    messages: [{
                        key: saga.orderId,
                        value: JSON.stringify({
                            orderId: saga.orderId,
                            eventId: `process-payment-recovery-${saga.orderId}`,
                        }),
                    }],
                });
                console.log(`[RECOVERY] Retried PROCESS_PAYMENT for order ${saga.orderId}`);
            }

            if (saga.status === 'COMPENSATING') {
                // Was mid-compensation when crashed — finish it
                await this.compensate(saga.orderId, saga.reason || 'Recovery compensation');
                console.log(`[RECOVERY] Finished compensation for order ${saga.orderId}`);
            }
        }
    }

    // Payment fails → handlePaymentFailed → compensate immediately
    // Stock released → order marked FAILED
    // Recovery never touches it — saga is already FAILED

    // Payment service down → saga stuck at STOCK_RESERVED
    // 30 seconds pass → recovery finds it
    // Recovery retries PROCESS_PAYMENT
    // Payment service back up → processes it → saga completes normally

}