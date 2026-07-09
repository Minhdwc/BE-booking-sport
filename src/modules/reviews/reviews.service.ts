import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateReviewDto, UpdateReviewDto } from './reviews.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.review.findMany({
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const review = await this.prisma.review.findUnique({
      where: { id },
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
      },
    });

    if (!review) {
      throw new NotFoundException('Review không tồn tại');
    }

    return review;
  }

  async create(createReviewDto: CreateReviewDto, user: JwtPayloadReturn) {
    // user chỉ được đánh giá dưới tên mình
    if (user.role === 'user' && createReviewDto.userId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được đánh giá dưới tên của mình');
    }
    if (createReviewDto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: createReviewDto.userId } });
      if (!user) {
        throw new NotFoundException('User không tồn tại');
      }
    }
    if (createReviewDto.fieldId) {
      const field = await this.prisma.field.findUnique({ where: { id: createReviewDto.fieldId } });
      if (!field) {
        throw new NotFoundException('Field không tồn tại');
      }
    }

    return this.prisma.review.create({
      data: createReviewDto,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
      },
    });
  }

  async update(id: string, updateReviewDto: UpdateReviewDto, user: JwtPayloadReturn) {
    const review = await this.findOne(id);
    this.checkCanModifyReview(review.userId, user);

    if (updateReviewDto.userId) {
      const user = await this.prisma.user.findUnique({ where: { id: updateReviewDto.userId } });
      if (!user) {
        throw new NotFoundException('User không tồn tại');
      }
    }
    if (updateReviewDto.fieldId) {
      const field = await this.prisma.field.findUnique({ where: { id: updateReviewDto.fieldId } });
      if (!field) {
        throw new NotFoundException('Field không tồn tại');
      }
    }

    return this.prisma.review.update({
      where: { id },
      data: updateReviewDto,
      include: {
        user: {
          select: { id: true, name: true, email: true, phone: true },
        },
        field: {
          include: { sport: true, venue: true },
        },
      },
    });
  }

  async remove(id: string, user: JwtPayloadReturn) {
    const review = await this.findOne(id);
    this.checkCanModifyReview(review.userId, user);

    return this.prisma.review.delete({ where: { id } });
  }

  private checkCanModifyReview(ownerId: string, user: JwtPayloadReturn) {
    if (user.role === 'admin') {
      return;
    }

    if (ownerId !== user.id) {
      throw new ForbiddenException('Bạn không có quyền sửa review này');
    }
  }
}
