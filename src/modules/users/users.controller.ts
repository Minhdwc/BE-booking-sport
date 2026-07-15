import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '@/common/decorators/roles.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { RolesGuard } from '@/common/guards';
import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto } from './users.dto';

@Controller('users')
@UseGuards(RolesGuard)
@Roles('admin')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  findAll(@Query() query: PaginationQueryDto) {
    return this.usersService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.usersService.findOne(id);
  }

  @Post()
  create(@Body() createUserDto: CreateUserDto) {
    return this.usersService.create({
      name: createUserDto.name,
      username: createUserDto.username,
      email: createUserDto.email,
      phone: createUserDto.phone,
      password: createUserDto.password,
      role: createUserDto.role,
      isActive: createUserDto.isActive,
      avatarUrl: createUserDto.avatarUrl,
    });
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.usersService.update(id, {
      name: updateUserDto.name,
      username: updateUserDto.username,
      email: updateUserDto.email,
      phone: updateUserDto.phone,
      password: updateUserDto.password,
      role: updateUserDto.role,
      isActive: updateUserDto.isActive,
      avatarUrl: updateUserDto.avatarUrl,
    });
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.usersService.remove(id);
  }
}
