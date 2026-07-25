import { Injectable } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';

@Injectable()
export class AuthRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByPhone(phone: string) {
    return this.prisma.user.findUnique({ where: { phone } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByVerifyToken(verifyToken: string) {
    return this.prisma.user.findFirst({ where: { verifyToken } });
  }

  updateVerifyToken(userId: string, verifyToken: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { verifyToken },
    });
  }

  markEmailVerified(userId: string) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true, verifyToken: null },
    });
  }

  createUser(data: {
    name: string;
    username: string;
    email: string;
    phone: string;
    role: string;
    password: string;
  }) {
    return this.prisma.user.create({ data });
  }
}
