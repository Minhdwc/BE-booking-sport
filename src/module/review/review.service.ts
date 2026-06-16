import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { db } from '../../db';
import { reviewsTable } from '../../db/schema';
import { CreateReviewDto, UpdateReviewDto } from './review.dto';

@Injectable()
export class ReviewService {
  async getReviews() {
    const reviews = await db.select().from(reviewsTable);
    return { message: 'Reviews fetched', data: reviews };
  }

  async getReviewById(id: string) {
    const reviews = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
    if (reviews.length === 0) {
      throw new HttpException('Review not found', HttpStatus.NOT_FOUND);
    }
    return { message: 'Review fetched', data: reviews[0] };
  }

  async createReview(values: CreateReviewDto) {
    const [review] = await db.insert(reviewsTable).values(values).returning();
    return { message: 'Review created', data: review };
  }

  async updateReview(id: string, values: UpdateReviewDto) {
    await this.getReviewById(id);
    const [review] = await db
      .update(reviewsTable)
      .set(values)
      .where(eq(reviewsTable.id, id))
      .returning();
    return { message: 'Review updated', data: review };
  }

  async deleteReview(id: string) {
    await this.getReviewById(id);
    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
    return { message: 'Review deleted' };
  }
}
