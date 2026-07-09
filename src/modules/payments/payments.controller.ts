import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, UpdatePaymentDto } from './payments.dto';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.findOne(id, user);
  }

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.create(createPaymentDto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.paymentsService.update(id, updatePaymentDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.remove(id, user);
  }
}
