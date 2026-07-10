import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
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

  @Public()
  @Get('vnpay-return')
  vnpayReturn(@Query() query: Record<string, string>, @Res() res: Response) {
    return this.paymentsService.handleVnpayReturn(query, res);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.findOne(id, user);
  }

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.create(createPaymentDto, user);
  }

  @Post(':id/vnpay-url')
  createVnpayUrl(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Req() req: Request,
  ) {
    const forwarded = req.headers['x-forwarded-for'];
    const ipAddr =
      (typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined) ||
      req.ip ||
      '127.0.0.1';

    return this.paymentsService.createVnpayUrl(id, user, ipAddr);
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
