import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { OperatingHourItemDto } from './operating-hours.dto';
import { OperatingHoursRepository } from './operating-hours.repository';

@Injectable()
export class OperatingHoursService {
  constructor(private readonly operatingHoursRepository: OperatingHoursRepository) {}

  async findByVenueId(venueId: string) {
    const venue = await this.operatingHoursRepository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    return this.operatingHoursRepository.findByVenueId(venueId);
  }

  async replaceAll(venueId: string, user: JwtPayloadReturn, hours: OperatingHourItemDto[]) {
    const venue = await this.operatingHoursRepository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Cơ sở không tồn tại');
    }

    if (user.role === 'owner') {
      const ownedVenueIds = await this.operatingHoursRepository.findOwnedVenueIds(user.id);
      if (!ownedVenueIds.includes(venueId)) {
        throw new ForbiddenException('Bạn chỉ được quản lý sân của mình');
      }
    } else if (user.role !== 'admin') {
      throw new ForbiddenException('Bạn không có quyền quản lý giờ hoạt động');
    }

    const days = hours.map((hour) => hour.dayOfWeek);
    if (new Set(days).size !== days.length) {
      throw new BadRequestException('dayOfWeek không được trùng lặp');
    }

    for (const hour of hours) {
      const open = this.parseTimeToMinutes(hour.openTime);
      const close = this.parseTimeToMinutes(hour.closeTime);
      if (close <= open) {
        throw new BadRequestException(
          `Giờ đóng cửa phải sau giờ mở cửa (dayOfWeek=${hour.dayOfWeek})`,
        );
      }
    }

    return this.operatingHoursRepository.replaceAll(venueId, hours);
  }

  private parseTimeToMinutes(time: string) {
    const normalized = time.trim().slice(0, 5);
    const [hours, minutes] = normalized.split(':').map(Number);
    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      throw new BadRequestException(`Thời gian không hợp lệ: ${time}`);
    }
    return hours * 60 + minutes;
  }
}
