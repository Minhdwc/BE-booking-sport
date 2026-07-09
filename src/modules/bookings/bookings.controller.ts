import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, UpdateBookingDto } from './bookings.dto';

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
  create(@Body() createBookingDto: CreateBookingDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.bookingsService.create(createBookingDto, user);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.bookingsService.update(id, updateBookingDto, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.bookingsService.remove(id, user);
  }
}
