import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
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
  async getBanners(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    
    const [banners, total] = await Promise.all([
      this.prisma.banner.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.banner.count(),
    ]);
    
    return ok({
      list: banners,
      total,
      page,
      pageSize,
    });
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

  @Patch('banners/:id/status')
  async updateBannerStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    const { status } = body;
    const banner = await this.prisma.banner.update({
      where: { id },
      data: { status },
    });

    return ok(banner);
  }

  // 优惠券模板管理
  @Post('coupons')
  async createCouponTemplate(@Body() body: {
    name: string;
    amount: number;
    minSpend: number;
    totalQuantity: number;
    validDays: number;
    description?: string;
    userLimit?: number;
    categoryIds?: string[];
  }) {
    const {
      name,
      amount,
      minSpend,
      totalQuantity,
      validDays,
      description,
      userLimit = 1,
      categoryIds = [],
    } = body;

    const couponTemplate = await this.prisma.couponTemplate.create({
      data: {
        name,
        amount,
        minSpend,
        totalQuantity,
        validDays,
        description,
        userLimit,
        categoryIds,
      },
    });

    return ok({
      ...couponTemplate,
      remainingQuantity: couponTemplate.totalQuantity,
      status: 'active',
      createTime: couponTemplate.createdAt,
      expireTime: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  @Get('coupons')
  async getCouponTemplates(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    
    const [templates, total] = await Promise.all([
      this.prisma.couponTemplate.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              userCoupons: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.couponTemplate.count(),
    ]);

    return ok({
      list: templates,
      total,
      page,
      pageSize,
    });
  }

  // 限时特惠管理
  @Get('special-offers')
  async getSpecialOffers(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    
    const [specialOffers, total] = await Promise.all([
      this.prisma.specialOffer.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.specialOffer.count(),
    ]);
    
    return ok({
      list: specialOffers,
      total,
      page,
      pageSize,
    });
  }

  @Post('special-offers')
  async createSpecialOffer(@Body() body: {
    name: string;
    category: string;
    price: number;
    unit: string;
    rating: number;
    image: string;
    description: string;
    providerCount?: number;
    tags?: string[];
    sortOrder?: number;
  }) {
    const {
      name,
      category,
      price,
      unit,
      rating,
      image,
      description,
      providerCount = 0,
      tags = [],
      sortOrder = 1,
    } = body;

    const specialOffer = await this.prisma.specialOffer.create({
      data: {
        name,
        category,
        price,
        unit,
        rating,
        image,
        description,
        providerCount,
        tags,
        sortOrder,
      },
    });

    return ok(specialOffer);
  }

  @Put('special-offers/:id')
  async updateSpecialOffer(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      category?: string;
      price?: number;
      unit?: string;
      rating?: number;
      image?: string;
      description?: string;
      providerCount?: number;
      tags?: string[];
      status?: string;
      sortOrder?: number;
    }
  ) {
    const specialOffer = await this.prisma.specialOffer.update({
      where: { id },
      data: body,
    });

    return ok(specialOffer);
  }

  @Delete('special-offers/:id')
  async deleteSpecialOffer(@Param('id') id: string) {
    await this.prisma.specialOffer.delete({
      where: { id },
    });
    return ok(null);
  }

  @Patch('special-offers/:id/status')
  async updateSpecialOfferStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    const { status } = body;
    const specialOffer = await this.prisma.specialOffer.update({
      where: { id },
      data: { status },
    });

    return ok(specialOffer);
  }
}
