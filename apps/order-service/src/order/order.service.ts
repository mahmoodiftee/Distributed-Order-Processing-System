import { Injectable, HttpException, HttpStatus, OnModuleInit } from '@nestjs/common';
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
        // Save order as PENDING immediately
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

        // Emit event and walk away — no waiting
        const event: OrderCreatedEvent = {
            orderId: order.id,
            customerId: dto.customerId,
            productId: dto.productId,
            quantity: dto.quantity,
            totalAmount: dto.totalAmount,
        };

        await this.producer.send({
            topic: TOPICS.ORDER_CREATED,
            messages: [
                {
                    key: order.id,        // using orderId as key keeps related messages in same partition
                    value: JSON.stringify(event),
                },
            ],
        });

        // Return immediately — processing happens async
        return {
            orderId: order.id,
            status: 'PENDING',
            message: 'Order received and being processed',
        };
    }

    async handleOrderFailed(orderId: string, reason: string, eventId: string) {
        if (await this.isProcessed(eventId)) return;

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' },
        });

        await this.markProcessed(eventId, TOPICS.ORDER_FAILED);
        console.log(`Order ${orderId} FAILED: ${reason}`);
    }

    async handlePaymentCompleted(orderId: string, eventId: string) {
        if (await this.isProcessed(eventId)) return;

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'CONFIRMED' },
        });

        await this.markProcessed(eventId, TOPICS.PAYMENT_COMPLETED);
        console.log(`Order ${orderId} CONFIRMED (via Payment Completed)`);
    }

    async handlePaymentFailed(orderId: string, reason: string, eventId: string) {
        if (await this.isProcessed(eventId)) return;

        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' },
        });

        await this.markProcessed(eventId, TOPICS.PAYMENT_FAILED);
        console.log(`Order ${orderId} FAILED: ${reason}`);
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

    async getOrder(id: string) {
        return this.prisma.order.findUnique({ where: { id } });
    }
}