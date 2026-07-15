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
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { RolesGuard } from '@/common/guards';
import { TimeslotsService } from './timeslots.service';
import { CreateTimeslotDto, UpdateTimeslotDto } from './timeslots.dto';

@Controller('timeslots')
export class TimeslotsController {
  constructor(private readonly timeslotsService: TimeslotsService) {}

  @Public()
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.timeslotsService.findAll(query);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timeslotsService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  create(@Body() createTimeslotDto: CreateTimeslotDto) {
    return this.timeslotsService.create(createTimeslotDto.startTime, createTimeslotDto.endTime);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  update(@Param('id') id: string, @Body() updateTimeslotDto: UpdateTimeslotDto) {
    return this.timeslotsService.update(id, updateTimeslotDto.startTime, updateTimeslotDto.endTime);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  remove(@Param('id') id: string) {
    return this.timeslotsService.remove(id);
  }
}
