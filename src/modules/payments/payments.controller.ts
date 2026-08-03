import { Body, Controller, Delete, Get, Param, Patch, Post, Query, Req, Res } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto, PayWithSavedMethodDto, UpdatePaymentDto } from './payments.dto';

@ApiTags('Payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Danh sách thanh toán' })
  findAll(@CurrentUser() user: JwtPayloadReturn, @Query() query: PaginationQueryDto) {
    return this.paymentsService.findAll(user, query);
  }

  @Public()
  @Get('vnpay-return')
  @ApiOperation({ summary: 'VNPay return URL callback' })
  vnpayReturn(@Query() query: Record<string, string>, @Res() res: Response) {
    return this.paymentsService.handleVnpayReturn(query, res);
  }

  @Public()
  @Get('vnpay-ipn')
  @ApiOperation({ summary: 'VNPay IPN callback (GET)' })
  async vnpayIpnGet(@Query() query: Record<string, string>, @Res() res: Response) {
    const result = await this.paymentsService.handleVnpayIpn(query);
    return res.status(200).json(result);
  }

  @Public()
  @Post('vnpay-ipn')
  @ApiOperation({ summary: 'VNPay IPN callback (POST)' })
  async vnpayIpnPost(
    @Query() query: Record<string, string>,
    @Body() body: Record<string, string>,
    @Res() res: Response,
  ) {
    const result = await this.paymentsService.handleVnpayIpn({ ...query, ...body });
    return res.status(200).json(result);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Chi tiết thanh toán' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.findOne(id, user);
  }

  @Post()
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo thanh toán' })
  create(@Body() createPaymentDto: CreatePaymentDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.create(user, createPaymentDto);
  }

  @Post('pending-for-booking/:bookingId')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Lấy hoặc tạo payment pending cho booking' })
  @ApiParam({ name: 'bookingId', description: 'Booking ID' })
  getOrCreatePendingPayment(
    @Param('bookingId') bookingId: string,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.paymentsService.getOrCreatePendingPayment(user, bookingId);
  }

  @Post(':id/vnpay-url')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo URL thanh toán VNPay' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
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
    const platformHeader = req.headers['x-client-platform'];
    const platform = typeof platformHeader === 'string' ? platformHeader : undefined;

    return this.paymentsService.createVnpayUrl(id, user, ipAddr, platform);
  }

  @Post(':id/pay-with-saved-method')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thanh toán bằng phương thức đã lưu (demo)' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  payWithSavedMethod(
    @Param('id') id: string,
    @Body() dto: PayWithSavedMethodDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.paymentsService.payWithSavedMethod(id, user, dto);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật thanh toán' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  update(
    @Param('id') id: string,
    @Body() updatePaymentDto: UpdatePaymentDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.paymentsService.update(id, user, updatePaymentDto);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa thanh toán (admin)' })
  @ApiParam({ name: 'id', description: 'Payment ID' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.paymentsService.remove(id, user);
  }
}
