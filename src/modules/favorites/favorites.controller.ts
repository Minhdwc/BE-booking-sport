import { Controller, Get, Param, Post } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { FavoritesService } from './favorites.service';

@Controller('favorites')
export class FavoritesController {
  constructor(private readonly service: FavoritesService) {}

  @Get()
  getSummary(@CurrentUser() user: JwtPayloadReturn) {
    return this.service.getSummary(user);
  }

  @Post('fields/:fieldId/toggle')
  toggleField(@Param('fieldId') fieldId: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.toggleField(user, fieldId);
  }

  @Post('venues/:venueId/toggle')
  toggleVenue(@Param('venueId') venueId: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.toggleVenue(user, venueId);
  }
}
