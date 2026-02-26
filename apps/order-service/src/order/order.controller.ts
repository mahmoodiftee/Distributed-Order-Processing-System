import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { EventPattern, Payload } from '@nestjs/microservices';
import { TOPICS } from '@order-system/contracts';

@Controller('orders')
export class OrderController {
    constructor(private orderService: OrderService) { }

    @Post()
    createOrder(@Body() dto: CreateOrderDto) {
        return this.orderService.createOrder(dto);
    }

    @Get(':id')
    getOrder(@Param('id') id: string) {
        return this.orderService.getOrder(id);
    }

    // handleOrderConfirmed
    @EventPattern(TOPICS.ORDER_CONFIRMED)
    handleOrderConfirmed(@Payload() message: any) {
        const { orderId, eventId } = JSON.parse(message.value);
        return this.orderService.handleOrderConfirmed(orderId, eventId);
    }

    @EventPattern(TOPICS.ORDER_FAILED)
    handleOrderFailed(@Payload() message: any) {
        const { orderId, reason, eventId } = JSON.parse(message.value);
        return this.orderService.handleOrderFailed(orderId, reason, eventId);
    }
}