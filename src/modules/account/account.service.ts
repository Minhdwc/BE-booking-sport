import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/database/prisma.service';
import { ChangePasswordDto, UpdateProfileDto } from './account.dto';

@Injectable()
export class AccountService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Token không tồn tại hoặc không hợp lệ');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException('Tài khoản không tồn tại hoặc không hợp lệ');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const { password, ...userWithoutPassword } = user;

    return {
      ...userWithoutPassword,
    };
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    if (updateProfileDto.phone) {
      const existingPhone = await this.prisma.user.findUnique({
        where: { phone: updateProfileDto.phone },
      });
      if (existingPhone && existingPhone.id !== userId) {
        throw new ConflictException('Số điện thoại đã tồn tại');
      }
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: updateProfileDto,
    });

    const { password, ...userWithoutPassword } = user;

    const permissionsByRole: Record<string, string[]> = {
      admin: [
        'users:read',
        'users:write',
        'venues:read',
        'venues:write',
        'fields:read',
        'fields:write',
        'timeslots:read',
        'timeslots:write',
        'bookings:read',
        'bookings:write',
        'payments:read',
        'payments:write',
        'reviews:read',
        'reviews:write',
        'sports:write',
      ],
      super_staff: [
        'users:read',
        'venues:read',
        'venues:write',
        'fields:read',
        'fields:write',
        'timeslots:read',
        'timeslots:write',
        'bookings:read',
        'bookings:write',
        'payments:read',
        'reviews:read',
      ],
      staff: [
        'venues:read',
        'fields:read',
        'fields:write',
        'timeslots:read',
        'timeslots:write',
        'bookings:read',
        'bookings:write',
        'payments:read',
        'reviews:read',
      ],
      user: ['bookings:own', 'payments:own', 'reviews:own'],
    };

    return {
      ...userWithoutPassword,
      permissions: permissionsByRole[user.role] ?? [],
    };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const isValidPassword = await bcrypt.compare(changePasswordDto.currentPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });

    return { success: true };
  }
}
