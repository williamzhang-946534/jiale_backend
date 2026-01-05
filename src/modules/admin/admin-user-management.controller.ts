import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminUserManagementController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('users')
  async getUsers(@Query() query: {
    page?: number;
    pageSize?: number;
    keyword?: string;
    level?: number;
  }) {
    const {
      page = 1,
      pageSize = 20,
      keyword,
      level,
    } = query;

    const where: any = {};

    if (keyword) {
      where.OR = [
        { phone: { contains: keyword } },
        { nickname: { contains: keyword } },
      ];
    }

    if (level) {
      where.level = Number(level);
    }

    const [list, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        include: {
          _count: {
            select: {
              orders: true,
              addresses: true,
              coupons: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.user.count({ where }),
    ]);

    return ok({
      list,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('users/:id')
  async getUserDetail(@Param('id') id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      include: {
        addresses: {
          orderBy: { isDefault: 'desc' },
        },
        orders: {
          take: 10,
          orderBy: { createdAt: 'desc' },
          include: {
            service: true,
          },
        },
        coupons: {
          where: { isUsed: false },
          include: {
            template: true,
          },
          orderBy: { expireAt: 'asc' },
        },
        _count: {
          select: {
            orders: true,
            addresses: true,
            coupons: true,
          },
        },
      },
    });

    if (!user) {
      throw new Error('用户不存在');
    }

    return ok(user);
  }

  @Post('users/:id/coupons')
  async giveCoupon(
    @Param('id') id: string,
    @Body() body: { couponId: string },
    @Req() req: any,
  ) {
    const { couponId } = body;

    // 验证用户是否存在
    const user = await this.prisma.user.findUnique({
      where: { id },
    });
    if (!user) {
      throw new Error('用户不存在');
    }

    // 验证优惠券模板是否存在
    const couponTemplate = await this.prisma.couponTemplate.findUnique({
      where: { id: couponId },
    });
    if (!couponTemplate) {
      throw new Error('优惠券模板不存在');
    }

    // 创建用户优惠券
    const userCoupon = await this.prisma.userCoupon.create({
      data: {
        userId: id,
        templateId: couponId,
        expireAt: new Date(Date.now() + couponTemplate.validDays * 24 * 60 * 60 * 1000),
      },
      include: {
        template: true,
      },
    });

    // 记录操作日志
    await this.prisma.auditLog.create({
      data: {
        module: 'USER_MANAGEMENT',
        action: 'GIVE_COUPON',
        operatorId: req.user.id,
        operatorRole: 'ADMIN',
        entityId: id,
        detail: {
          couponId,
          couponName: couponTemplate.name,
          amount: couponTemplate.amount,
        },
      },
    });

    return ok(userCoupon);
  }
}
