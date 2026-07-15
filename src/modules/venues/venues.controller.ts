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
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { DTOAddVenueOwner, DTOCreateVenue, DTOUpdateVenue } from './venues.dto';
import { VenuesService } from './venues.service';

@Controller('venues')
export class VenuesController {
  constructor(private readonly venuesService: VenuesService) {}

  @Public()
  @Get()
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user?: JwtPayloadReturn) {
    return this.venuesService.findAll(user, query);
  }

  @Get(':id/owners')
  @UseGuards(RolesGuard)
  @Roles('admin')
  listOwners(@Param('id') id: string) {
    return this.venuesService.listOwners(id);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.venuesService.findOne(id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  create(@Body() bodyPayload: DTOCreateVenue, @CurrentUser() user: JwtPayloadReturn) {
    return this.venuesService.create({
      ...bodyPayload,
      ownerId: bodyPayload.ownerId || user.id,
    });
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
    return this.venuesService.uploadImage(id, user, file);
  }

  @Post(':id/owners')
  @UseGuards(RolesGuard)
  @Roles('admin')
  addOwner(@Param('id') id: string, @Body() bodyPayload: DTOAddVenueOwner) {
    return this.venuesService.addOwner(id, bodyPayload.userId);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  update(
    @Param('id') id: string,
    @Body() bodyPayload: DTOUpdateVenue,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.venuesService.update(id, user, bodyPayload);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.venuesService.removeImage(id, imageId, user);
  }

  @Delete(':id/owners/:userId')
  @UseGuards(RolesGuard)
  @Roles('admin')
  removeOwner(@Param('id') id: string, @Param('userId') userId: string) {
    return this.venuesService.removeOwner(id, userId);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.venuesService.remove(id, user);
  }
}
