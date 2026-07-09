import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '@/database/prisma.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map(({ password, ...user }) => user);
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async create(createUserDto: CreateUserDto) {
    await this.ensureUniqueFields(createUserDto.email, createUserDto.phone, createUserDto.username);

    const hashedPassword = await bcrypt.hash(createUserDto.password, 10);
    const user = await this.prisma.user.create({
      data: {
        ...createUserDto,
        password: hashedPassword,
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const currentUser = await this.prisma.user.findUnique({ where: { id } });
    if (!currentUser) {
      throw new NotFoundException('User không tồn tại');
    }

    await this.ensureUniqueFields(
      updateUserDto.email,
      updateUserDto.phone,
      updateUserDto.username,
      id,
    );

    const user = await this.prisma.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        ...(updateUserDto.password && {
          password: await bcrypt.hash(updateUserDto.password, 10),
        }),
      },
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: string) {
    await this.findOne(id);
    const user = await this.prisma.user.delete({ where: { id } });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private async ensureUniqueFields(
    email?: string,
    phone?: string,
    username?: string,
    excludeId?: string,
  ) {
    if (email) {
      const existingEmail = await this.prisma.user.findUnique({ where: { email } });
      if (existingEmail && existingEmail.id !== excludeId) {
        throw new ConflictException('Email đã tồn tại');
      }
    }

    if (phone) {
      const existingPhone = await this.prisma.user.findUnique({ where: { phone } });
      if (existingPhone && existingPhone.id !== excludeId) {
        throw new ConflictException('Số điện thoại đã tồn tại');
      }
    }

    if (username) {
      const existingUsername = await this.prisma.user.findFirst({ where: { username } });
      if (existingUsername && existingUsername.id !== excludeId) {
        throw new ConflictException('Username đã tồn tại');
      }
    }
  }
}
