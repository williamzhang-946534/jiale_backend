import {
  Body,
  Controller,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from '../services/auth.service';
import { PrismaService } from '../services/prisma.service';
import { ok } from '../types/api-response';

@Controller('v1/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * 用户登录（手机号 + 密码）
   * POST /api/v1/auth/customer/login
   */
  @Post('customer/login')
  async customerLogin(@Body() body: { 
    phone: string; 
    password: string; 
    redirectUrl?: string; // 可选的返回URL
  }) {
    const { phone, password, redirectUrl } = body;

    if (!phone || !password) {
      throw new UnauthorizedException('手机号和密码不能为空');
    }

    const user = await this.prisma.user.findUnique({
      where: { phone },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 简单密码验证（实际项目中应该使用 bcrypt 加密存储和验证）
    if (user.password !== password) {
      throw new UnauthorizedException('密码错误');
    }

    const token = this.authService.signToken(user.id, 'CUSTOMER');

    return ok({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
        role: user.role,
        avatarUrl: user.avatarUrl,
      },
      redirectUrl: redirectUrl || null, // 返回传入的redirectUrl，供前端使用
    });
  }

  /**
   * 管理员登录（用户名 + 密码）
   * POST /api/auth/admin/login
   */
  @Post('admin/login')
  async adminLogin(@Body() body: { username: string; password: string }) {
    const { username, password } = body;

    if (!username || !password) {
      throw new UnauthorizedException('用户名和密码不能为空');
    }

    const admin = await this.prisma.adminUser.findUnique({
      where: { username },
    });

    if (!admin) {
      throw new UnauthorizedException('管理员不存在');
    }

    // 简单密码验证（实际项目中应该使用 bcrypt 加密存储和验证）
    if (admin.password !== password) {
      throw new UnauthorizedException('密码错误');
    }

    const token = this.authService.signToken(admin.id, 'ADMIN');

    return ok({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
      },
    });
  }

  /**
   * 服务提供者登录（手机号 + 密码）
   * POST /api/auth/provider/login
   */
  @Post('provider/login')
  async providerLogin(@Body() body: { phone: string; password: string }) {
    const { phone, password } = body;

    if (!phone || !password) {
      throw new UnauthorizedException('手机号和密码不能为空');
    }

    // 服务提供者通过关联的用户账号登录
    const user = await this.prisma.user.findUnique({
      where: { phone },
      include: {
        providers: true,
      },
    });

    if (!user) {
      throw new UnauthorizedException('用户不存在');
    }

    // 简单密码验证（实际项目中应该使用 bcrypt 加密存储和验证）
    if (user.password !== password) {
      throw new UnauthorizedException('密码错误');
    }

    // 检查用户是否有服务提供者账号
    const provider = user.providers?.[0];
    if (!provider) {
      throw new UnauthorizedException('该账号不是服务提供者');
    }

    // 使用用户的 ID 和 PROVIDER 角色生成 token
    const token = this.authService.signToken(user.id, 'PROVIDER');

    return ok({
      token,
      provider: {
        id: provider.id,
        userId: user.id,
        name: provider.name,
        phone: provider.phone,
        status: provider.status,
        rating: provider.rating?.toNumber(),
      },
      user: {
        id: user.id,
        phone: user.phone,
        nickname: user.nickname,
      },
    });
  }
}

