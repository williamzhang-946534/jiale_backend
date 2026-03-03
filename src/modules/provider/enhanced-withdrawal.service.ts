import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';
import { DecimalUtils } from '../shared/utils/decimal-utils';
import { AuditLogger } from '../shared/utils/audit-logger';
import { ok } from '../shared/types/api-response';

type WithdrawalRecordStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

// 临时类型定义，等待Prisma生成
class PrismaDecimal {
  constructor(value: number | string) {
    // 简化实现，实际应该使用真正的Prisma.Decimal
    this._value = typeof value === 'number' ? value : parseFloat(value);
  }
  
  private _value: number;

  toNumber(): number {
    return this._value;
  }

  lt(value: PrismaDecimal | number): boolean {
    const other = value instanceof PrismaDecimal ? value._value : value;
    return this._value < other;
  }

  lte(value: PrismaDecimal | number): boolean {
    const other = value instanceof PrismaDecimal ? value._value : value;
    return this._value <= other;
  }

  gt(value: PrismaDecimal | number): boolean {
    const other = value instanceof PrismaDecimal ? value._value : value;
    return this._value > other;
  }

  gte(value: PrismaDecimal | number): boolean {
    const other = value instanceof PrismaDecimal ? value._value : value;
    return this._value >= other;
  }

  plus(value: PrismaDecimal | number): PrismaDecimal {
    const other = value instanceof PrismaDecimal ? value._value : value;
    return new PrismaDecimal(this._value + other);
  }

  minus(value: PrismaDecimal | number): PrismaDecimal {
    const other = value instanceof PrismaDecimal ? value._value : value;
    return new PrismaDecimal(this._value - other);
  }

  times(value: PrismaDecimal | number): PrismaDecimal {
    const other = value instanceof PrismaDecimal ? value._value : value;
    return new PrismaDecimal(this._value * other);
  }

  negated(): PrismaDecimal {
    return new PrismaDecimal(-this._value);
  }

  toString(): string {
    return this._value.toString();
  }
}

@Injectable()
export class EnhancedWithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly decimal: DecimalUtils,
    private readonly audit: AuditLogger,
  ) {}

  /**
   * 申请提现
   */
  async applyWithdrawal(providerUserId: string, data: {
    amount: number;
    bankCardId: string;
    remark?: string;
  }) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    // 验证银行卡 - 使用现有结构
    const bankCard = await this.prisma.bankCard.findFirst({
      where: {
        id: data.bankCardId,
        providerId: provider.id,
        status: 'ACTIVE',
      },
    });

    if (!bankCard) {
      throw new NotFoundException({ message: '银行卡不存在或已冻结' });
    }

    // 验证提现金额
    const amount = data.amount;
    if (amount <= 0) {
      throw new BadRequestException({ message: '提现金额必须大于0' });
    }

    // 最低提现金额：10元
    if (amount < 10) {
      throw new BadRequestException({ message: '最低提现金额为10元' });
    }

    // 最高提现金额：单日5万元
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const todayWithdrawals = await this.prisma.withdrawalRecord.aggregate({
      where: {
        providerId: provider.id,
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: { not: 'CANCELLED' },
      },
      _sum: { amount: true },
    });

    const todayTotal = Number(todayWithdrawals._sum.amount?.toNumber?.() || todayWithdrawals._sum.amount || 0);
    const dailyLimit = 50000;
    if (todayTotal + amount > dailyLimit) {
      throw new BadRequestException({ message: '单日提现金额不能超过5万元' });
    }

    // 检查余额充足
    const currentBalance = Number(provider.withdrawableBalance?.toNumber?.() || provider.withdrawableBalance || 0);
    if (currentBalance < amount) {
      throw new BadRequestException({ message: '可提现余额不足' });
    }

    // 计算手续费
    const fee = this.calculateWithdrawalFee(amount);
    const actualAmount = amount - fee;

    // 生成提现订单号
    const orderId = this.generateOrderId();

    // 预计到账时间
    const estimatedArrival = this.calculateEstimatedArrival();

    return this.prisma.$transaction(async (tx) => {
      // 更新服务者余额
      const before = currentBalance;
      const after = before - amount;

      await tx.provider.update({
        where: { id: provider.id },
        data: { withdrawableBalance: after },
      });

      // 创建提现记录
      const withdrawalRecord = await tx.withdrawalRecord.create({
        data: {
          providerId: provider.id,
          orderId,
          amount,
          fee,
          actualAmount,
          bankCardId: data.bankCardId,
          bankInfo: {
            bankName: bankCard.bankName,
            maskedCardNumber: bankCard.maskedCardNumber,
            cardHolder: bankCard.cardHolder,
          },
          status: 'PENDING',
          estimatedArrival,
          remark: data.remark,
        },
      });

      // 更新银行卡最后使用时间
      await (tx as any).bankCard.update({
        where: { id: data.bankCardId },
        data: { lastUsedAt: new Date() },
      });

      // 暂时跳过交易记录创建，因为表结构不匹配
      // await tx.transaction.create({
      //   data: {
      //     type: 'WITHDRAWAL',
      //     amount: -amount, // 负数表示扣除
      //     beforeBalance: before,
      //     afterBalance: after,
      //     providerId: provider.id,
      //     withdrawalId: withdrawalRecord.id,
      //   },
      // });

      // 记录审计日志
      await this.audit.log({
        module: 'finance',
        action: 'withdrawal_apply',
        operatorId: provider.id,
        operatorRole: 'PROVIDER',
        entityId: withdrawalRecord.id,
        detail: {
          amount,
          fee,
          actualAmount,
          bankCardId: data.bankCardId,
        },
      });

      return ok({
        id: withdrawalRecord.id,
        orderId: withdrawalRecord.orderId,
        amount,
        fee,
        actualAmount,
        estimatedArrival: withdrawalRecord.estimatedArrival,
        status: withdrawalRecord.status,
      });
    });
  }

  /**
   * 获取提现记录列表
   */
  async getWithdrawalHistory(providerUserId: string, query: {
    page?: number;
    limit?: number;
    status?: WithdrawalRecordStatus;
    startDate?: string;
    endDate?: string;
  }) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));
    const skip = (page - 1) * limit;

    // 构建查询条件
    const where: any = { providerId: provider.id };

    if (query.status) {
      where.status = query.status;
    }

    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) {
        where.createdAt.gte = new Date(query.startDate);
      }
      if (query.endDate) {
        where.createdAt.lte = new Date(query.endDate);
      }
    }

    // 获取总数
    const total = await this.prisma.withdrawalRecord.count({ where });

    // 获取记录
    const records = await this.prisma.withdrawalRecord.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      select: {
        id: true,
        orderId: true,
        amount: true,
        fee: true,
        actualAmount: true,
        bankInfo: true,
        status: true,
        estimatedArrival: true,
        createdAt: true,
        completedAt: true,
        remark: true,
      },
    });

    const totalPages = Math.ceil(total / limit);

    return ok({
      records: records.map((record: any) => ({
        ...record,
        amount: Number(record.amount?.toNumber?.() || record.amount || 0),
        fee: Number(record.fee?.toNumber?.() || record.fee || 0),
        actualAmount: Number(record.actualAmount?.toNumber?.() || record.actualAmount || 0),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }

  /**
   * 获取提现详情
   */
  async getWithdrawalDetail(providerUserId: string, withdrawalId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    const withdrawal = await this.prisma.withdrawalRecord.findFirst({
      where: {
        id: withdrawalId,
        providerId: provider.id,
      },
      select: {
        id: true,
        orderId: true,
        amount: true,
        fee: true,
        actualAmount: true,
        bankInfo: true,
        status: true,
        failureReason: true,
        estimatedArrival: true,
        remark: true,
        createdAt: true,
        processedAt: true,
        completedAt: true,
        bankCard: {
          select: {
            id: true,
            bankName: true,
            maskedCardNumber: true,
            cardHolder: true,
          },
        },
      },
    });

    if (!withdrawal) {
      throw new NotFoundException({ message: '提现记录不存在' });
    }

    return ok({
      ...withdrawal,
      amount: Number(withdrawal.amount?.toNumber?.() || withdrawal.amount || 0),
      fee: Number(withdrawal.fee?.toNumber?.() || withdrawal.fee || 0),
      actualAmount: Number(withdrawal.actualAmount?.toNumber?.() || withdrawal.actualAmount || 0),
    });
  }

  /**
   * 取消提现申请
   */
  async cancelWithdrawal(providerUserId: string, withdrawalId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    const withdrawal = await this.prisma.withdrawalRecord.findFirst({
      where: {
        id: withdrawalId,
        providerId: provider.id,
      },
    });

    if (!withdrawal) {
      throw new NotFoundException({ message: '提现记录不存在' });
    }

    if (withdrawal.status !== 'PENDING') {
      throw new BadRequestException({ message: '只能取消待处理的提现申请' });
    }

    return this.prisma.$transaction(async (tx) => {
      // 更新提现状态
      await tx.withdrawalRecord.update({
        where: { id: withdrawalId },
        data: {
          status: 'CANCELLED',
          updatedAt: new Date(),
        },
      });

      // 恢复余额
      const amount = Number(withdrawal.amount?.toNumber?.() || withdrawal.amount || 0);
      const providerBalance = Number(provider.withdrawableBalance?.toNumber?.() || provider.withdrawableBalance || 0);
      
      await tx.provider.update({
        where: { id: provider.id },
        data: {
          withdrawableBalance: {
            increment: amount,
          },
        },
      });

      // 创建冲正交易记录
      await tx.transaction.create({
        data: {
          type: 'WITHDRAWAL',
          amount: amount, // 正数表示冲正
          beforeBalance: providerBalance,
          afterBalance: providerBalance + amount,
          providerId: provider.id,
          withdrawalId: withdrawal.id,
        },
      });

      // 记录审计日志
      await this.audit.log({
        module: 'finance',
        action: 'withdrawal_cancel',
        operatorId: provider.id,
        operatorRole: 'PROVIDER',
        entityId: withdrawalId,
        detail: {
          amount,
        },
      });

      return ok(null);
    });
  }

  /**
   * 计算提现手续费
   */
  calculateWithdrawalFee(amount: number): number {
    // 手续费规则：2元 + 0.1%，最低2元，最高50元
    const baseFee = 2;
    const percentageFee = amount * 0.001; // 0.1%
    const totalFee = baseFee + percentageFee;

    // 最低2元，最高50元
    if (totalFee < 2) {
      return 2;
    }
    if (totalFee > 50) {
      return 50;
    }

    return totalFee;
  }

  /**
   * 获取手续费计算结果
   */
  async getWithdrawalFee(amount: number) {
    if (amount <= 0) {
      throw new BadRequestException({ message: '金额必须大于0' });
    }

    const fee = this.calculateWithdrawalFee(amount);
    const actualAmount = amount - fee;

    return ok({
      amount,
      fee,
      actualAmount,
      feeRule: '2元 + 0.1%，最低2元，最高50元',
    });
  }

  /**
   * 生成提现订单号
   */
  private generateOrderId(): string {
    const now = new Date();
    const dateStr = now.getFullYear().toString() + 
                   (now.getMonth() + 1).toString().padStart(2, '0') + 
                   now.getDate().toString().padStart(2, '0');
    const timeStr = now.getTime().toString().slice(-6);
    const randomStr = Math.random().toString().slice(-4);
    return `WD${dateStr}${timeStr}${randomStr}`;
  }

  /**
   * 计算预计到账时间
   */
  private calculateEstimatedArrival(): string {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay();

    // 检查是否在工作时间 (工作日 9:00-17:00)
    const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
    const isWorkingHours = hour >= 9 && hour < 17;

    if (isWeekday && isWorkingHours) {
      return '1-2个工作日';
    } else if (isWeekday) {
      return '2-3个工作日';
    } else {
      return '2-3个工作日';
    }
  }
}
