import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto, ReviewEligibilityQueryDto, UpdateReviewDto } from './reviews.dto';

@Controller('reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.reviewsService.findAll(query);
  }

  @Get('eligibility/check')
  checkEligibility(
    @Query() query: ReviewEligibilityQueryDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.reviewsService.getEligibility(user, query.fieldId);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.reviewsService.findOne(id);
  }

  @Post()
  create(@Body() createReviewDto: CreateReviewDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.reviewsService.create(
      user,
      createReviewDto.fieldId,
      createReviewDto.rating,
      createReviewDto.comment,
    );
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateReviewDto: UpdateReviewDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.reviewsService.update(id, user, {
      rating: updateReviewDto.rating,
      comment: updateReviewDto.comment,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.reviewsService.remove(id, user);
  }
}
