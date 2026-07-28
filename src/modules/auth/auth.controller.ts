import { Body, Controller, Post, Get } from '@nestjs/common';
import { Public } from '@/common/decorators/public.decorator';
import { CurrentUser } from '@/common/decorators/current-user.decorator';
import { JwtPayloadReturn } from '@/utils/jwt.util';
import { AuthService } from './auth.service';
import { LoginDto, RefreshDto, RegisterDto, VerifyEmailDto } from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto.email, loginDto.password);
  }

  @Public()
  @Post('register')
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
  refresh(@Body() refreshDto: RefreshDto) {
    return this.authService.refresh(refreshDto.refreshToken);
  }

  @Public()
  @Post('logout')
  logout() {
    return { success: true };
  }

  @Public()
  @Post('verify-email')
  verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto.token);
  }

  @Post('resend-verify')
  resendVerifyEmail(@CurrentUser() user: JwtPayloadReturn) {
    return this.authService.resendVerifyEmail(user.id);
  }

  @Get('me')
  getMe(@CurrentUser() user: JwtPayloadReturn) {
    return this.authService.getMe(user.id);
  }
}
