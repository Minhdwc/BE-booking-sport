import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CreatePaymentDto, UpdatePaymentDto } from './payment.dto';
import { PaymentService } from './payment.service';

@Controller('payments')
export class PaymentController {
  constructor(private readonly paymentService: PaymentService) {}

  @Get()
  @UseGuards(RolesGuard)
  getPayments() {
    return this.paymentService.getPayments();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getPaymentById(@Param('id') id: string) {
    return this.paymentService.getPaymentById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  createPayment(@Body() body: CreatePaymentDto) {
    return this.paymentService.createPayment(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  updatePayment(@Param('id') id: string, @Body() body: UpdatePaymentDto) {
    return this.paymentService.updatePayment(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  deletePayment(@Param('id') id: string) {
    return this.paymentService.deletePayment(id);
  }
}
