import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateSupportTicketDto, UpdateSupportTicketDto } from './support-tickets.dto';
import { SupportTicketsRepository } from './support-tickets.repository';

@Injectable()
export class SupportTicketsService {
  constructor(private readonly supportTicketsRepository: SupportTicketsRepository) {}

  async findAll(user: JwtPayloadReturn, query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    let where: Prisma.SupportTicketWhereInput | undefined;

    if (user.role === 'admin') {
      where = undefined;
    } else if (user.role === 'owner') {
      where = { creatorId: user.id };
    } else {
      where = { creatorId: user.id };
    }

    const [data, total] = await Promise.all([
      this.supportTicketsRepository.findAll(where, skip, limit),
      this.supportTicketsRepository.count(where),
    ]);

    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string, user: JwtPayloadReturn) {
    const ticket = await this.supportTicketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('SupportTicket không tồn tại');
    }

    if (user.role === 'admin') {
      return ticket;
    }

    if (ticket.creatorId !== user.id) {
      throw new ForbiddenException('Bạn chỉ được xem ticket của mình');
    }

    return ticket;
  }

  async create(user: JwtPayloadReturn, dto: CreateSupportTicketDto) {
    if (user.role === 'admin') {
      throw new ForbiddenException('Admin không tạo ticket qua endpoint này');
    }

    if (dto.bookingId) {
      const booking = await this.supportTicketsRepository.findBookingById(dto.bookingId);
      if (!booking) {
        throw new NotFoundException('Booking không tồn tại');
      }

      if (user.role === 'user' && booking.userId !== user.id) {
        throw new ForbiddenException('Bạn chỉ được liên kết booking của mình');
      }

      if (user.role === 'owner') {
        const ownedVenueIds = await this.supportTicketsRepository.findOwnedVenueIds(user.id);
        const hasAccess = booking.items.some((item) => ownedVenueIds.includes(item.venueId));
        if (!hasAccess) {
          throw new ForbiddenException('Bạn chỉ được liên kết booking thuộc sân của mình');
        }
      }
    }

    return this.supportTicketsRepository.create({
      creatorId: user.id,
      type: dto.type,
      description: dto.description,
      bookingId: dto.bookingId,
    });
  }

  async update(id: string, user: JwtPayloadReturn, dto: UpdateSupportTicketDto) {
    if (user.role !== 'admin') {
      throw new ForbiddenException('Chỉ admin được cập nhật ticket');
    }

    const ticket = await this.supportTicketsRepository.findById(id);
    if (!ticket) {
      throw new NotFoundException('SupportTicket không tồn tại');
    }

    if (!dto.status && dto.adminNote === undefined) {
      throw new BadRequestException('Cần cung cấp status hoặc adminNote');
    }

    return this.supportTicketsRepository.update(id, {
      status: dto.status,
      adminNote: dto.adminNote,
    });
  }
}
