import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { AccountRepository } from './account.repository';

@Injectable()
export class AccountService {
  constructor(private readonly accountRepository: AccountRepository) {}

  async getMe(userId: string) {
    if (!userId) {
      throw new UnauthorizedException('Token không tồn tại hoặc không hợp lệ');
    }

    const user = await this.accountRepository.findById(userId);
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

  async updateProfile(
    userId: string,
    data: {
      name?: string;
      username?: string;
      phone?: string;
      avatarUrl?: string;
    },
  ) {
    if (data.phone) {
      const existingPhone = await this.accountRepository.findByPhone(data.phone);
      if (existingPhone && existingPhone.id !== userId) {
        throw new ConflictException('Số điện thoại đã tồn tại');
      }
    }

    const user = await this.accountRepository.update(userId, data);

    const { password, ...userWithoutPassword } = user;

    const permissionsByRole: Record<string, string[]> = {
      admin: [
        'users:read',
        'users:write',
        'venues:read',
        'venues:write',
        'fields:read',
        'fields:write',
        'bookings:read',
        'bookings:write',
        'payments:read',
        'payments:write',
        'reviews:read',
        'reviews:write',
        'sports:write',
      ],
      staff: [
        'venues:read',
        'fields:read',
        'fields:write',
        'bookings:read',
        'bookings:write',
        'payments:read',
        'reviews:read',
      ],
      user: ['bookings:own', 'payments:own', 'reviews:own'],
    };

    return {
      ...userWithoutPassword,
      permissions: permissionsByRole[user.role] || [],
    };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    const user = await this.accountRepository.findById(userId);
    if (!user) {
      throw new NotFoundException('Tài khoản không tồn tại');
    }

    const isValidPassword = await bcrypt.compare(currentPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Mật khẩu hiện tại không đúng');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.accountRepository.update(userId, { password: hashedPassword });

    return { success: true };
  }
}
