import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { BookingService } from './booking.service';
import { CreateBookingDto, UpdateBookingDto } from './booking.dto';

@Controller('bookings')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @Get()
  @UseGuards(RolesGuard)
  getBookings() {
    return this.bookingService.getBookings();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getBookingById(@Param('id') id: string) {
    return this.bookingService.getBookingById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  createBooking(@Body() body: CreateBookingDto) {
    return this.bookingService.createBooking(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  updateBooking(@Param('id') id: string, @Body() body: UpdateBookingDto) {
    return this.bookingService.updateBooking(id, body);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  deleteBooking(@Param('id') id: string) {
    return this.bookingService.deleteBooking(id);
  }
}
