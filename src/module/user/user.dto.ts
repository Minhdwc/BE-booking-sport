import { IsString, IsEmail, IsBoolean, MinLength, IsIn, IsOptional } from 'class-validator';

export class CreateUserDto {
  @IsString()
  name!: string;

  @IsString()
  username!: string;

  @IsEmail()
  email!: string;

  @IsString()
  phone!: string;

  @IsString()
  @MinLength(8)
  password!: string;

  @IsString()
  @IsIn(['admin', 'user', 'staff'])
  role!: 'admin' | 'user' | 'staff';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(8)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  @IsIn(['admin', 'user', 'staff'])
  role?: 'admin' | 'user' | 'staff';

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(8)
  password!: string;
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(8)
  oldPassword!: string;

  @IsString()
  @MinLength(8)
  newPassword!: string;
}

export class RefreshTokenDto {
  @IsString()
  accessToken!: string;

  @IsString()
  refreshToken!: string;
}
