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
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { FieldsService } from './fields.service';
import { CreateFieldDto, FieldAvailabilityQueryDto, UpdateFieldDto } from './fields.dto';

@Controller('fields')
export class FieldsController {
  constructor(private readonly fieldsService: FieldsService) {}

  @Public()
  @Get()
  findAll(@CurrentUser() user?: JwtPayloadReturn) {
    return this.fieldsService.findAll(user);
  }

  @Public()
  @Get(':id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query() query: FieldAvailabilityQueryDto,
    @CurrentUser() user?: JwtPayloadReturn,
  ) {
    return this.fieldsService.getAvailability(id, query.date, user);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: JwtPayloadReturn) {
    return this.fieldsService.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'super_staff')
  create(@Body() createFieldDto: CreateFieldDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.fieldsService.create(
      user,
      createFieldDto.name,
      createFieldDto.price,
      createFieldDto.sportId,
      createFieldDto.venueId,
      createFieldDto.description,
      createFieldDto.status,
      createFieldDto.images,
    );
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'super_staff')
  update(
    @Param('id') id: string,
    @Body() updateFieldDto: UpdateFieldDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.fieldsService.update(id, user, {
      name: updateFieldDto.name,
      description: updateFieldDto.description,
      price: updateFieldDto.price,
      status: updateFieldDto.status,
      images: updateFieldDto.images,
      sportId: updateFieldDto.sportId,
      venueId: updateFieldDto.venueId,
    });
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff', 'super_staff')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.fieldsService.remove(id, user);
  }
}
