"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.OrderService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const kafkajs_1 = require("kafkajs");
const contracts_1 = require("@order-system/contracts");
let OrderService = class OrderService {
    constructor(prisma) {
        this.prisma = prisma;
        const kafka = new kafkajs_1.Kafka({ brokers: ['localhost:9092'] });
        this.producer = kafka.producer();
    }
    async onModuleInit() {
        await this.producer.connect();
        console.log('Order Service producer connected');
    }
    async createOrder(dto) {
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
        const event = {
            orderId: order.id,
            customerId: dto.customerId,
            productId: dto.productId,
            quantity: dto.quantity,
            totalAmount: dto.totalAmount,
        };
        await this.producer.send({
            topic: contracts_1.TOPICS.ORDER_CREATED,
            messages: [
                {
                    key: order.id, // using orderId as key keeps related messages in same partition
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
    // Called when we hear back that order is confirmed or failed
    async handleOrderConfirmed(orderId, eventId) {
        if (await this.isProcessed(eventId))
            return;
        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'CONFIRMED' },
        });
        await this.markProcessed(eventId, contracts_1.TOPICS.ORDER_CONFIRMED);
        console.log(`Order ${orderId} CONFIRMED`);
    }
    async handleOrderFailed(orderId, reason, eventId) {
        if (await this.isProcessed(eventId))
            return;
        await this.prisma.order.update({
            where: { id: orderId },
            data: { status: 'FAILED' },
        });
        await this.markProcessed(eventId, contracts_1.TOPICS.ORDER_FAILED);
        console.log(`Order ${orderId} FAILED: ${reason}`);
    }
    async isProcessed(eventId) {
        const existing = await this.prisma.processedEvent.findUnique({
            where: { eventId },
        });
        return !!existing;
    }
    async markProcessed(eventId, topic) {
        await this.prisma.processedEvent.create({
            data: { eventId, topic },
        });
    }
    async getOrder(id) {
        return this.prisma.order.findUnique({ where: { id } });
    }
};
exports.OrderService = OrderService;
exports.OrderService = OrderService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrderService);
