import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { PaymentService } from "./payment.service";
import { ChargePaymentDto } from "./dto/charge-payment.dto";

@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('charge')
    async charge(@Body() dto: ChargePaymentDto) {
        return this.paymentService.charge(dto);
    }
    @Get(':orderId')
    getPayment(@Param('orderId') orderId: string) {
        return this.paymentService.getPayment(orderId);
    }
}