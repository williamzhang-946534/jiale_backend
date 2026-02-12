import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';

@ApiTags('新人专区')
@Controller('v1/newcomer')
export class NewcomerController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('zone')
  @ApiOperation({ summary: '新人专区数据' })
  @ApiResponse({ status: 200, description: '成功' })
  async zone() {
    const [couponTemplates, offers] = await Promise.all([
      this.prisma.couponTemplate.findMany({
        where: {
          scene: 'newcomer',
        },
        orderBy: { createdAt: 'desc' },
        take: 20,
      }),
      this.prisma.newcomerOffer.findMany({
        where: {
          status: 'active',
        },
        include: {
          service: true,
        },
        orderBy: { sortOrder: 'asc' },
        take: 20,
      }),
    ]);

    const templateIds = couponTemplates.map((t) => t.id);
    const claimedCounts = templateIds.length
      ? await this.prisma.userCoupon.groupBy({
          by: ['templateId'],
          where: { templateId: { in: templateIds } },
          _count: { templateId: true },
        })
      : [];

    const claimedCountMap = new Map(
      claimedCounts.map((g) => [g.templateId, g._count.templateId]),
    );

    return ok({
      coupons: couponTemplates.map((t) => ({
        id: t.id,
        amount: t.amount.toNumber(),
        minSpend: t.minSpend.toNumber(),
        validityDays: t.validDays,
        totalLimit: t.totalQuantity,
        claimedCount: claimedCountMap.get(t.id) ?? 0,
      })),
      specialOffers: offers.map((o) => ({
        id: o.id,
        serviceId: o.serviceId,
        serviceName: o.service.name,
        originalPrice: o.originalPrice.toNumber(),
        newcomerPrice: o.newcomerPrice.toNumber(),
        stockLimit: o.stockLimit,
        claimedCount: o.claimedCount,
        image: o.service.images?.[0] || '',
      })),
    });
  }

  @Post('claim-coupon')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, new RoleGuard(['CUSTOMER']))
  @ApiOperation({ summary: '领取新人优惠券' })
  @ApiResponse({ status: 200, description: '成功' })
  async claimCoupon(@Req() req: any, @Body() body: { couponId: string }) {
    if (!body?.couponId) {
      throw new BadRequestException('couponId 不能为空');
    }

    const template = await this.prisma.couponTemplate.findUnique({
      where: { id: body.couponId },
    });
    if (!template || template.scene !== 'newcomer') {
      throw new BadRequestException('优惠券不存在');
    }

    const data = await this.prisma.$transaction(async (tx) => {
      const totalClaimed = await tx.userCoupon.count({
        where: { templateId: template.id },
      });
      if (totalClaimed >= template.totalQuantity) {
        throw new BadRequestException('优惠券已领完');
      }

      const userClaimed = await tx.userCoupon.count({
        where: { templateId: template.id, userId: req.user.id },
      });
      if (userClaimed >= (template.userLimit ?? 1)) {
        throw new BadRequestException('已达到领取上限');
      }

      const expireAt = new Date(Date.now() + template.validDays * 24 * 60 * 60 * 1000);
      const coupon = await tx.userCoupon.create({
        data: {
          userId: req.user.id,
          templateId: template.id,
          expireAt,
        },
      });

      return coupon;
    });

    return ok({
      success: true,
      message: '领取成功',
      couponId: data.id,
    });
  }

  @Post('purchase')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, new RoleGuard(['CUSTOMER']))
  @ApiOperation({ summary: '新人专享服务购买（创建订单）' })
  @ApiResponse({ status: 200, description: '成功' })
  async purchase(
    @Req() req: any,
    @Body()
    body: {
      offerId?: string;
      serviceId: string;
      addressId: string;
      serviceDate: number;
      serviceTime: string;
    },
  ) {
    if (!body?.serviceId || !body?.addressId || !body?.serviceDate || !body?.serviceTime) {
      throw new BadRequestException('参数不完整');
    }

    const offer = await this.prisma.newcomerOffer.findFirst({
      where: {
        ...(body.offerId ? { id: body.offerId } : {}),
        serviceId: body.serviceId,
        status: 'active',
      },
    });
    if (!offer) {
      throw new BadRequestException('新人专享活动不存在');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      if (offer.claimedCount >= offer.stockLimit) {
        throw new BadRequestException('库存不足');
      }

      const updatedOffer = await tx.newcomerOffer.update({
        where: { id: offer.id },
        data: { claimedCount: { increment: 1 } },
      });

      if (updatedOffer.claimedCount > updatedOffer.stockLimit) {
        throw new BadRequestException('库存不足');
      }

      const [service, address] = await Promise.all([
        tx.service.findUnique({ where: { id: body.serviceId } }),
        tx.address.findUnique({ where: { id: body.addressId } }),
      ]);
      if (!service) {
        throw new BadRequestException('服务不存在');
      }
      if (!address || address.userId !== req.user.id) {
        throw new BadRequestException('地址无效');
      }

      const originalPrice = offer.originalPrice;
      const totalPrice = offer.newcomerPrice;
      const discount = originalPrice.minus(totalPrice);

      const orderNo = `ORD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      const order = await tx.order.create({
        data: {
          orderNo,
          userId: req.user.id,
          serviceId: service.id,
          addressId: address.id,
          status: 'PENDING',
          serviceDate: new Date(body.serviceDate),
          serviceTime: body.serviceTime,
          originalPrice,
          discount,
          totalPrice,
          timeline: {
            created: new Date().toISOString(),
            source: 'newcomer',
            offerId: offer.id,
          } as any,
        },
      });

      return order;
    });

    return ok({
      success: true,
      message: '订单创建成功',
      orderId: result.id,
    });
  }
}
