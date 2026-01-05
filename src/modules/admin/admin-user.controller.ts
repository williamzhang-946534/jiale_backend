import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { Prisma } from '@prisma/client';

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminUserController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  async list(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const keyword = query.keyword;
    const level = query.level ? Number(query.level) : undefined;

    const where: Prisma.UserWhereInput = {};
    if (keyword) {
      where.OR = [
        { phone: { contains: keyword } },
        { nickname: { contains: keyword } },
      ];
    }
    if (!Number.isNaN(level)) {
      where.level = level;
    }

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: {
          id: true,
          phone: true,
          nickname: true,
          role: true,
          level: true,
          walletBalance: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return ok({ list, total });
  }

  @Get('users/:id')
  async detail(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 50,
        },
        coupons: {
          include: {
            template: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    return ok(user);
  }

  @Post('users/:id/coupons')
  async giveCoupon(
    @Param('id') userId: string,
    @Body() body: { templateId: string },
  ) {
    if (!body?.templateId) {
      throw new BadRequestException('templateId 不能为空');
    }

    const template = await this.prisma.couponTemplate.findUnique({
      where: { id: body.templateId },
    });
    if (!template) {
      throw new NotFoundException('优惠券模板不存在');
    }

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('用户不存在');
    }

    const expireAt = new Date(
      Date.now() + (template.validDays ?? 0) * 24 * 60 * 60 * 1000,
    );

    const coupon = await this.prisma.userCoupon.create({
      data: {
        userId,
        templateId: template.id,
        expireAt,
      },
    });

    return ok(coupon);
  }
}

