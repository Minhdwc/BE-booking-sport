import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateUserPaymentMethodDto, UpdateUserPaymentMethodDto } from './user-payment-methods.dto';
import { UserPaymentMethodsService } from './user-payment-methods.service';

@Controller('user-payment-methods')
export class UserPaymentMethodsController {
  constructor(private readonly service: UserPaymentMethodsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayloadReturn) {
    return this.service.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.findOne(id, user);
  }

  @Post()
  create(@Body() dto: CreateUserPaymentMethodDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserPaymentMethodDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.service.update(id, user, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.remove(id, user);
  }
}
