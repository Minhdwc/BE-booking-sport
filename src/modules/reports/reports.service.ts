import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { DashboardService } from '@/modules/dashboard/dashboard.service';
import { ReportsRepository } from './reports.repository';

@Injectable()
export class ReportsService {
  constructor(
    private readonly dashboardService: DashboardService,
    private readonly reportsRepository: ReportsRepository,
  ) {}

  async getSummary(user: JwtPayloadReturn, from?: string, to?: string) {
    return this.dashboardService.getSummary(user, from, to);
  }

  async assertVenueAccess(user: JwtPayloadReturn, venueId: string) {
    const venue = await this.reportsRepository.findVenueById(venueId);
    if (!venue) {
      throw new NotFoundException('Venue không tồn tại');
    }

    if (user.role === 'admin') {
      return venue;
    }

    if (user.role === 'staff') {
      const ownership = await this.reportsRepository.findVenueOwnership(user.id, venueId);
      if (!ownership) {
        throw new ForbiddenException('Bạn không có quyền truy cập sân vận động này');
      }
      return venue;
    }

    throw new ForbiddenException('Bạn không có quyền truy cập sân vận động này');
  }
}
