import { Injectable, OnModuleInit } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';
import { PrismaService } from './prisma/prisma.service';
import { TOPICS, OrderCreatedEvent, StockReservedEvent, StockFailedEvent, PaymentCompletedEvent, PaymentFailedEvent } from '@order-system/contracts';

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
                TOPICS.PAYMENT_FAILED
            ], fromBeginning: true
        });

        await this.consumer.run({
            eachMessage: async ({ topic, message }) => {
                const payload = JSON.parse(message.value.toString());
                await this.handleEvent(topic, payload);
            },
        });

        console.log('Saga Orchestrator started and listening to events');

        await this.recoverSagas();
    }

    private async handleEvent(topic: string, data: any) {
        const { eventId, orderId } = data;

        // Idempotency check
        const processed = await this.prisma.processedEvent.findUnique({ where: { eventId } });
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

    private async handleOrderCreated(data: OrderCreatedEvent) {
        console.log(`Saga STARTED for Order: ${data.orderId}`);

        await this.prisma.saga.upsert({
            where: { orderId: data.orderId },
            update: { status: 'STARTED' },
            create: {
                orderId: data.orderId,
                status: 'STARTED',
                productId: data.productId,
                quantity: data.quantity,
                totalAmount: data.totalAmount,
            }
        });

        // In a real system, we might emit a "RESERVE_STOCK" command here.
        // For now, the Inventory Service already listens to ORDER_CREATED.
        // The Saga Orchestrator acts as a monitor/coordinator.
    }

    private async handleStockReserved(data: StockReservedEvent) {
        console.log(`Stock RESERVED for Order: ${data.orderId}. Moving to Payment.`);

        await this.prisma.saga.update({
            where: { orderId: data.orderId },
            data: { status: 'STOCK_RESERVED' }
        });
    }

    private async handleStockFailed(data: StockFailedEvent) {
        console.log(`Stock FAILED for Order: ${data.orderId}. Reason: ${data.reason}`);

        await this.prisma.saga.update({
            where: { orderId: data.orderId },
            data: { status: 'FAILED', reason: data.reason }
        });

        await this.producer.send({
            topic: TOPICS.ORDER_FAILED,
            messages: [{ key: data.orderId, value: JSON.stringify({ orderId: data.orderId, reason: data.reason, eventId: `saga-failed-${data.orderId}` }) }]
        });
    }

    private async handlePaymentCompleted(data: PaymentCompletedEvent) {
        console.log(`Payment COMPLETED for Order: ${data.orderId}. Saga SUCCESS.`);

        await this.prisma.saga.update({
            where: { orderId: data.orderId },
            data: { status: 'COMPLETED' }
        });

        await this.producer.send({
            topic: TOPICS.ORDER_CONFIRMED,
            messages: [{ key: data.orderId, value: JSON.stringify({ orderId: data.orderId, eventId: `saga-success-${data.orderId}` }) }]
        });
    }

    private async handlePaymentFailed(data: PaymentFailedEvent) {
        console.log(`Payment FAILED for Order: ${data.orderId}. Reason: ${data.reason}. Compensating...`);

        await this.prisma.saga.update({
            where: { orderId: data.orderId },
            data: { status: 'FAILED', reason: data.reason }
        });

        // Compensate: Notify Inventory to release stock, and Order to fail
        await this.producer.send({
            topic: TOPICS.ORDER_FAILED,
            messages: [{ key: data.orderId, value: JSON.stringify({ orderId: data.orderId, reason: data.reason, eventId: `saga-compensation-${data.orderId}` }) }]
        });
    }

    private async recoverSagas() {
        const pendingSagas = await this.prisma.saga.findMany({
            where: { status: { in: ['STARTED', 'STOCK_RESERVED'] } }
        });

        if (pendingSagas.length === 0) return;

        console.log(`[RECOVERY] Found ${pendingSagas.length} pending sagas. Resuming...`);

        for (const saga of pendingSagas) {
            console.log(`[RECOVERY] Resuming Saga for Order: ${saga.orderId} (Status: ${saga.status})`);

            if (saga.status === 'STOCK_RESERVED') {
                // In an orchestrated flow, we would re-trigger the command.
                // Here we just log that we are picking up from where we left.
                console.log(`[RECOVERY] Saga ${saga.orderId} was stuck in STOCK_RESERVED. Waiting for next event...`);
            } else if (saga.status === 'STARTED') {
                console.log(`[RECOVERY] Saga ${saga.orderId} was stuck in STARTED. Waiting for stock reservation...`);
            }
        }
    }
}
