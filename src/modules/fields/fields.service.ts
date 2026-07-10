import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateFieldDto, UpdateFieldDto } from './fields.dto';

@Injectable()
export class FieldsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(user?: JwtPayloadReturn) {
    // admin xem tất cả field
    if (user?.role === 'admin') {
      return this.prisma.field.findMany({
        include: { sport: true, venue: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // staff chỉ xem field của sân mình
    if (user && (user.role === 'staff' || user.role === 'super_staff')) {
      const venueId = await this.getVenueIdOfStaff(user);

      return this.prisma.field.findMany({
        where: { venueId },
        include: { sport: true, venue: true },
        orderBy: { createdAt: 'desc' },
      });
    }

    // khách và user thường chỉ thấy field đang hoạt động
    return this.prisma.field.findMany({
      where: { status: 'active' },
      include: { sport: true, venue: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, user?: JwtPayloadReturn) {
    const field = await this.prisma.field.findUnique({
      where: { id },
      include: { sport: true, venue: true },
    });

    if (!field) {
      throw new NotFoundException('Field không tồn tại');
    }

    // khách và user thường không được xem field đã ẩn
    if (!user || user.role === 'user') {
      if (field.status !== 'active') {
        throw new NotFoundException('Field không tồn tại');
      }
      return field;
    }

    if (user.role === 'admin') {
      return field;
    }

    const venueId = await this.getVenueIdOfStaff(user);
    if (field.venueId !== venueId) {
      throw new ForbiddenException('Bạn chỉ được thao tác trên sân của mình');
    }

    return field;
  }

  async create(createFieldDto: CreateFieldDto, user: JwtPayloadReturn) {
    if (user.role === 'staff' || user.role === 'super_staff') {
      const venueId = await this.getVenueIdOfStaff(user);
      if (createFieldDto.venueId !== venueId) {
        throw new ForbiddenException('Bạn chỉ được tạo field cho sân của mình');
      }
    }

    await this.ensureRelations(createFieldDto.sportId, createFieldDto.venueId);

    return this.prisma.field.create({
      data: createFieldDto,
      include: { sport: true, venue: true },
    });
  }

  async update(id: string, updateFieldDto: UpdateFieldDto, user: JwtPayloadReturn) {
    await this.findOne(id, user);

    // staff không được chuyển field sang venue khác
    if ((user.role === 'staff' || user.role === 'super_staff') && updateFieldDto.venueId) {
      const venueId = await this.getVenueIdOfStaff(user);
      if (updateFieldDto.venueId !== venueId) {
        throw new ForbiddenException('Bạn không được chuyển field sang sân khác');
      }
    }

    await this.ensureRelations(updateFieldDto.sportId, updateFieldDto.venueId);

    return this.prisma.field.update({
      where: { id },
      data: updateFieldDto,
      include: { sport: true, venue: true },
    });
  }

  async remove(id: string, user: JwtPayloadReturn) {
    await this.findOne(id, user);
    return this.prisma.field.delete({ where: { id } });
  }

  async getAvailability(id: string, date: string, user?: JwtPayloadReturn) {
    await this.findOne(id, user);

    const timeslots = await this.prisma.timeslot.findMany({
      orderBy: { startTime: 'asc' },
    });

    const bookedBookings = await this.prisma.booking.findMany({
      where: {
        fieldId: id,
        date: new Date(date),
        status: { notIn: ['cancelled'] },
      },
      select: { timeslotId: true },
    });

    const bookedTimeslotIds = new Set(bookedBookings.map((booking) => booking.timeslotId));

    return {
      fieldId: id,
      date,
      timeslots: timeslots.map((timeslot) => ({
        id: timeslot.id,
        startTime: timeslot.startTime,
        endTime: timeslot.endTime,
        status: bookedTimeslotIds.has(timeslot.id) ? 'booked' : 'available',
      })),
    };
  }

  private async getVenueIdOfStaff(user: JwtPayloadReturn): Promise<string> {
    const currentUser = await this.prisma.user.findUnique({
      where: { id: user.id },
      select: { venueId: true },
    });

    if (!currentUser?.venueId) {
      throw new ForbiddenException('Tài khoản chưa được gán sân');
    }

    return currentUser.venueId;
  }

  private async ensureRelations(sportId?: string, venueId?: string) {
    if (sportId) {
      const sport = await this.prisma.sport.findUnique({ where: { id: sportId } });
      if (!sport) {
        throw new NotFoundException('Sport không tồn tại');
      }
    }

    if (venueId) {
      const venue = await this.prisma.venue.findUnique({ where: { id: venueId } });
      if (!venue) {
        throw new NotFoundException('Venue không tồn tại');
      }
    }
  }
}
