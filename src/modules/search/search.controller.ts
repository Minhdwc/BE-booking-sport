import { Controller, Get, Post, Query } from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { SearchService } from './search.service';
import {
  PopularSearchQueryDto,
  SearchSuggestionsQueryDto,
  SearchVenuesQueryDto,
} from './search.dto';

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Public()
  @Get('venues')
  searchVenues(@Query() query: SearchVenuesQueryDto) {
    return this.searchService.searchVenues(query);
  }

  @Public()
  @Get('popular')
  getPopular(@Query() query: PopularSearchQueryDto) {
    return this.searchService.getPopularSearches(query.limit);
  }

  @Public()
  @Get('suggestions')
  getSuggestions(@Query() query: SearchSuggestionsQueryDto) {
    return this.searchService.getSuggestions(query.q ?? '', query.limit);
  }

  @Get('recently-viewed')
  getRecentlyViewed(@CurrentUser() user: JwtPayloadReturn) {
    return this.searchService.getRecentlyViewed(user.id);
  }

  @Post('reindex')
  @Roles('admin')
  reindex() {
    return this.searchService.reindexAllVenues();
  }
}
