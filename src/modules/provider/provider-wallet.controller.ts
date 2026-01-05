import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER']))
export class ProviderWalletController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('schedule')
  async getSchedule(@Req() req: any, @Query() query: { month?: string }) {
    const { month } = query;
    
    const provider = await this.prisma.provider.findFirst({
      where: { userId: req.user.id },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    // 解析月份参数，默认为当前月份
    const targetMonth = month ? new Date(month) : new Date();
    const startDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1);
    const endDate = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0);

    // 获取该月份的订单
    const orders = await this.prisma.order.findMany({
      where: {
        providerId: provider.id,
        serviceDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        service: true,
        user: true,
        address: true,
      },
      orderBy: {
        serviceDate: 'asc',
      },
    });

    // 获取服务者排班
    const schedules = await this.prisma.providerSchedule.findMany({
      where: {
        providerId: provider.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        date: 'asc',
      },
    });

    const data = {
      month: targetMonth.toISOString().slice(0, 7),
      orders: orders.map((order) => ({
        id: order.id,
        date: order.serviceDate.toISOString().split('T')[0],
        time: order.serviceTime,
        serviceName: order.service.name,
        customerName: order.user.nickname || order.user.phone,
        status: order.status,
        price: order.totalPrice,
        address: `${order.address.province} ${order.address.city} ${order.address.district}`,
      })),
      schedules: schedules.map((schedule) => ({
        date: schedule.date.toISOString().split('T')[0],
        slots: schedule.slots,
      })),
    };

    return ok(data);
  }

  @Get('wallet')
  async getWallet(@Req() req: any) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: req.user.id },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
        withdrawals: {
          where: { status: 'PENDING' },
        },
      },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    // 计算本月收入
    const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    const monthlyIncome = await this.prisma.transaction.aggregate({
      where: {
        providerId: provider.id,
        type: 'INCOME',
        createdAt: {
          gte: currentMonthStart,
        },
      },
      _sum: {
        amount: true,
      },
    });

    const data = {
      balance: provider.walletBalance,
      todayEarnings: provider.todayEarnings,
      monthlyEarnings: monthlyIncome._sum.amount || 0,
      pendingWithdrawals: provider.withdrawals.reduce((sum, w) => sum + w.amount.toNumber(), 0),
      transactions: provider.transactions.map((transaction) => ({
        id: transaction.id,
        type: transaction.type,
        amount: transaction.amount,
        beforeBalance: transaction.beforeBalance,
        afterBalance: transaction.afterBalance,
        createdAt: transaction.createdAt,
        description: this.getTransactionDescription(transaction),
      })),
    };

    return ok(data);
  }

  @Get('wallet/chart')
  async getWalletChart(@Req() req: any, @Query() query: { period?: 'week' | 'month' }) {
    const { period = 'week' } = query;
    
    const provider = await this.prisma.provider.findFirst({
      where: { userId: req.user.id },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    let startDate: Date;
    let labels: string[];
    let dateFormat: string;

    if (period === 'week') {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 6);
      labels = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];
      dateFormat = '%Y-%m-%d';
    } else {
      startDate = new Date();
      startDate.setDate(startDate.getDate() - 29);
      labels = Array.from({ length: 30 }, (_, i) => `${i + 1}日`);
      dateFormat = '%Y-%m-%d';
    }

    // 获取收入数据
    const incomeData = await this.prisma.$queryRaw`
      SELECT 
        DATE_FORMAT(created_at, ${dateFormat}) as date,
        SUM(amount) as amount
      FROM transaction 
      WHERE provider_id = ${provider.id} 
        AND type = 'INCOME'
        AND created_at >= ${startDate}
      GROUP BY DATE_FORMAT(created_at, ${dateFormat})
      ORDER BY date
    ` as Array<{ date: string; amount: bigint }>;

    // 填充数据
    const values = labels.map((label, index) => {
      const targetDate = period === 'week' 
        ? new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        : new Date(startDate.getTime() + index * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const dayData = incomeData.find(d => d.date === targetDate);
      return dayData ? Number(dayData.amount) : 0;
    });

    return ok({
      period,
      labels,
      values,
    });
  }

  private getTransactionDescription(transaction: any): string {
    switch (transaction.type) {
      case 'INCOME':
        return '订单收入';
      case 'WITHDRAWAL':
        return '提现';
      case 'REFUND':
        return '退款';
      default:
        return '其他';
    }
  }
}
