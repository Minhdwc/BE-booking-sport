import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { BookingsService } from './bookings.service';
import { CreateBookingDto, CreateWalkInDto, UpdateBookingStatusDto } from './bookings.dto';

@ApiTags('Bookings')
@ApiBearerAuth('access-token')
@Controller('bookings')
export class BookingsController {
  constructor(private readonly bookingsService: BookingsService) {}

  @Get()
  @ApiOperation({ summary: 'Danh sách booking' })
  findAll(@CurrentUser() user: JwtPayloadReturn, @Query() query: PaginationQueryDto) {
    return this.bookingsService.findAll(user, query);
  }

  @Get(':id/timeline')
  @ApiOperation({ summary: 'Lịch sử thay đổi booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  getTimeline(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.bookingsService.findTimeline(id, user);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.bookingsService.findOne(id, user);
  }

  @Post('walk-in')
  @UseGuards(RolesGuard)
  @Roles('owner', 'admin')
  @ApiOperation({ summary: 'Tạo booking walk-in (owner/admin)' })
  createWalkIn(@CurrentUser() user: JwtPayloadReturn, @Body() dto: CreateWalkInDto) {
    return this.bookingsService.createWalkIn(user, dto);
  }

  @Post()
  @ApiOperation({ summary: 'Tạo booking mới' })
  create(@CurrentUser() user: JwtPayloadReturn, @Body() createBookingDto: CreateBookingDto) {
    return this.bookingsService.create(user, createBookingDto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner', 'user')
  @ApiOperation({ summary: 'Cập nhật trạng thái booking' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Body() updateBookingStatusDto: UpdateBookingStatusDto,
  ) {
    return this.bookingsService.updateStatus(id, user, updateBookingStatusDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Xóa booking (admin)' })
  @ApiParam({ name: 'id', description: 'Booking ID' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.bookingsService.remove(id, user);
  }
}
