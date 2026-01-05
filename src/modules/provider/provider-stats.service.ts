import { Injectable } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';

@Injectable()
export class ProviderStatsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 更新服务者每日统计
   * 在订单完成时调用
   */
  async updateDailyStats(providerId: string, orderAmount: number, orderType: string) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // 设置为当天开始

    // 查找或创建当日统计记录
    const dailyStats = await this.prisma.providerDailyStats.upsert({
      where: {
        providerId_date: {
          providerId,
          date: today,
        },
      },
      update: {
        orderCount: {
          increment: 1,
        },
        orderAmount: {
          increment: orderAmount,
        },
        earnings: {
          increment: orderAmount,
        },
      },
      create: {
        providerId,
        date: today,
        orderCount: 1,
        orderAmount: orderAmount,
        earnings: orderAmount,
        orderTypes: {
          [orderType]: 1,
        },
      },
    });

    // 更新订单类型统计
    const currentOrderTypes = dailyStats.orderTypes as any || {};
    currentOrderTypes[orderType] = (currentOrderTypes[orderType] || 0) + 1;

    await this.prisma.providerDailyStats.update({
      where: { id: dailyStats.id },
      data: {
        orderTypes: currentOrderTypes,
      },
    });

    // 更新服务者总统计
    await this.prisma.provider.update({
      where: { id: providerId },
      data: {
        totalOrders: {
          increment: 1,
        },
        totalRevenue: {
          increment: orderAmount,
        },
        todayEarnings: {
          increment: orderAmount,
        },
        walletBalance: {
          increment: orderAmount,
        },
        withdrawableBalance: {
          increment: orderAmount,
        },
      },
    });

    return dailyStats;
  }

  /**
   * 获取服务者每日统计
   */
  async getDailyStats(providerId: string, startDate?: Date, endDate?: Date) {
    const where: any = { providerId };
    
    if (startDate || endDate) {
      where.date = {};
      if (startDate) where.date.gte = startDate;
      if (endDate) where.date.lte = endDate;
    }

    return this.prisma.providerDailyStats.findMany({
      where,
      orderBy: { date: 'desc' },
    });
  }

  /**
   * 获取服务者月度统计
   */
  async getMonthlyStats(providerId: string, year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0); // 月末

    const stats = await this.getDailyStats(providerId, startDate, endDate);
    
    // 汇总月度数据
    const monthlyStats = stats.reduce(
      (acc, stat) => ({
        totalOrders: acc.totalOrders + stat.orderCount,
        totalRevenue: acc.totalRevenue + stat.orderAmount.toNumber(),
        totalEarnings: acc.totalEarnings + stat.earnings.toNumber(),
        workingDays: acc.workingDays + (stat.orderCount > 0 ? 1 : 0),
      }),
      {
        totalOrders: 0,
        totalRevenue: 0,
        totalEarnings: 0,
        workingDays: 0,
      }
    );

    return {
      year,
      month,
      ...monthlyStats,
      dailyStats: stats,
    };
  }

  /**
   * 重置每日收入（每天0点执行）
   */
  async resetDailyEarnings() {
    // 重置所有服务者的今日收入为0
    await this.prisma.provider.updateMany({
      data: {
        todayEarnings: 0,
      },
    });
  }
}
