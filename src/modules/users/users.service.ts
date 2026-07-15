import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { getPagination, PaginationQueryDto, toPaginatedResult } from '@/common/dto/pagination.dto';
import { UsersRepository } from './users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async findAll(query: PaginationQueryDto = {}) {
    const { page, limit, skip } = getPagination(query);
    const where: Prisma.UserWhereInput = {};
    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { username: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [users, total] = await Promise.all([
      this.usersRepository.findAll(where, skip, limit),
      this.usersRepository.count(where),
    ]);

    const data = users.map(({ password, ...user }) => user);
    return toPaginatedResult(data, total, page, limit);
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findById(id);
    if (!user) {
      throw new NotFoundException('User không tồn tại');
    }
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async create(data: {
    name: string;
    username: string;
    email: string;
    phone: string;
    password: string;
    role?: string;
    isActive?: boolean;
    avatarUrl?: string;
  }) {
    const existingEmail = await this.usersRepository.findByEmail(data.email);
    if (existingEmail) {
      throw new ConflictException('Email đã tồn tại');
    }

    const existingPhone = await this.usersRepository.findByPhone(data.phone);
    if (existingPhone) {
      throw new ConflictException('Số điện thoại đã tồn tại');
    }

    const existingUsername = await this.usersRepository.findByUsername(data.username);
    if (existingUsername) {
      throw new ConflictException('Username đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.usersRepository.create({
      name: data.name,
      username: data.username,
      email: data.email,
      phone: data.phone,
      password: hashedPassword,
      role: data.role,
      isActive: data.isActive,
      avatarUrl: data.avatarUrl,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async update(
    id: string,
    data: {
      name?: string;
      username?: string;
      email?: string;
      phone?: string;
      password?: string;
      role?: string;
      isActive?: boolean;
      avatarUrl?: string;
    },
  ) {
    const currentUser = await this.usersRepository.findById(id);
    if (!currentUser) {
      throw new NotFoundException('User không tồn tại');
    }

    if (data.email) {
      const existingEmail = await this.usersRepository.findByEmail(data.email);
      if (existingEmail && existingEmail.id !== id) {
        throw new ConflictException('Email đã tồn tại');
      }
    }

    if (data.phone) {
      const existingPhone = await this.usersRepository.findByPhone(data.phone);
      if (existingPhone && existingPhone.id !== id) {
        throw new ConflictException('Số điện thoại đã tồn tại');
      }
    }

    if (data.username) {
      const existingUsername = await this.usersRepository.findByUsername(data.username);
      if (existingUsername && existingUsername.id !== id) {
        throw new ConflictException('Username đã tồn tại');
      }
    }

    const user = await this.usersRepository.update(id, {
      name: data.name,
      username: data.username,
      email: data.email,
      phone: data.phone,
      role: data.role,
      isActive: data.isActive,
      avatarUrl: data.avatarUrl,
      ...(data.password && {
        password: await bcrypt.hash(data.password, 10),
      }),
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async remove(id: string) {
    await this.findOne(id);
    const user = await this.usersRepository.delete(id);
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }
}
