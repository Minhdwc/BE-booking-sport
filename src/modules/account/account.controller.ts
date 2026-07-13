import { Body, Controller, Get, Patch, UnauthorizedException } from '@nestjs/common';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { AccountService } from './account.service';
import { ChangePasswordDto, UpdateProfileDto } from './account.dto';

@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  @Get('me')
  getMe(@CurrentUser() user: JwtPayloadReturn) {
    if (!user.id) {
      throw new UnauthorizedException('Token không tồn tại hoặc không hợp lệ');
    }
    return this.accountService.getMe(user.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() user: JwtPayloadReturn, @Body() updateProfileDto: UpdateProfileDto) {
    return this.accountService.updateProfile(user.id, {
      name: updateProfileDto.name,
      username: updateProfileDto.username,
      phone: updateProfileDto.phone,
      avatarUrl: updateProfileDto.avatarUrl,
    });
  }

  @Patch('change-password')
  changePassword(
    @CurrentUser() user: JwtPayloadReturn,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.accountService.changePassword(
      user.id,
      changePasswordDto.currentPassword,
      changePasswordDto.newPassword,
    );
  }
}
