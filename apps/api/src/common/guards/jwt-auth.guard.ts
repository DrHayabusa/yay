import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest();
    const header: string | undefined = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    if (!token) throw new UnauthorizedException({ error: 'UNAUTHENTICATED', message: 'Missing bearer token' });

    try {
      const payload = await this.jwt.verifyAsync(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
      req.user = { userId: payload.sub, phone: payload.phone, roles: payload.roles ?? [] };
      return true;
    } catch {
      throw new UnauthorizedException({ error: 'UNAUTHENTICATED', message: 'Invalid or expired token' });
    }
  }
}
