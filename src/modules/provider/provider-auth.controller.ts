import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('v1/provider')
export class ProviderAuthController {
  constructor(private readonly prisma: PrismaService) {}

  @Post('register')
  async register(@Req() req: any, @Body() body: {
    name: string;
    idCard: string;
    phone: string;
    certFiles?: string[];
    intro?: string;
  }) {
    const { name, idCard, phone, certFiles = [], intro } = body;

    // 检查用户是否已经存在服务者账号
    const existingProvider = await this.prisma.provider.findFirst({
      where: {
        userId: req.user.id,
      },
    });
    if (existingProvider) {
      throw new Error('您已经拥有服务者账号');
    }

    // 检查身份证号是否已被使用
    const existingIdCard = await this.prisma.provider.findFirst({
      where: { idCardNumber: idCard },
    });
    if (existingIdCard) {
      throw new Error('该身份证号已被注册');
    }

    // 创建服务者账号
    const provider = await this.prisma.provider.create({
      data: {
        userId: req.user.id,
        name,
        phone,
        idCardNumber: idCard,
        certFiles: certFiles,
        intro,
        status: 'PENDING', // 提交后待审核
      },
    });

    return ok({
      id: provider.id,
      name: provider.name,
      phone: provider.phone,
      status: provider.status,
      submittedAt: provider.createdAt,
    });
  }

  @Get('verification-status')
  async getVerificationStatus(@Req() req: any) {
    const provider = await this.prisma.provider.findFirst({
      where: {
        userId: req.user.id,
      },
    });

    if (!provider) {
      return ok({
        hasApplied: false,
        status: null,
        message: '尚未提交申请',
      });
    }

    let message = '';
    switch (provider.status) {
      case 'UNVERIFIED':
        message = '未提交认证';
        break;
      case 'PENDING':
        message = '审核中，请耐心等待';
        break;
      case 'VERIFIED':
        message = '认证通过';
        break;
      case 'REJECTED':
        message = '认证被拒绝，请重新提交';
        break;
    }

    return ok({
      hasApplied: true,
      status: provider.status,
      message,
      provider: {
        id: provider.id,
        name: provider.name,
        phone: provider.phone,
        submittedAt: provider.createdAt,
        updatedAt: provider.updatedAt,
      },
    });
  }
}
