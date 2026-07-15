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
import { Roles } from '@/common/decorators/roles.decorator';
import { RolesGuard } from '@/common/guards';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import {
  CreateVenuePaymentAccountDto,
  FindAllVenuePaymentAccountsQueryDto,
  UpdateVenuePaymentAccountDto,
} from './venue-payment-accounts.dto';
import { VenuePaymentAccountsService } from './venue-payment-accounts.service';

@Controller('venue-payment-accounts')
export class VenuePaymentAccountsController {
  constructor(private readonly service: VenuePaymentAccountsService) {}

  @Get()
  findAll(
    @CurrentUser() user: JwtPayloadReturn,
    @Query() query: FindAllVenuePaymentAccountsQueryDto,
  ) {
    return this.service.findAll(user, query);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.findOne(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  create(@Body() dto: CreateVenuePaymentAccountDto, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.create(user, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateVenuePaymentAccountDto,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.service.update(id, user, dto);
  }

  @Post(':id/qr-code')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  uploadQrCode(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() user: JwtPayloadReturn,
  ) {
    return this.service.uploadQrCode(id, user, file);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('admin', 'staff')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayloadReturn) {
    return this.service.remove(id, user);
  }
}
