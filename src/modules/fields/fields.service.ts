import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { FieldsRepository } from './fields.repository';

@Injectable()
export class FieldsService {
  constructor(private readonly fieldsRepository: FieldsRepository) {}

  async findAll(user?: JwtPayloadReturn) {
    if (user?.role === 'admin') {
      return this.fieldsRepository.findAll();
    }

    if (user && (user.role === 'staff' || user.role === 'super_staff')) {
      const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }

      return this.fieldsRepository.findAll({ venueId: { in: ownedVenueIds } });
    }

    return this.fieldsRepository.findAll({ status: 'active' });
  }

  async findOne(id: string, user?: JwtPayloadReturn) {
    const field = await this.fieldsRepository.findById(id);

    if (!field) {
      throw new NotFoundException('Field không tồn tại');
    }

    if (!user || user.role === 'user') {
      if (field.status !== 'active') {
        throw new NotFoundException('Field không tồn tại');
      }
      return field;
    }

    if (user.role === 'admin') {
      return field;
    }

    const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
    if (ownedVenueIds.length === 0) {
      throw new ForbiddenException('Tài khoản chưa được gán sân');
    }
    if (!ownedVenueIds.includes(field.venueId)) {
      throw new ForbiddenException('Bạn chỉ được thao tác trên sân của mình');
    }

    return field;
  }

  async create(
    user: JwtPayloadReturn,
    name: string,
    price: number,
    sportId: string,
    venueId: string,
    description?: string,
    status?: string,
    images?: string[],
  ) {
    if (user.role === 'staff' || user.role === 'super_staff') {
      const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      if (!ownedVenueIds.includes(venueId)) {
        throw new ForbiddenException('Bạn chỉ được tạo field cho sân của mình');
      }
    }

    const sport = await this.fieldsRepository.findSportById(sportId);
    if (!sport) {
      throw new NotFoundException('Sport không tồn tại');
    }

    const venue = await this.fieldsRepository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    return this.fieldsRepository.create({
      name,
      price,
      sportId,
      venueId,
      description,
      status,
      images,
    });
  }

  async update(
    id: string,
    user: JwtPayloadReturn,
    data: {
      name?: string;
      description?: string;
      price?: number;
      status?: string;
      images?: string[];
      sportId?: string;
      venueId?: string;
    },
  ) {
    await this.findOne(id, user);

    if ((user.role === 'staff' || user.role === 'super_staff') && data.venueId) {
      const ownedVenueIds = await this.fieldsRepository.findOwnedVenueIds(user.id);
      if (ownedVenueIds.length === 0) {
        throw new ForbiddenException('Tài khoản chưa được gán sân');
      }
      if (!ownedVenueIds.includes(data.venueId)) {
        throw new ForbiddenException('Bạn không được chuyển field sang sân khác');
      }
    }

    if (data.sportId) {
      const sport = await this.fieldsRepository.findSportById(data.sportId);
      if (!sport) {
        throw new NotFoundException('Sport không tồn tại');
      }
    }

    if (data.venueId) {
      const venue = await this.fieldsRepository.findVenueById(data.venueId);
      if (!venue) {
        throw new NotFoundException('Venue không tồn tại');
      }
    }

    return this.fieldsRepository.update(id, data);
  }

  async remove(id: string, user: JwtPayloadReturn) {
    await this.findOne(id, user);
    return this.fieldsRepository.delete(id);
  }

  async getAvailability(id: string, date: string, user?: JwtPayloadReturn) {
    await this.findOne(id, user);

    const timeslots = await this.fieldsRepository.findTimeslots();

    const bookedBookings = await this.fieldsRepository.findBookedTimeslots(id, new Date(date));

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
}
