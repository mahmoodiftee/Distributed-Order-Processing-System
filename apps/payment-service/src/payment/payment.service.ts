import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ChargePaymentDto } from './dto/charge-payment.dto';

@Injectable()
export class PaymentService {
    constructor(private prisma: PrismaService) { }

    async charge(dto: ChargePaymentDto) {
        // Idempotency check — never charge the same order twice
        const existing = await this.prisma.payment.findUnique({
            where: { orderId: dto.orderId },
        });

        if (existing) {
            console.log(`Order ${dto.orderId} already charged — returning cached result`);

            if (existing.status === 'FAILED') {
                throw new BadRequestException('Payment already failed for this order');
            }

            return existing;
        }

        // Simulate real world — payments fail sometimes
        // 30% failure rate so you can see both paths easily
        const paymentFailed = Math.random() < 0.3;

        if (paymentFailed) {
            // Save the failed attempt — important, you still record it happened
            await this.prisma.payment.create({
                data: {
                    orderId: dto.orderId,
                    customerId: dto.customerId,
                    amount: dto.amount,
                    status: 'FAILED',
                },
            });

            console.log(`Payment FAILED for order ${dto.orderId}`);
            throw new BadRequestException('Payment declined by bank');
        }

        // Payment succeeded
        const payment = await this.prisma.payment.create({
            data: {
                orderId: dto.orderId,
                customerId: dto.customerId,
                amount: dto.amount,
                status: 'SUCCESS',
            },
        });

        console.log(`Payment SUCCESS for order ${dto.orderId}`);
        return payment;
    }

    async getPayment(orderId: string) {
        return this.prisma.payment.findUnique({ where: { orderId } });
    }
}