import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrderService {
    constructor(private prisma: PrismaService) { }

    async createOrder(dto: CreateOrderDto) {
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

        } catch (error) {
            // Something failed — mark order as FAILED
            await this.prisma.order.update({
                where: { id: order.id },
                data: { status: 'FAILED' },
            });

            console.log(`Order ${order.id} FAILED: ${error.message}`);
            throw new HttpException(error.message, HttpStatus.BAD_REQUEST);
        }
    }

    private async reserveStock(orderId: string, productId: string, quantity: number) {
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

    private async chargePayment(orderId: string, customerId: string, amount: number) {
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

    async getOrder(id: string) {
        return this.prisma.order.findUnique({ where: { id } });
    }
}