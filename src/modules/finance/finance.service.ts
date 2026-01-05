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
    const withdrawal = await this.prisma.withdrawal.findUnique({
      where: { id: params.id },
    });
    if (!withdrawal) {
      throw new NotFoundException({ message: '提现申请不存在' });
    }

    if (params.action === 'reject') {
      if (
        withdrawal.status === WithdrawalStatus.REJECTED ||
        withdrawal.status === WithdrawalStatus.APPROVED
      ) {
        return withdrawal;
      }
      return this.prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: { status: WithdrawalStatus.REJECTED },
      });
    }

    if (withdrawal.status === WithdrawalStatus.PENDING) {
      return this.prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: WithdrawalStatus.PENDING_REVIEW,
          firstReviewerId: params.adminId,
        },
      });
    }
    if (withdrawal.status === WithdrawalStatus.PENDING_REVIEW) {
      return this.prisma.withdrawal.update({
        where: { id: withdrawal.id },
        data: {
          status: WithdrawalStatus.APPROVED,
          secondReviewerId: params.adminId,
          reviewedAt: new Date(),
        },
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


