import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingStatusDto } from './bookings.dto';

@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayloadReturn) {
    return this.bookingsService.findAll(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.bookingsService.findOne(id, user);
  }

  @Post()
  create(@CurrentUser() user: JwtPayloadReturn, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(
      user,
      createBookingDto.fieldId,
      createBookingDto.timeslotId,
      createBookingDto.date,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'user')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, user, updateBookingStatusDto.status);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.bookingsService.remove(id, user);
  }
}
