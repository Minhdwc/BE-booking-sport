import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { CreateSupportTicketDto, UpdateSupportTicketDto } from './support-tickets.dto';
import { SupportTicketsService } from './support-tickets.service';

@Controller('support-tickets')
export class SupportTicketsController {
  constructor(private readonly supportTicketsService: SupportTicketsService) {}

  @Get()
  findAll(@CurrentUser() user: JwtPayloadReturn, @Query() query: PaginationQueryDto) {
    return this.supportTicketsService.findAll(user, query);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('user', 'owner')
  create(@CurrentUser() user: JwtPayloadReturn, @Body() dto: CreateSupportTicketDto) {
    return this.supportTicketsService.create(user, dto);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.supportTicketsService.findOne(id, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin')
  update(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayloadReturn,
    @Body() dto: UpdateSupportTicketDto,
  ) {
    return this.supportTicketsService.update(id, user, dto);
  }
}
