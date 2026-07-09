import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayloadReturn } from '@/utils/jwt.util';

export const CurrentUser = createParamDecorator(
  (data: keyof JwtPayloadReturn | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as JwtPayloadReturn;

    return data ? user?.[data] : user;
  },
);
