import { Controller, Get, Param } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { InventoryService } from './inventory.service';
import { TOPICS, OrderCreatedEvent } from '@order-system/contracts';

@Controller('inventory')
export class InventoryController {
    constructor(private inventoryService: InventoryService) { }

    @Get('product/:id')
    getProduct(@Param('id') id: string) {
        return this.inventoryService['prisma'].product.findUnique({ where: { id } });
    }

    @EventPattern(TOPICS.ORDER_CREATED)
    handleOrderCreated(@Payload() data: OrderCreatedEvent) {
        return this.inventoryService.handleOrderCreated(data, data.eventId);
    }

    @EventPattern(TOPICS.PAYMENT_FAILED)
    handlePaymentFailed(@Payload() data: any) {
        const { orderId, eventId } = data;
        return this.inventoryService.handlePaymentFailed(orderId, eventId);
    }
}