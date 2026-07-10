import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '@/database/prisma.service';
import { QueueService } from '@/infrastructure/queue/queue.service';
import { JwtProvider } from '@/utils/jwt.util';
import { LoginDto, RegisterDto } from './auth.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queueService: QueueService,
  ) {}

  async login(loginDto: LoginDto) {
    const { email, password: rawPassword } = loginDto;
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
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

  async register(registerDto: RegisterDto) {
    const { name, username, email, phone, password: rawPassword } = registerDto;

    const existingEmail = await this.prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      throw new ConflictException('Email đã tồn tại');
    }

    const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
    if (existingPhone) {
      throw new ConflictException('Số điện thoại đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(rawPassword, 10);

    const user = await this.prisma.user.create({
      data: { name, username, email, phone, role: 'user', password: hashedPassword },
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
