import { Body, Controller, Delete, Get, Param, Post, Put, UseGuards } from '@nestjs/common';
import { AuthGuard } from '../../guards/auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { CreateReviewDto, UpdateReviewDto } from './review.dto';
import { ReviewService } from './review.service';

@Controller('reviews')
export class ReviewController {
  constructor(private readonly reviewService: ReviewService) {}

  @Get()
  getReviews() {
    return this.reviewService.getReviews();
  }

  @Get(':id')
  getReviewById(@Param('id') id: string) {
    return this.reviewService.getReviewById(id);
  }

  @Post()
  @UseGuards(AuthGuard)
  createReview(@Body() body: CreateReviewDto) {
    return this.reviewService.createReview(body);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  updateReview(@Param('id') id: string, @Body() body: UpdateReviewDto) {
    return this.reviewService.updateReview(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  deleteReview(@Param('id') id: string) {
    return this.reviewService.deleteReview(id);
  }
}
