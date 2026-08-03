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
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { memoryStorage } from 'multer';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { Public } from '@/common/decorators/public.decorator';
import { Roles } from '@/common/decorators/roles.decorator';
import { PaginationQueryDto } from '@/common/dto/pagination.dto';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { DTOCreateVenue, DTOUpdateVenue } from './venues.dto';
import { VenuesService } from './venues.service';
import { SearchService } from '@/modules/search/search.service';

@ApiTags('Venues')
@Controller('venues')
export class VenuesController {
  constructor(
    private readonly venuesService: VenuesService,
    private readonly searchService: SearchService,
  ) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'Danh sách venue' })
  findAll(@Query() query: PaginationQueryDto, @CurrentUser() user?: JwtPayloadReturn) {
    return this.venuesService.findAll(user, query);
  }

  @Get(':id/owners')
  @UseGuards(RolesGuard)
  @Roles('admin')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Danh sách owner của venue (admin)' })
  @ApiParam({ name: 'id', description: 'Venue ID' })
  listOwners(@Param('id') id: string) {
    return this.venuesService.listOwners(id);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Chi tiết venue' })
  @ApiParam({ name: 'id', description: 'Venue ID' })
  async findOne(@Param('id') id: string, @CurrentUser() user?: JwtPayloadReturn) {
    const venue = await this.venuesService.findOne(id, { trackView: true });
    if (user?.id) {
      void this.searchService.addRecentlyViewed(user.id, id);
    }
    return venue;
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Tạo venue mới' })
  create(@Body() bodyPayload: DTOCreateVenue, @CurrentUser() user: JwtPayloadReturn) {
    return this.venuesService.create(bodyPayload, user);
  }

  @Post(':id/images')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Upload ảnh venue' })
  @ApiConsumes('multipart/form-data')
  @ApiParam({ name: 'id', description: 'Venue ID' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
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

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Cập nhật venue' })
  @ApiParam({ name: 'id', description: 'Venue ID' })
  update(
    @Param('id') id: string,
    @Body() bodyPayload: DTOUpdateVenue,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.venuesService.update(id, user, bodyPayload);
  }

  @Delete(':id/images/:imageId')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa ảnh venue' })
  @ApiParam({ name: 'id', description: 'Venue ID' })
  @ApiParam({ name: 'imageId', description: 'Image ID' })
  removeImage(
    @Param('id') id: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.venuesService.removeImage(id, imageId, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'owner')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Xóa venue' })
  @ApiParam({ name: 'id', description: 'Venue ID' })
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.venuesService.remove(id, user);
  }
}
