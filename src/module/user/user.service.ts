import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { db } from '../../db';
import { usersTable } from '../../db/schema';
import * as bcrypt from 'bcrypt';
import { eq } from 'drizzle-orm';
import { JwtProvider } from '../../providers/jwt.provider';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  RefreshTokenDto,
} from './user.dto';

@Injectable()
export class UserService {
  async createUser(values: CreateUserDto) {
    const checkUser = await db.select().from(usersTable).where(eq(usersTable.email, values.email));

    if (checkUser.length > 0) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    const hashedPass = await bcrypt.hash(values.password, 10);

    const [newUser] = await db
      .insert(usersTable)
      .values({
        ...values,
        password: hashedPass,
      })
      .returning();

    const { password, ...rest } = newUser;
    return {
      message: 'User created',
      data: rest,
    };
  }

  async getUsers() {
    const users = await db.select().from(usersTable);
    const usersWithoutPassword = users.map(({ password, ...rest }) => rest);
    return {
      message: 'Users fetched',
      data: usersWithoutPassword,
    };
  }

  async getUserById(id: string) {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id));

    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const { password, ...rest } = users[0];

    return {
      message: 'User fetched',
      data: rest,
    };
  }

  async updateUser(id: string, values: UpdateUserDto) {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id));

    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    let passwordToSave: string | undefined;
    if (values.password) {
      passwordToSave = await bcrypt.hash(values.password, 10);
    }

    const [updatedUser] = await db
      .update(usersTable)
      .set({
        ...values,
        ...(passwordToSave && { password: passwordToSave }),
        updatedAt: new Date(),
      } as any)
      .where(eq(usersTable.id, id))
      .returning();

    const { password, ...rest } = updatedUser;

    return {
      message: 'User updated',
      data: rest,
    };
  }

  async deleteUser(id: string) {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, id));

    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    await db.delete(usersTable).where(eq(usersTable.id, id));

    return {
      message: 'User deleted',
    };
  }

  async login(values: LoginDto) {
    try {
      const users = await db.select().from(usersTable).where(eq(usersTable.email, values.email));

      if (users.length === 0) {
        throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
      }

      const isMatch = await bcrypt.compare(values.password, users[0].password);
      if (!isMatch) {
        throw new HttpException('Invalid email or password', HttpStatus.UNAUTHORIZED);
      }
      const data = {
        id: users[0].id,
        email: users[0].email,
        username: users[0].username,
        role: users[0].role,
      };

      if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
        throw new HttpException(
          'Token secrets are not configured',
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }

      const accessToken = JwtProvider.generateToken(
        data,
        process.env.ACCESS_TOKEN_SECRET,
        process.env.ACCESS_TOKEN_LIFE || '1d',
      );

      const refreshToken = JwtProvider.generateRefreshToken(
        data,
        process.env.REFRESH_TOKEN_SECRET,
        process.env.REFRESH_TOKEN_LIFE || '7d',
      );

      return {
        message: 'Login successful',
        accessToken,
        refreshToken,
      };
    } catch (error: any) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(error.message, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  async refreshToken(values: RefreshTokenDto) {
    if (!process.env.ACCESS_TOKEN_SECRET || !process.env.REFRESH_TOKEN_SECRET) {
      throw new HttpException('Token secrets are not configured', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    const result = JwtProvider.refreshTokens(
      values.accessToken,
      values.refreshToken,
      process.env.ACCESS_TOKEN_SECRET,
      process.env.REFRESH_TOKEN_SECRET,
      process.env.ACCESS_TOKEN_LIFE || '1d',
    );

    if (!result) {
      throw new HttpException(
        'Refresh token expired or invalid. Please login again.',
        HttpStatus.UNAUTHORIZED,
      );
    }

    return {
      message: result.accessTokenRenewed ? 'Access token refreshed' : 'Token still valid',
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      accessTokenRenewed: result.accessTokenRenewed,
    };
  }

  async changePassword(userId: string, values: ChangePasswordDto) {
    const users = await db.select().from(usersTable).where(eq(usersTable.id, userId));

    if (users.length === 0) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    const isMatch = await bcrypt.compare(values.oldPassword, users[0].password);
    if (!isMatch) {
      throw new HttpException('Old password is incorrect', HttpStatus.UNAUTHORIZED);
    }

    const newHashedPassword = await bcrypt.hash(values.newPassword, 10);

    const [updatedUser] = await db
      .update(usersTable)
      .set({
        password: newHashedPassword,
        updatedAt: new Date(),
      } as any)
      .where(eq(usersTable.id, users[0].id))
      .returning();

    const { password, ...rest } = updatedUser;

    return {
      message: 'Password changed successfully',
      data: rest,
    };
  }

  async register(values: CreateUserDto) {
    const checkUser = await db.select().from(usersTable).where(eq(usersTable.email, values.email));

    if (checkUser.length > 0) {
      throw new HttpException('User already exists', HttpStatus.CONFLICT);
    }

    const hashPassword = await bcrypt.hash(values.password, 10);
    const data = {
      name: values.name,
      username: values.username,
      email: values.email,
      phone: values.phone,
      password: hashPassword,
      role: values.role,
      isActive: true,
    };

    const newUser = await db.insert(usersTable).values(data).returning();

    const { password, ...rest } = newUser[0];

    return {
      message: 'User registered successfully',
      data: rest,
    };
  }
}
