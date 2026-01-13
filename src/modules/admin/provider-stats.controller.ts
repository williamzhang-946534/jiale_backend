import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1')
export class ProviderStatsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('providers/:id/daily-stats')
  async getProviderDailyStats(
    @Param('id') providerId: string,
    @Query() query: { startDate?: string; endDate?: string }
  ) {
    const { startDate, endDate } = query;
    
    let where: any = { providerId };
    
    if (startDate && endDate) {
      where.date = {
        gte: new Date(startDate),
        lte: new Date(endDate)
      };
    }

    const dailyStats = await this.prisma.providerDailyStats.findMany({
      where,
      orderBy: { date: 'asc' }
    });

    return ok({
      data: dailyStats.map(stat => ({
        date: stat.date.toISOString().split('T')[0],
        orderCount: stat.orderCount,
        orderAmount: stat.orderAmount.toNumber(),
        earnings: stat.earnings.toNumber(),
        orderTypes: stat.orderTypes || {}
      }))
    });
  }

  @Get('providers/:id/monthly-stats')
  async getProviderMonthlyStats(
    @Param('id') providerId: string,
    @Query() query: { year: number; month: number }
  ) {
    const { year, month } = query;
    
    // 获取指定月份的所有日统计
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const dailyStats = await this.prisma.providerDailyStats.findMany({
      where: {
        providerId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { date: 'asc' }
    });

    // 计算月度汇总
    const totalOrders = dailyStats.reduce((sum, stat) => sum + stat.orderCount, 0);
    const totalRevenue = dailyStats.reduce((sum, stat) => sum + Number(stat.orderAmount), 0);
    const totalEarnings = dailyStats.reduce((sum, stat) => sum + Number(stat.earnings), 0);
    const workingDays = dailyStats.filter(stat => stat.orderCount > 0).length;

    // 汇总订单类型
    const orderTypesSummary: Record<string, number> = {};
    dailyStats.forEach(stat => {
      const orderTypes = stat.orderTypes as Record<string, number> || {};
      Object.entries(orderTypes).forEach(([type, count]) => {
        orderTypesSummary[type] = (orderTypesSummary[type] || 0) + count;
      });
    });

    return ok({
      data: {
        year,
        month,
        totalOrders,
        totalRevenue,
        totalEarnings,
        workingDays,
        orderTypesSummary,
        dailyStats: dailyStats.map(stat => ({
          date: stat.date.toISOString().split('T')[0],
          orderCount: stat.orderCount,
          orderAmount: stat.orderAmount.toNumber(),
          earnings: stat.earnings.toNumber(),
          orderTypes: stat.orderTypes || {}
        }))
      }
    });
  }

  @Post('providers/:id/update-stats')
  async updateProviderStats(
    @Param('id') providerId: string,
    @Body() body: { orderAmount: number; orderType: string }
  ) {
    const { orderAmount, orderType } = body;
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为当天开始

    // 查找或创建今日统计记录
    let dailyStats = await this.prisma.providerDailyStats.findUnique({
      where: {
        providerId_date: {
          providerId,
          date: today
        }
      }
    });

    if (dailyStats) {
      // 更新现有记录
      const currentOrderTypes = dailyStats.orderTypes as Record<string, number> || {};
      currentOrderTypes[orderType] = (currentOrderTypes[orderType] || 0) + 1;

      dailyStats = await this.prisma.providerDailyStats.update({
        where: { id: dailyStats.id },
        data: {
          orderCount: dailyStats.orderCount + 1,
          orderAmount: Number(dailyStats.orderAmount) + orderAmount,
          earnings: Number(dailyStats.earnings) + orderAmount,
          orderTypes: currentOrderTypes
        }
      });
    } else {
      // 创建新记录
      dailyStats = await this.prisma.providerDailyStats.create({
        data: {
          providerId,
          date: today,
          orderCount: 1,
          orderAmount,
          earnings: orderAmount,
          orderTypes: { [orderType]: 1 }
        }
      });
    }

    // 更新服务者的总体统计
    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        totalOrders: { increment: 1 },
        totalRevenue: { increment: orderAmount },
        todayEarnings: { increment: orderAmount }
      }
    });

    // 获取更新后的统计信息
    const updatedProvider = await this.prisma.provider.findUnique({
      where: { id: providerId },
      select: {
        totalOrders: true,
        totalRevenue: true,
        todayEarnings: true
      }
    });

    // 计算本月统计
    const currentMonth = new Date();
    const monthlyStatsResult = await this.getProviderMonthlyStats(providerId, {
      year: currentMonth.getFullYear(),
      month: currentMonth.getMonth() + 1
    });

    return ok({
      data: {
        todayOrders: dailyStats.orderCount,
        todayRevenue: dailyStats.earnings.toNumber(),
        monthlyOrders: (monthlyStatsResult as any).data?.totalOrders || 0,
        monthlyRevenue: (monthlyStatsResult as any).data?.totalRevenue || 0,
        totalOrders: updatedProvider?.totalOrders || 0,
        totalRevenue: updatedProvider?.totalRevenue.toNumber() || 0
      }
    });
  }
}
