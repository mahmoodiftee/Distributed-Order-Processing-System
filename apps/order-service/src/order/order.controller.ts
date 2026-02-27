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


    @EventPattern(TOPICS.ORDER_FAILED)
    handleOrderFailed(@Payload() data: any) {
        const { orderId, reason, eventId } = data;
        return this.orderService.handleOrderFailed(orderId, reason, eventId);
    }

    @EventPattern(TOPICS.PAYMENT_COMPLETED)
    handlePaymentCompleted(@Payload() data: any) {
        const { orderId, eventId } = data;
        return this.orderService.handlePaymentCompleted(orderId, eventId);
    }

    @EventPattern(TOPICS.PAYMENT_FAILED)
    handlePaymentFailed(@Payload() data: any) {
        const { orderId, reason, eventId } = data;
        return this.orderService.handlePaymentFailed(orderId, reason, eventId);
    }
}