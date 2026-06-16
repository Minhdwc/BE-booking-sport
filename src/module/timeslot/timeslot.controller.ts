import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateTimeslotDto, UpdateTimeslotDto } from './timeslot.dto';
import { TimeslotService } from './timeslot.service';

@Controller('timeslots')
export class TimeslotController {
  constructor(private readonly timeslotService: TimeslotService) {}

  @Get()
  getTimeslots() {
    return this.timeslotService.getTimeslots();
  }

  @Get(':id')
  getTimeslotById(@Param('id') id: string) {
    return this.timeslotService.getTimeslotById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  createTimeslot(@Body() body: CreateTimeslotDto) {
    return this.timeslotService.createTimeslot(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  updateTimeslot(@Param('id') id: string, @Body() body: UpdateTimeslotDto) {
    return this.timeslotService.updateTimeslot(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  deleteTimeslot(@Param('id') id: string) {
    return this.timeslotService.deleteTimeslot(id);
  }
}
