import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { JwtProvider } from '../providers/jwt.provider';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Authorization token is missing or invalid');
    }

    const token = authHeader.split(' ')[1];
    const data = JwtProvider.verifyToken(token, process.env.ACCESS_TOKEN_SECRET!);

    if (!data) {
      throw new UnauthorizedException('User not found or token invalid');
    }

    request.user = data;
    return true;
  }
}
