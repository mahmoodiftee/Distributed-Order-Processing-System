import { Controller, Get, Param } from '@nestjs/common';
import { EventPattern, Payload } from '@nestjs/microservices';
import { PaymentService } from './payment.service';
import { TOPICS } from '@order-system/contracts';

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Get(':orderId')
    getPayment(@Param('orderId') orderId: string) {
        return this.paymentService.getPayment(orderId);
    }

    // Listens to PROCESS_PAYMENT command from Saga — NOT STOCK_RESERVED anymore
    @EventPattern(TOPICS.PROCESS_PAYMENT)
    handleProcessPayment(@Payload() data: any) {
        return this.paymentService.handleProcessPayment(data, data.eventId);
    }
}