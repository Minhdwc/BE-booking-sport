import { Controller, Get, Post, Put, Delete, Body, Param, Req, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import {
  CreateUserDto,
  UpdateUserDto,
  LoginDto,
  ChangePasswordDto,
  RefreshTokenDto,
} from './user.dto';
import { AuthGuard } from '../../guards/auth.guard';
import { RolesGuard } from '../../guards/roles.guard';

@Controller('users')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Get()
  @UseGuards(AuthGuard)
  getUsers() {
    return this.userService.getUsers();
  }

  @Get(':id')
  @UseGuards(AuthGuard)
  getUserById(@Param('id') id: string) {
    return this.userService.getUserById(id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  updateUser(@Param('id') id: string, @Body() body: UpdateUserDto) {
    return this.userService.updateUser(id, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  deleteUser(@Param('id') id: string) {
    return this.userService.deleteUser(id);
  }
}

@Controller('auth')
export class AuthController {
  constructor(private readonly userService: UserService) {}

  @Post('register')
  register(@Body() body: CreateUserDto) {
    return this.userService.createUser(body);
  }

  @Post('login')
  login(@Body() body: LoginDto) {
    return this.userService.login(body);
  }

  @Post('refresh')
  refresh(@Body() body: RefreshTokenDto) {
    return this.userService.refreshToken(body);
  }

  @Post('change-password')
  @UseGuards(AuthGuard)
  changePassword(@Req() request: { user: { id: string } }, @Body() body: ChangePasswordDto) {
    return this.userService.changePassword(request.user.id, body);
  }
}
