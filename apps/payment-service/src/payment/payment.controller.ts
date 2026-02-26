import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { ChargePaymentDto } from "./dto/charge-payment.dto";
import { EventPattern, Payload } from "@nestjs/microservices";
import { StockReservedEvent, TOPICS } from "@order-system/contracts";

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Get(':orderId')
    getPayment(@Param('orderId') orderId: string) {
        return this.paymentService.getPayment(orderId);
    }

    @EventPattern(TOPICS.STOCK_RESERVED)
    async handleStockReserved(@Payload() message: any) {
        const data = JSON.parse(message.value);
        return this.paymentService.handleStockReserved(data, message.offset)
    }
}