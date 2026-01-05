import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService, JwtPayload } from '../services/auth.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly authService: AuthService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const request = ctx.switchToHttp().getRequest();
    const auth = request.headers['authorization'] || '';
    const token = typeof auth === 'string' && auth.startsWith('Bearer ')
      ? auth.slice(7)
      : null;

    if (!token) {
      throw new UnauthorizedException('UNAUTHORIZED');
    }

    try {
      const payload = this.jwt.verify<JwtPayload>(token);
      const user = await this.authService.validateUser(payload);
      if (!user) {
        throw new UnauthorizedException('UNAUTHORIZED');
      }
      request.user = { ...user, role: payload.role };
      return true;
    } catch {
      throw new UnauthorizedException('UNAUTHORIZED');
    }
  }
}


