import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { ReviewsRepository } from './reviews.repository';

@Injectable()
export class ReviewsService {
  constructor(private readonly reviewsRepository: ReviewsRepository) {}

  async findAll(query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const [data, total] = await Promise.all([
      this.reviewsRepository.findAll(undefined, skip, limit),
      this.reviewsRepository.count(),
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

  async getEligibility(user: JwtPayloadReturn, fieldId: string) {
    const field = await this.reviewsRepository.findFieldById(fieldId);
    if (!field) {
      throw new NotFoundException('Field không tồn tại');
    }

    const existingReview = await this.reviewsRepository.findByUserAndField(user.id, fieldId);
    if (existingReview) {
      return {
        canReview: false,
        reason: 'already_reviewed' as const,
        message: 'Bạn đã đánh giá sân này rồi',
      };
    }

    const confirmedBooking = await this.reviewsRepository.hasConfirmedBooking(user.id, fieldId);
    if (!confirmedBooking) {
      return {
        canReview: false,
        reason: 'no_confirmed_booking' as const,
        message:
          'Bạn cần có ít nhất một lần đặt sân đã xác nhận tại sân này trước khi viết đánh giá',
      };
    }

    return {
      canReview: true,
      reason: null,
      message: null,
    };
  }

  async create(user: JwtPayloadReturn, fieldId: string, rating: number, comment?: string) {
    const eligibility = await this.getEligibility(user, fieldId);
    if (!eligibility.canReview) {
      throw new BadRequestException(eligibility.message ?? 'Bạn không thể đánh giá sân này');
    }

    return this.reviewsRepository.create({
      userId: user.id,
      fieldId,
      rating,
      comment,
    });
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

    return this.reviewsRepository.update(id, data);
  }

  async remove(id: string, user: JwtPayloadReturn) {
    const review = await this.findOne(id);

    const canModerate =
      user.role === 'admin' || user.role === 'staff' || review.userId === user.id;

    if (!canModerate) {
      throw new ForbiddenException('Bạn không có quyền xóa review này');
    }

    return this.reviewsRepository.delete(id);
  }
}
