import { Module } from '@nestjs/common';
import { SagaService } from './saga.service';
import { PrismaService } from './prisma/prisma.service';

@Module({
    providers: [SagaService, PrismaService],
})
export class AppModule { }
