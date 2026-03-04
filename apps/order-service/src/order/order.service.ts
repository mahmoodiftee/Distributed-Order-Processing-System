import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { Kafka, Producer } from 'kafkajs';
import { TOPICS, OrderCreatedEvent } from '@order-system/contracts';

@Injectable()
export class OrderService implements OnModuleInit {
    private producer: Producer;

    constructor(private prisma: PrismaService) {
        const kafka = new Kafka({ brokers: ['localhost:9092'] });
        this.producer = kafka.producer();
    }

    async onModuleInit() {
        await this.producer.connect();
        console.log('Order Service producer connected');
    }

    async createOrder(dto: CreateOrderDto) {
        const order = await this.prisma.order.create({
            data: {
                customerId: dto.customerId,
                productId: dto.productId,
                quantity: dto.quantity,
                totalAmount: dto.totalAmount,
                status: 'PENDING',
            },
        });

        console.log(`Order ${order.id} created — emitting ORDER_CREATED`);

        const event: OrderCreatedEvent = {
            orderId: order.id,
            customerId: dto.customerId,
            productId: dto.productId,
            quantity: dto.quantity,
            totalAmount: dto.totalAmount,
            eventId: `order-created-${order.id}`,
        };

        await this.producer.send({
            topic: TOPICS.ORDER_CREATED,
            messages: [{ key: order.id, value: JSON.stringify(event) }],
        });

        return {
            orderId: order.id,
            status: 'PENDING',
            message: 'Order received and being processed',
        };
    }

    // Only two outcomes now — Saga tells us confirmed or failed
    async handleOrderConfirmed(orderId: string, eventId: string) {
        if (await this.isProcessed(eventId)) return;

        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return;

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'CONFIRMED' },
        });

        await this.markProcessed(eventId, TOPICS.ORDER_CONFIRMED);
        console.log(`Order ${orderId} CONFIRMED`);
    }

    async handleOrderFailed(orderId: string, reason: string, eventId: string) {
        if (await this.isProcessed(eventId)) return;

        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (!order) return;

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' },
        });

        await this.markProcessed(eventId, TOPICS.ORDER_FAILED);
        console.log(`Order ${orderId} FAILED: ${reason}`);
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

    async getOrder(id: string) {
        return this.prisma.order.findUnique({ where: { id } });
    }
}

// Client → Order Service → ORDER_CREATED → Saga
// Saga → RESERVE_STOCK → Inventory → STOCK_RESERVED → Saga
// Saga → PROCESS_PAYMENT → Payment → PAYMENT_COMPLETED → Saga
// Saga → ORDER_CONFIRMED → Order Service