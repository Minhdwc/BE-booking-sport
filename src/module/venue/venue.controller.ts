import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateVenueDto, UpdateVenueDto } from './venue.dto';
import { VenueService } from './venue.service';

@Controller('venues')
export class VenueController {
  constructor(private readonly venueService: VenueService) {}

  @Get()
  getVenues() {
    return this.venueService.getVenues();
  }

  @Get(':id')
  getVenueById(@Param('id') id: string) {
    return this.venueService.getVenueById(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  createVenue(@Body() body: CreateVenueDto) {
    return this.venueService.createVenue(body);
  }

  @Put(':id')
  @UseGuards(RolesGuard)
  updateVenue(@Param('id') id: string, @Body() body: UpdateVenueDto) {
    return this.venueService.updateVenue(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  deleteVenue(@Param('id') id: string) {
    return this.venueService.deleteVenue(id);
  }
}
