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
let OrderService = class OrderService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    onModuleInit() {
    }
    async createOrder(dto) {
        // Step 1: Save order as PENDING
        const order = await this.prisma.order.create({
            data: {
                customerId: dto.customerId,
                productId: dto.productId,
                quantity: dto.quantity,
                totalAmount: dto.totalAmount,
                status: 'PENDING',
            },
        });
        console.log(`Order ${order.id} created with status PENDING`);
        try {
            // Step 2: Reserve stock in Inventory Service
            await this.reserveStock(order.id, dto.productId, dto.quantity);
            console.log(`Stock reserved for order ${order.id}`);
            // Step 3: Charge payment in Payment Service
            await this.chargePayment(order.id, dto.customerId, dto.totalAmount);
            console.log(`Payment charged for order ${order.id}`);
            // Step 4: Mark order as CONFIRMED
            const confirmed = await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'CONFIRMED' },
            });
            console.log(`Order ${order.id} CONFIRMED`);
            return confirmed;
        }
        catch (error) {
            await this.releaseStock(order.id).catch(() => {
                // If release also fails, log it — don't throw
                console.log(`Could not release stock for order ${order.id}`);
            });
            // Something failed — mark order as FAILED
            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'FAILED' },
            });
            console.log(`Order ${order.id} FAILED: ${error.message}`);
            throw new common_1.HttpException(error.message, common_1.HttpStatus.BAD_REQUEST);
        }
    }
    async releaseStock(orderId) {
        await fetch(`http://localhost:3002/inventory/release/${orderId}`, {
            method: 'DELETE',
        });
    }
    async reserveStock(orderId, productId, quantity) {
        const response = await fetch('http://localhost:3002/inventory/reserve', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, productId, quantity }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Stock reservation failed');
        }
        return response.json();
    }
    async chargePayment(orderId, customerId, amount) {
        const response = await fetch('http://localhost:3003/payment/charge', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderId, customerId, amount }),
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Payment failed');
        }
        return response.json();
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
