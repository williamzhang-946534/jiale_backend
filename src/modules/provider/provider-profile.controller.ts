import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER']))
export class ProviderProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    const provider = await this.prisma.provider.findFirst({
      where: {
        userId: req.user.id,
      },
      include: {
        user: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    // 获取评价统计
    const reviews = await this.prisma.orderReview.findMany({
      where: {
        order: {
          providerId: provider.id,
        },
      },
    });

    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 5.0;

    const data = {
      id: provider.id,
      name: provider.name,
      phone: provider.phone,
      avatar: provider.avatarUrl,
      intro: provider.intro,
      status: provider.status,
      rating: avgRating,
      totalOrders: provider._count.orders,
      totalReviews: reviews.length,
      todayEarnings: provider.todayEarnings,
      walletBalance: provider.walletBalance,
      idCardNumber: provider.idCardNumber ? 
        provider.idCardNumber.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2') : null,
      certFiles: provider.certFiles,
      createdAt: provider.createdAt,
      user: {
        id: provider.user.id,
        phone: provider.user.phone,
        nickname: provider.user.nickname,
      },
    };

    return ok(data);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: {
    name?: string;
    intro?: string;
    avatarUrl?: string;
  }) {
    const { name, intro, avatarUrl } = body;

    const provider = await this.prisma.provider.findFirst({
      where: {
        userId: req.user.id,
      },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    const updatedProvider = await this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        name,
        intro,
        avatarUrl,
      },
    });

    return ok({
      id: updatedProvider.id,
      name: updatedProvider.name,
      intro: updatedProvider.intro,
      avatarUrl: updatedProvider.avatarUrl,
      updatedAt: updatedProvider.updatedAt,
    });
  }
}
