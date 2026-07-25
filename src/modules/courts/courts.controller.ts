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
import { CourtsService } from './courts.service';
import {
  CourtAvailabilityQueryDto,
  CreateCourtDto,
  FindAllCourtsQueryDto,
  UpdateCourtDto,
} from './courts.dto';

@Controller('courts')
export class CourtsController {
  constructor(private readonly courtsService: CourtsService) {}

  @Public()
  @Get()
  findAll(@Query() query: FindAllCourtsQueryDto, @CurrentUser() user?: JwtPayloadReturn) {
    return this.courtsService.findAll(user, query);
  }

  @Public()
  @Get(':id/availability')
  getAvailability(
    @Param('id') id: string,
    @Query() query: CourtAvailabilityQueryDto,
    @CurrentUser() user?: JwtPayloadReturn,
  ) {
    return this.courtsService.getAvailability(id, query.date, user);
  }

  @Public()
  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user?: JwtPayloadReturn) {
    return this.courtsService.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  create(@Body() createCourtDto: CreateCourtDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.courtsService.create(user, createCourtDto);
  }

  @Post(':id/images')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
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
    return this.courtsService.uploadImage(id, user, file);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  update(
    @Param('id') id: string,
    @Body() updateCourtDto: UpdateCourtDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.courtsService.update(id, user, updateCourtDto);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.courtsService.removeImage(id, imageId, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.courtsService.remove(id, user);
  }
}
