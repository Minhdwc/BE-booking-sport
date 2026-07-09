import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '@/database/prisma.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateVenueDto, UpdateVenueDto } from './venues.dto';

@Injectable()
export class VenuesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    query: { search?: string; page?: string; limit?: string },
    user?: JwtPayloadReturn,
  ) {
    const limit = Number(query.limit) || 10;
    const page = Number(query.page) || 1;

    const where: Prisma.VenueWhereInput = {};

    // staff chỉ thấy venue mình được gán
    if (user && (user.role === 'staff' || user.role === 'super_staff')) {
      where.users = { some: { id: user.id } };
    }

    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { location: { contains: query.search, mode: 'insensitive' } },
        { fields: { some: { name: { contains: query.search, mode: 'insensitive' } } } },
      ];
    }

    return this.prisma.venue.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        fields: {
          where: { status: 'active' },
          include: { sport: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const venue = await this.prisma.venue.findUnique({
      where: { id },
      include: {
        fields: {
          where: { status: 'active' },
          include: { sport: true },
        },
      },
    });

    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    return venue;
  }

  create(createVenueDto: CreateVenueDto) {
    return this.prisma.venue.create({ data: createVenueDto });
  }

  async update(id: string, updateVenueDto: UpdateVenueDto, user: JwtPayloadReturn) {
    await this.checkCanManageVenue(id, user);

    return this.prisma.venue.update({
      where: { id },
      data: updateVenueDto,
    });
  }

  async remove(id: string, user: JwtPayloadReturn) {
    await this.checkCanManageVenue(id, user);
    return this.prisma.venue.delete({ where: { id } });
  }

  private async checkCanManageVenue(venueId: string, user: JwtPayloadReturn) {
    if (user.role === 'admin') {
      return;
    }

    if (user.role === 'staff' || user.role === 'super_staff') {
      const venue = await this.prisma.venue.findFirst({
        where: { id: venueId, users: { some: { id: user.id } } },
      });

      if (!venue) {
        throw new ForbiddenException('Bạn không có quyền quản lý venue này');
      }
      return;
    }

    throw new ForbiddenException('Bạn không có quyền quản lý venue');
  }
}
