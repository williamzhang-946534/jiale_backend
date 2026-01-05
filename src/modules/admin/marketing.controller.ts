import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1/marketing')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminMarketingController {
  constructor(private readonly prisma: PrismaService) {}

  // 轮播图管理
  @Get('banners')
  async getBanners() {
    const banners = await this.prisma.banner.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return ok({ data: banners });
  }

  @Post('banners')
  async createBanner(@Body() body: {
    imageUrl: string;
    linkUrl?: string;
    sortOrder?: number;
  }) {
    const { imageUrl, linkUrl, sortOrder = 1 } = body;

    const banner = await this.prisma.banner.create({
      data: {
        imageUrl,
        linkUrl,
        sortOrder,
      },
    });

    return ok(banner);
  }

  @Delete('banners/:id')
  async deleteBanner(@Param('id') id: string) {
    await this.prisma.banner.delete({
      where: { id },
    });
    return ok(null);
  }

  // 优惠券模板管理
  @Post('coupons')
  async createCouponTemplate(@Body() body: {
    name: string;
    amount: number;
    minSpend: number;
    totalQuantity: number;
    validDays: number;
  }) {
    const {
      name,
      amount,
      minSpend,
      totalQuantity,
      validDays,
    } = body;

    const couponTemplate = await this.prisma.couponTemplate.create({
      data: {
        name,
        amount,
        minSpend,
        totalQuantity,
        validDays,
      },
    });

    return ok(couponTemplate);
  }

  @Get('coupons')
  async getCouponTemplates() {
    const templates = await this.prisma.couponTemplate.findMany({
      include: {
        _count: {
          select: {
            userCoupons: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return ok({ data: templates });
  }
}
