import { Controller, Get, Param } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';
import { TOPICS } from '@order-system/contracts';

@Controller('inventory')
export class InventoryController {
    constructor(private inventoryService: InventoryService) { }

    @Get('product/:id')
    getProduct(@Param('id') id: string) {
        return this.inventoryService['prisma'].product.findUnique({ where: { id } });
    }

    // Listens to RESERVE_STOCK command from Saga — NOT ORDER_CREATED anymore
    @EventPattern(TOPICS.RESERVE_STOCK)
    handleReserveStock(@Payload() data: any) {
        return this.inventoryService.handleReserveStock(data, data.eventId);
    }

    // Listens to PAYMENT_FAILED from Saga for compensation
    @EventPattern(TOPICS.PAYMENT_FAILED)
    handlePaymentFailed(@Payload() data: any) {
        const { orderId, eventId } = data;
        return this.inventoryService.handlePaymentFailed(orderId, eventId);
    }
}