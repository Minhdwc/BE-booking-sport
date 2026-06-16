import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateSportDto, UpdateSportDto } from './sport.dto';
import { SportService } from './sport.service';

@Controller('sports')
export class SportController {
  constructor(private readonly sportService: SportService) {}

  @Get()
  getSports() {
    return this.sportService.getSports();
  }

  @Get(':id')
  getSportById(@Param('id') id: string) {
    return this.sportService.getSportById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  createSport(@Body() body: CreateSportDto) {
    return this.sportService.createSport(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  updateSport(@Param('id') id: string, @Body() body: UpdateSportDto) {
    return this.sportService.updateSport(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  deleteSport(@Param('id') id: string) {
    return this.sportService.deleteSport(id);
  }
}
