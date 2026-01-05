import { Controller, Get, Req, UseGuards, Post, Body, Put, Param, Delete, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('v1/user')
@UseGuards(JwtAuthGuard, new RoleGuard(['CUSTOMER']))
export class ProfileController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('profile')
  async profile(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
    });
    return ok(user);
  }

  @Get('addresses')
  async addresses(@Req() req: any) {
    const list = await this.prisma.address.findMany({
      where: { userId: req.user.id },
      orderBy: { isDefault: 'desc' },
    });
    return ok(list);
  }

  @Post('addresses')
  async createAddress(@Req() req: any, @Body() body: {
    contactName: string;
    phone: string;
    province: string;
    city: string;
    district: string;
    detail: string;
    latitude?: number;
    longitude?: number;
    isDefault?: boolean;
  }) {
    const {
      contactName,
      phone,
      province,
      city,
      district,
      detail,
      latitude,
      longitude,
      isDefault = false,
    } = body;

    // 如果设置为默认地址，先取消其他默认地址
    if (isDefault) {
      await this.prisma.address.updateMany({
        where: { userId: req.user.id },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.create({
      data: {
        userId: req.user.id,
        contactName,
        phone,
        province,
        city,
        district,
        detail,
        latitude,
        longitude,
        isDefault,
      },
    });

    return ok(address);
  }

  @Put('addresses/:id')
  async updateAddress(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: {
      contactName?: string;
      phone?: string;
      province?: string;
      city?: string;
      district?: string;
      detail?: string;
      latitude?: number;
      longitude?: number;
      isDefault?: boolean;
    },
  ) {
    const {
      contactName,
      phone,
      province,
      city,
      district,
      detail,
      latitude,
      longitude,
      isDefault,
    } = body;

    // 验证地址是否属于当前用户
    const existingAddress = await this.prisma.address.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existingAddress) {
      throw new Error('地址不存在');
    }

    // 如果设置为默认地址，先取消其他默认地址
    if (isDefault && !existingAddress.isDefault) {
      await this.prisma.address.updateMany({
        where: { 
          userId: req.user.id,
          id: { not: id },
        },
        data: { isDefault: false },
      });
    }

    const address = await this.prisma.address.update({
      where: { id },
      data: {
        contactName,
        phone,
        province,
        city,
        district,
        detail,
        latitude,
        longitude,
        isDefault,
      },
    });

    return ok(address);
  }

  @Delete('addresses/:id')
  async deleteAddress(@Req() req: any, @Param('id') id: string) {
    // 验证地址是否属于当前用户
    const existingAddress = await this.prisma.address.findFirst({
      where: { id, userId: req.user.id },
    });
    if (!existingAddress) {
      throw new Error('地址不存在');
    }

    // 检查是否有关联的订单
    const ordersCount = await this.prisma.order.count({
      where: { addressId: id },
    });
    if (ordersCount > 0) {
      throw new Error('该地址有关联的订单，无法删除');
    }

    await this.prisma.address.delete({
      where: { id },
    });

    return ok(null);
  }

  @Get('favorites')
  async favorites(@Req() req: any) {
    // 由于数据库中没有favorites表，这里返回空数组
    // 实际项目中需要创建favorites表来存储用户收藏
    return ok({ data: [] });
  }

  @Get('coupons')
  async coupons(@Req() req: any) {
    const coupons = await this.prisma.userCoupon.findMany({
      where: { 
        userId: req.user.id,
        isUsed: false,
        expireAt: { gt: new Date() },
      },
      include: {
        template: true,
      },
      orderBy: { expireAt: 'asc' },
    });

    const data = coupons.map((coupon) => ({
      id: coupon.id,
      name: coupon.template.name,
      amount: coupon.template.amount,
      minSpend: coupon.template.minSpend,
      expireAt: coupon.expireAt,
      daysLeft: Math.ceil((coupon.expireAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)),
    }));

    return ok({ data });
  }

  @Get('schedule')
  async getSchedule(@Req() req: any, @Query() query: { year?: number; month?: number }) {
    const { year = new Date().getFullYear(), month = new Date().getMonth() + 1 } = query;

    // 获取指定月份的订单
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    const orders = await this.prisma.order.findMany({
      where: {
        userId: req.user.id,
        serviceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true,
      },
      orderBy: {
        serviceDate: 'asc',
      },
    });

    const data = orders.map((order) => ({
      id: order.id,
      date: order.serviceDate.toISOString().split('T')[0],
      time: order.serviceTime,
      serviceName: order.service.name,
      status: order.status,
      price: order.totalPrice,
    }));

    return ok({ data });
  }
}


