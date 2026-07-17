import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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

  async create(user: JwtPayloadReturn, fieldId: string, rating: number, comment?: string) {
    const field = await this.reviewsRepository.findFieldById(fieldId);
    if (!field) {
      throw new NotFoundException('Field không tồn tại');
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
