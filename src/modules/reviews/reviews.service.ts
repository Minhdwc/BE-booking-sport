import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPagination, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { ReviewsRepository } from './reviews.repository';
import { QueueService } from '@/infrastructure/queue/queue.service';

import { ReviewListQueryDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(
    private readonly reviewsRepository: ReviewsRepository,
    private readonly queueService: QueueService,
  ) {}

  async findAll(query: ReviewListQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where = query.venueId ? { venueId: query.venueId } : undefined;
    const [data, total] = await Promise.all([
      this.reviewsRepository.findAll(where, skip, limit),
      this.reviewsRepository.count(where),
    ]);
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const review = await this.reviewsRepository.findById(id);

    if (!review) {
      throw new NotFoundException('Review không tồn tại');
    }

    return review;
  }

  async getEligibility(user: JwtPayloadReturn, venueId: string) {
    const venue = await this.reviewsRepository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Cơ sở không tồn tại');
    }

    const existingReview = await this.reviewsRepository.findByUserAndVenue(user.id, venueId);
    if (existingReview) {
      return {
        canReview: false,
        reason: 'already_reviewed' as const,
        message: 'Bạn đã đánh giá cơ sở này rồi',
      };
    }

    const confirmedBooking = await this.reviewsRepository.hasConfirmedBooking(user.id, venueId);
    if (!confirmedBooking) {
      return {
        canReview: false,
        reason: 'no_confirmed_booking' as const,
        message:
          'Bạn cần có ít nhất một lần đặt sân đã xác nhận tại cơ sở này trước khi viết đánh giá',
      };
    }

    return {
      canReview: true,
      reason: null,
      message: null,
    };
  }

  async create(user: JwtPayloadReturn, venueId: string, rating: number, comment?: string) {
    const eligibility = await this.getEligibility(user, venueId);
    if (!eligibility.canReview) {
      throw new BadRequestException(eligibility.message ?? 'Bạn không thể đánh giá cơ sở này');
    }

    const review = await this.reviewsRepository.create({
      userId: user.id,
      venueId,
      rating,
      comment,
    });

    await this.queueService.recordReviewChanged(venueId);
    return review;
  }

  async update(
    id: string,
    user: JwtPayloadReturn,
    data: {
      rating?: number;
      comment?: string;
    },
  ) {
    const review = await this.findOne(id);

    if (user.role !== 'admin' && review.userId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền sửa review này');
    }

    const updated = await this.reviewsRepository.update(id, data);
    await this.queueService.recordReviewChanged(review.venueId);
    return updated;
  }

  async remove(id: string, user: JwtPayloadReturn) {
    const review = await this.findOne(id);

    const canModerate =
      user.role === 'admin' || user.role === 'staff' || review.userId === user.id;

    if (!canModerate) {
      throw new ForbiddenException('Bạn không có quyền xóa review này');
    }

    const deleted = await this.reviewsRepository.delete(id);
    await this.queueService.recordReviewChanged(review.venueId);
    return deleted;
  }
}
