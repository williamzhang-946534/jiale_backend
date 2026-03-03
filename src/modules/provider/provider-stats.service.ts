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
   * 获取服务者周度统计
   */
  async getWeeklyStats(providerId: string, year?: number, week?: number) {
    const now = new Date();
    const targetYear = year || now.getFullYear();
    const targetWeek = week || this.getWeekNumber(now);
    
    // 获取指定周的开始和结束日期
    const { startDate, endDate } = this.getWeekDates(targetYear, targetWeek);
    
    const stats = await this.getDailyStats(providerId, startDate, endDate);
    
    // 生成一周的标签和值
    const weekDays = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
    const labels: string[] = [];
    const values: number[] = [];
    
    // 获取周的开始日期（周一）
    const weekStart = new Date(startDate);
    weekStart.setHours(0, 0, 0, 0);
    
    // 为每一天生成数据
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(weekStart.getDate() + i);
      currentDate.setHours(0, 0, 0, 0);
      
      labels.push(weekDays[i]);
      
      // 查找当天的统计数据
      const dayStats = stats.find(stat => {
        const statDate = new Date(stat.date);
        statDate.setHours(0, 0, 0, 0);
        return statDate.getTime() === currentDate.getTime();
      });
      
      values.push(dayStats ? dayStats.earnings.toNumber() : 0);
    }
    
    return {
      period: 'week',
      labels,
      values,
      startDate,
      endDate,
      totalEarnings: values.reduce((sum, val) => sum + val, 0),
      totalOrders: stats.reduce((sum, stat) => sum + stat.orderCount, 0)
    };
  }

  /**
   * 获取指定年份和周数的开始和结束日期
   */
  private getWeekDates(year: number, week: number) {
    // 🎯 使用更简单直接的方法：找到指定周数的周一
    const firstDayOfYear = new Date(year, 0, 1);
    
    // 计算第一个周一
    let firstMonday = new Date(firstDayOfYear);
    const dayOfWeek = firstDayOfYear.getDay();
    const daysUntilMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    firstMonday.setDate(firstDayOfYear.getDate() + daysUntilMonday);
    
    // 如果第一个周一在新的一年，调整到下一周
    if (firstMonday.getFullYear() > year) {
      firstMonday = new Date(year, 0, 8); // 1月8日总是第一个周一或之后
    }
    
    // 计算指定周的开始日期（周一）
    const startDate = new Date(firstMonday);
    startDate.setDate(firstMonday.getDate() + (week - 1) * 7);
    startDate.setHours(0, 0, 0, 0);
    
    // 计算结束日期（周日）
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  }

  /**
   * 获取日期的周数
   */
  private getWeekNumber(date: Date) {
    // 🎯 使用更简单的方法：直接计算当前周是第几周
    const today = new Date(date);
    const currentDay = today.getDay();
    
    // 调整到本周一
    const diff = today.getDate() - currentDay + (currentDay === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    
    // 计算从1月1日到本周一的天数
    const firstDayOfYear = new Date(monday.getFullYear(), 0, 1);
    const daysFromFirstDay = Math.floor((monday.getTime() - firstDayOfYear.getTime()) / 86400000);
    
    // 计算周数
    const weekNumber = Math.ceil((daysFromFirstDay + 1) / 7);
    
    return weekNumber;
  }

  /**
   * 🎯 长期解决方案：智能重置今日收入
   * 在应用启动时和每次查询时检查是否需要重置
   */
  async ensureTodayEarningsReset(providerId?: string) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    // 查询所有服务者或指定服务者
    const whereCondition = providerId 
      ? { id: providerId }
      : {};
    
    const providers = await this.prisma.provider.findMany({
      where: whereCondition,
      select: { 
        id: true, 
        todayEarnings: true,
        updatedAt: true
      }
    });
    
    let resetCount = 0;
    
    for (const provider of providers) {
      // 检查最后更新时间是否是今天之前
      const lastUpdate = new Date(provider.updatedAt);
      const lastUpdateDate = new Date(lastUpdate.getFullYear(), lastUpdate.getMonth(), lastUpdate.getDate());
      
      if (lastUpdateDate < today) {
        // 需要重置
        await this.prisma.provider.update({
          where: { id: provider.id },
          data: { 
            todayEarnings: 0,
            updatedAt: new Date()
          }
        });
        
        console.log(`🔄 重置服务者 ${provider.id} 的今日收入 (上次更新: ${lastUpdate.toISOString().split('T')[0]})`);
        resetCount++;
      }
    }
    
    return { count: resetCount };
  }

  /**
   * 🎯 获取准确的今日收入
   * 实时计算，确保数据准确性
   */
  async getAccurateTodayEarnings(providerId: string) {
    // 先确保今日收入已重置
    await this.ensureTodayEarningsReset(providerId);
    
    // 实时计算今日收入
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    const todayTransactions = await this.prisma.transaction.aggregate({
      where: {
        providerId,
        type: 'INCOME',
        createdAt: {
          gte: today,
          lt: tomorrow,
        },
      },
      _sum: {
        amount: true,
      },
    });
    
    const actualTodayEarnings = todayTransactions._sum.amount || 0;
    
    // 同步到 Provider 表
    await this.prisma.provider.update({
      where: { id: providerId },
      data: { todayEarnings: actualTodayEarnings },
    });
    
    return actualTodayEarnings;
  }

  /**
   * 重置每日收入（每天0点执行）
   */
  async resetDailyEarnings() {
    console.log('🔄 开始重置所有服务者今日收入...');
    
    const result = await this.prisma.provider.updateMany({
      where: {
        todayEarnings: {
          not: 0
        }
      },
      data: {
        todayEarnings: 0,
      },
    });
    
    console.log(`✅ 重置完成，影响 ${result.count} 个服务者`);
    return result;
  }
}
