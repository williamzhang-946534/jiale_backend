import { Injectable, CanActivate, ExecutionContext, ForbiddenException, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class EnhancedRoleGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>('roles', [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    
    if (!user || !user.role) {
      throw new ForbiddenException({
        code: 403,
        message: '用户未认证或角色信息缺失',
        data: null
      });
    }

    const hasRole = requiredRoles.some((role) => {
      if (Array.isArray(user.role)) {
        return user.role.includes(role);
      }
      return user.role === role;
    });

    if (!hasRole) {
      throw new ForbiddenException({
        code: 403,
        message: `权限不足，需要以下角色之一: ${requiredRoles.join(', ')}`,
        data: {
          requiredRoles,
          userRole: user.role
        }
      });
    }

    return true;
  }
}

// 角色装饰器
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
