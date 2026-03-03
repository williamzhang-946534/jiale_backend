import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  TransactionType,
  UserRole,
  WithdrawalStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../shared/services/prisma.service';
import { DecimalUtils } from '../shared/utils/decimal-utils';
import { AuditLogger } from '../shared/utils/audit-logger';

@Injectable()
export class FinanceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly decimal: DecimalUtils,
    private readonly audit: AuditLogger,
  ) {}

  async applyWithdrawal(
    providerUserId: string,
    amount: number,
    bankInfo: string,
  ) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });
    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }
    const amt = new Prisma.Decimal(amount);
    if (amt.lte(0)) {
      throw new BadRequestException({ message: '金额必须大于0' });
    }
    if (!this.decimal.gte(provider.walletBalance, amt)) {
      throw new BadRequestException({ message: '余额不足' });
    }

    return this.prisma.$transaction(async (tx) => {
      const before = provider.walletBalance;
      const after = before.minus(amt);

      await tx.provider.update({
        where: { id: provider.id },
        data: { walletBalance: after },
      });

      const withdrawal = await tx.withdrawal.create({
        data: {
          providerId: provider.id,
          amount: amt,
          actualAmount: amt,
          status: WithdrawalStatus.PENDING,
          bankInfo,
        },
      });

      await tx.transaction.create({
        data: {
          type: TransactionType.WITHDRAWAL,
          amount: amt.negated(),
          beforeBalance: before,
          afterBalance: after,
          providerId: provider.id,
          withdrawalId: withdrawal.id,
        },
      });

      await this.audit.log({
        module: 'finance',
        action: 'withdraw_apply',
        operatorId: provider.id,
        operatorRole: UserRole.PROVIDER,
        entityId: withdrawal.id,
      });

      return withdrawal;
    });
  }

  async auditWithdrawal(params: {
    adminId: string;
    id: string;
    action: 'approve' | 'reject';
  }) {
    // 使用withdrawal_records表而不是旧的withdrawal表
    const withdrawal = await (this.prisma as any).withdrawalRecord.findUnique({
      where: { id: params.id },
    });
    if (!withdrawal) {
      throw new NotFoundException({ message: '提现申请不存在' });
    }

    if (params.action === 'reject') {
      if (withdrawal.status === 'REJECTED' || withdrawal.status === 'COMPLETED') {
        return withdrawal;
      }
      
      // 拒绝提现：恢复可提现余额
      return this.prisma.$transaction(async (tx) => {
        // 更新提现状态
        const updatedWithdrawal = await (tx as any).withdrawalRecord.update({
          where: { id: withdrawal.id },
          data: { 
            status: 'REJECTED',
            failureReason: '管理员拒绝',
            processedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // 恢复服务者的可提现余额
        const amount = Number(withdrawal.amount);
        await tx.provider.update({
          where: { id: withdrawal.providerId },
          data: {
            withdrawableBalance: {
              increment: amount,
            },
          },
        });

        // 创建冲正交易记录
        await tx.transaction.create({
          data: {
            type: TransactionType.REFUND,
            amount: amount,
            beforeBalance: Number(withdrawal.actualAmount) + amount,
            afterBalance: Number(withdrawal.actualAmount) + amount + amount,
            providerId: withdrawal.providerId,
            withdrawalId: withdrawal.id,
          },
        });

        // 记录审计日志
        await this.audit.log({
          module: 'finance',
          action: 'withdrawal_reject',
          operatorId: params.adminId,
          operatorRole: 'ADMIN',
          entityId: withdrawal.id,
          detail: {
            amount,
            reason: '管理员拒绝',
          },
        });

        return updatedWithdrawal;
      });
    }

    // 审核通过逻辑
    if (withdrawal.status === 'PENDING') {
      return (this.prisma as any).withdrawalRecord.update({
        where: { id: withdrawal.id },
        data: {
          status: 'PROCESSING', // 使用PROCESSING而不是PENDING_REVIEW
          processedAt: new Date(),
          updatedAt: new Date(),
        },
      });
    }
    
    if (withdrawal.status === 'PROCESSING') {
      return this.prisma.$transaction(async (tx) => {
        // 最终审核通过：减少总钱包余额
        const updatedWithdrawal = await (tx as any).withdrawalRecord.update({
          where: { id: withdrawal.id },
          data: {
            status: 'COMPLETED', // 使用COMPLETED而不是APPROVED
            processedAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // 获取服务者当前余额
        const provider = await tx.provider.findUnique({
          where: { id: withdrawal.providerId },
          select: { walletBalance: true }
        });

        if (!provider) {
          throw new NotFoundException({ message: '服务者不存在' });
        }

        const beforeBalance = Number(provider.walletBalance);
        const amount = Number(withdrawal.amount);
        const afterBalance = beforeBalance - amount;

        // 减少服务者的总钱包余额（关键修复！）
        await tx.provider.update({
          where: { id: withdrawal.providerId },
          data: {
            walletBalance: afterBalance,
          },
        });

        // 创建交易记录
        await tx.transaction.create({
          data: {
            type: TransactionType.WITHDRAWAL,
            amount: -amount, // 负数表示扣除
            beforeBalance: beforeBalance,
            afterBalance: afterBalance,
            providerId: withdrawal.providerId,
            withdrawalId: withdrawal.id,
          },
        });

        // 记录审计日志
        await this.audit.log({
          module: 'finance',
          action: 'withdrawal_approve',
          operatorId: params.adminId,
          operatorRole: 'ADMIN',
          entityId: withdrawal.id,
          detail: {
            amount,
            beforeBalance,
            afterBalance,
          },
        });

        return updatedWithdrawal;
      });
    }
    
    return withdrawal;
  }

  async refundOrder(params: {
    adminId: string;
    orderId: string;
    amount: number;
    reason: string;
    type: 'full' | 'partial';
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: params.orderId },
    });
    if (!order) {
      throw new NotFoundException({ message: '订单不存在' });
    }
    if (!order.paidAt || order.paidAmount.lte(0)) {
      throw new BadRequestException({ message: '订单未支付不可退款' });
    }
    if (
      order.status !== OrderStatus.CANCELED &&
      order.status !== OrderStatus.COMPLETED
    ) {
      throw new BadRequestException({ message: '该状态不可退款' });
    }

    const reqAmount =
      params.type === 'full'
        ? order.paidAmount
        : new Prisma.Decimal(params.amount);

    if (reqAmount.lte(0)) {
      throw new BadRequestException({ message: '退款金额必须大于0' });
    }
    if (reqAmount.gt(order.paidAmount)) {
      throw new BadRequestException({ message: '退款金额不能超过已支付金额' });
    }

    await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: order.userId },
      });
      if (!user) {
        throw new NotFoundException({ message: '用户不存在' });
      }

      const before = user.walletBalance;
      const after = before.plus(reqAmount);

      await tx.user.update({
        where: { id: user.id },
        data: { walletBalance: after },
      });

      await tx.transaction.create({
        data: {
          type: TransactionType.REFUND,
          amount: reqAmount,
          beforeBalance: before,
          afterBalance: after,
          userId: user.id,
          orderId: order.id,
        },
      });

      await this.audit.log({
        module: 'finance',
        action: 'order_refund',
        operatorId: params.adminId,
        operatorRole: UserRole.ADMIN,
        entityId: order.id,
        detail: {
          amount: reqAmount.toNumber(),
          reason: params.reason,
          type: params.type,
        },
      });
    });
  }
}


