import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

@Injectable()
export class RoleGuard implements CanActivate {
  constructor(
    private readonly roles: ('CUSTOMER' | 'PROVIDER' | 'ADMIN')[],
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user as { role?: string } | undefined;
    if (!user || !user.role || !this.roles.includes(user.role as any)) {
      throw new ForbiddenException('FORBIDDEN');
    }
    return true;
  }
}


