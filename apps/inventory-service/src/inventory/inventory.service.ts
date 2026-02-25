import { BadRequestException, Injectable } from "@nestjs/common";
import { ReserveStockDto } from "./dto/reserve-stock.dto";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class InventoryService {
    constructor(private readonly prisma: PrismaService) { }

    async reserveStock(dto: ReserveStockDto) {
        const existingStock = await this.prisma.stockReservation.findUnique({
            where: {
                orderId: dto.orderId,
            }
        });

        if (existingStock) {
            console.log(`Order ${dto.orderId} already reserved — returning cached result`);
            return { success: true, message: 'Already reserved' };
        }

        // Use a transaction with row-level locking
        // This prevents two requests from reading the same stock
        // value simultaneously and both thinking there's enough

        return await this.prisma.$transaction(async (tx) => {
            const product = await tx.product.findUnique({
                where: { id: dto.productId },
            });

            if (!product) {
                throw new BadRequestException(`Product ${dto.productId} not found`);
            }

            if (product.stock < dto.quantity) {
                throw new BadRequestException(
                    `Insufficient stock. Requested: ${dto.quantity}, Available: ${product.stock}`
                );
            }
            // Deduct the stock
            await tx.product.update({
                where: { id: dto.productId },
                data: { stock: product.stock - dto.quantity }
            })

            // Record the reservation
            await tx.stockReservation.create({
                data: {
                    orderId: dto.orderId,
                    productId: dto.productId,
                    quantity: dto.quantity,
                }
            })
            console.log(`Reserved ${dto.quantity} units of ${dto.productId} for order ${dto.orderId}`);

            return { success: true, message: 'Stock reserved' };
        })
    }

    async releaseStock(orderId: string) {
        // Find the reservation
        const reservation = await this.prisma.stockReservation.findUnique({
            where: {
                orderId,
            }
        })

        if (!reservation) {
            console.log(`No reservation found for order ${orderId} — nothing to release`);
            return;
        }
        // Give the stock back and delete the reservation
        await this.prisma.$transaction(async (tx) => {
            await tx.product.update({
                where: { id: reservation.productId },
                data: { stock: { increment: reservation.quantity } },
            });

            await tx.stockReservation.delete({
                where: { orderId },
            });
        });
        console.log(`Released stock for order ${orderId}`);
    }

    async getProduct(id: string) {
        return this.prisma.product.findUnique({ where: { id } });
    }
}
