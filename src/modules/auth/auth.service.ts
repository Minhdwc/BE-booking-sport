import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { JwtProvider } from '@/utils/jwt.util';
import { AuthRepository } from './auth.repository';

@Injectable()
export class AuthService {
  constructor(
    private readonly authRepository: AuthRepository,
    private readonly queueService: QueueService,
  ) {}

  async login(email: string, rawPassword: string) {
    const user = await this.authRepository.findByEmail(email);

    if (!user) {
      throw new UnauthorizedException('Không tìm thấy user của email đã nhập');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Tài khoản đã bị khóa');
    }

    const isValidPassword = await bcrypt.compare(rawPassword, user.password);
    if (!isValidPassword) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = JwtProvider.generateToken(
      tokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      process.env.ACCESS_TOKEN_LIFE!,
    );

    const refreshToken = JwtProvider.generateToken(
      tokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      process.env.REFRESH_TOKEN_LIFE!,
    );

    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  async register(
    name: string,
    username: string,
    email: string,
    phone: string,
    rawPassword: string,
  ) {
    const existingEmail = await this.authRepository.findByEmail(email);
    if (existingEmail) {
      throw new ConflictException('Email đã tồn tại');
    }

    const existingPhone = await this.authRepository.findByPhone(phone);
    if (existingPhone) {
      throw new ConflictException('Số điện thoại đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await this.authRepository.createUser({
      name,
      username,
      email,
      phone,
      role: 'user',
      password: hashedPassword,
    });

    await this.queueService.sendWelcomeEmail(user.email, user.name);

    const tokenPayload = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = JwtProvider.generateToken(
      tokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      process.env.ACCESS_TOKEN_LIFE!,
    );

    const refreshToken = JwtProvider.generateToken(
      tokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      process.env.REFRESH_TOKEN_LIFE!,
    );

    const { password, ...userWithoutPassword } = user;

    return { user: userWithoutPassword, accessToken, refreshToken };
  }

  refresh(refreshToken: string) {
    if (!refreshToken?.trim()) {
      throw new UnauthorizedException('Refresh token không tồn tại');
    }

    const payload = JwtProvider.verifyToken(refreshToken, process.env.REFRESH_TOKEN_SECRET!);
    if (!payload) {
      throw new UnauthorizedException('Refresh token không hợp lệ hoặc đã hết hạn');
    }

    const tokenPayload = {
      id: payload.id,
      email: payload.email,
      role: payload.role,
    };

    const accessToken = JwtProvider.generateToken(
      tokenPayload,
      process.env.ACCESS_TOKEN_SECRET!,
      process.env.ACCESS_TOKEN_LIFE!,
    );

    const newRefreshToken = JwtProvider.generateToken(
      tokenPayload,
      process.env.REFRESH_TOKEN_SECRET!,
      process.env.REFRESH_TOKEN_LIFE!,
    );

    return { accessToken, refreshToken: newRefreshToken };
  }
}
