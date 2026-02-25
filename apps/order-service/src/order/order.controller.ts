import { Controller, Post, Get, Body, Param } from '@nestjs/common';
import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';

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
}