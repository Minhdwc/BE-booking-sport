import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
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
  @Roles('admin', 'staff')
  create(@Body() createFieldDto: CreateFieldDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.fieldsService.create(user, createFieldDto);
  }

  @Post(':id/images')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadImage(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.fieldsService.uploadImage(id, user, file);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  update(
    @Param('id') id: string,
    @Body() updateFieldDto: UpdateFieldDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.fieldsService.update(id, user, updateFieldDto);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.fieldsService.removeImage(id, imageId, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.fieldsService.remove(id, user);
  }
}
