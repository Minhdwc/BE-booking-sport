import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto, VerifyEmailDto } from './auth.dto';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(
      registerDto.name,
      registerDto.username,
      registerDto.email,
      registerDto.phone,
      registerDto.password,
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Làm mới access token' })
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Đăng xuất' })
  logout() {
    return { success: true };
  }

  @Public()
  @Post('verify-email')
  @ApiOperation({ summary: 'Xác minh email' })
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('resend-verify')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Gửi lại email xác minh' })
  resendVerifyEmail(@CurrentUser() user: JwtPayloadReturn) {
    return this.authService.resendVerifyEmail(user.id);
  }

  @Get('me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Thông tin user hiện tại' })
  getMe(@CurrentUser() user: JwtPayloadReturn) {
    return this.authService.getMe(user.id);
  }
}
