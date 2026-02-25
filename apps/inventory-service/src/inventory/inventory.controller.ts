import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { InventoryService } from "./inventory.service";
import { ReserveStockDto } from "./dto/reserve-stock.dto";

@Controller('inventory')
export class InventoryController {
    constructor(private readonly inventoryService: InventoryService) { }

    @Post('reserve')
    reserveStock(@Body() dto: ReserveStockDto) {
        return this.inventoryService.reserveStock(dto);
    }

    @Delete('release/:orderId')
    releaseStock(@Param('orderId') orderId: string) {
        return this.inventoryService.releaseStock(orderId);
    }

    @Get('product/:id')
    getProduct(@Param('id') id: string) {
        return this.inventoryService.getProduct(id);
    }

}