import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  OrderStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import { PrismaService } from '../shared/services/prisma.service';
import { AuditLogger } from '../shared/utils/audit-logger';
import { DecimalUtils } from '../shared/utils/decimal-utils';
import { RedisService } from '../shared/services/redis.service';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogger,
    private readonly decimal: DecimalUtils,
    private readonly redis: RedisService,
  ) {}

  async calculatePrice(input: {
    userId: string;
    serviceId: string;
    dates: string[];
    duration: number;
  }) {
    const service = await this.prisma.service.findUnique({
      where: { id: input.serviceId },
    });
    if (!service) {
      throw new NotFoundException({
        message: '服务不存在',
      });
    }

    const base = service.price;
    const originalPrice = base.mul(input.duration * input.dates.length);
    const discount = new Prisma.Decimal(0);
    const totalPrice = originalPrice.minus(discount);
    return {
      originalPrice: originalPrice.toNumber(),
      discount: discount.toNumber(),
      totalPrice: totalPrice.toNumber(),
      priceBreakdown: '配置化规则计算结果',
    };
  }

  async createOrder(input: {
    userId: string;
    serviceId: string;
    addressId: string;
    serviceDate: string;
    serviceTime: string;
    specialRequests?: string;
  }) {
    const [service, address] = await Promise.all([
      this.prisma.service.findUnique({ where: { id: input.serviceId } }),
      this.prisma.address.findUnique({
        where: { id: input.addressId },
      }),
    ]);
    if (!service) {
      throw new NotFoundException({
        message: '服务不存在',
      });
    }
    if (!address || address.userId !== input.userId) {
      throw new BadRequestException({
        message: '地址无效',
      });
    }

    const originalPrice = service.price;
    const discount = new Prisma.Decimal(0);
    const totalPrice = originalPrice.minus(discount);

    const serviceDate = new Date(input.serviceDate);

    const conflict = await this.prisma.order.findFirst({
      where: {
        userId: input.userId,
        serviceDate,
        serviceTime: input.serviceTime,
        status: {
          in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.STARTED],
        },
      },
    });
    if (conflict) {
      throw new BadRequestException({
        message: '该时间已有订单',
      });
    }

    const orderNo = `ORD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    return this.prisma.order.create({
      data: {
        orderNo,
        userId: input.userId,
        serviceId: input.serviceId,
        addressId: input.addressId,
        status: OrderStatus.PENDING,
        serviceDate,
        serviceTime: input.serviceTime,
        originalPrice,
        discount,
        totalPrice,
        specialRequests: input.specialRequests,
        timeline: {
          created: new Date().toISOString(),
        } as any,
      },
    });
  }

  async listUserOrders(params: {
    userId: string;
    status?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.OrderWhereInput = {
      userId: params.userId,
    };
    if (params.status && params.status !== 'all') {
      where.status = params.status as OrderStatus;
    }

    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { list, total };
  }

  async getOrderDetailForUser(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { service: true, provider: true, address: true },
    });
    if (!order || order.userId !== userId) {
      throw new NotFoundException({
        message: '订单不存在',
      });
    }
    return {
      ...order,
      timeline: order.timeline,
    };
  }

  async payOrder(input: {
    userId: string;
    orderId: string;
    traceId: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
    });
    if (!order || order.userId !== input.userId) {
      throw new NotFoundException({
        message: '订单不存在',
      });
    }

    if (order.paidAmount.greaterThan(0)) {
      return { orderId: order.id, paid: true };
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const user = await tx.user.findUnique({
        where: { id: input.userId },
      });
      if (!user) {
        throw new NotFoundException({
          message: '用户不存在',
        });
      }

      const enough = this.decimal.gte(user.walletBalance, order.totalPrice);
      if (!enough) {
        throw new BadRequestException({
          message: '余额不足',
        });
      }

      const before = user.walletBalance;
      const after = before.minus(order.totalPrice);

      await tx.user.update({
        where: { id: user.id },
        data: { walletBalance: after },
      });

      const paidOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount: order.totalPrice,
          paidAt: new Date(),
        },
      });

      await tx.transaction.create({
        data: {
          type: 'INCOME',
          amount: order.totalPrice.negated(),
          beforeBalance: before,
          afterBalance: after,
          userId: user.id,
          orderId: order.id,
        },
      });

      await this.audit.log({
        module: 'order',
        action: 'pay',
        operatorId: user.id,
        operatorRole: UserRole.CUSTOMER,
        entityId: order.id,
        detail: { traceId: input.traceId },
      });

      return paidOrder;
    });

    return { orderId: updated.id, paid: true };
  }

  async cancelOrder(input: {
    userId: string;
    orderId: string;
    traceId: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
    });
    if (!order || order.userId !== input.userId) {
      throw new NotFoundException({
        message: '订单不存在',
      });
    }
    if (
      order.status === OrderStatus.STARTED ||
      order.status === OrderStatus.COMPLETED
    ) {
      throw new BadRequestException({
        message: '服务已开始，无法取消',
      });
    }
    if (order.status === OrderStatus.CANCELED) {
      return;
    }

    await this.changeStatusWithLog({
      orderId: order.id,
      oldStatus: order.status,
      newStatus: OrderStatus.CANCELED,
      operatorId: input.userId,
      operatorRole: UserRole.CUSTOMER,
      remark: '用户取消',
    });
  }

  async reviewOrder(input: {
    userId: string;
    orderId: string;
    rating: number;
    content?: string;
  }) {
    const order = await this.prisma.order.findUnique({
      where: { id: input.orderId },
    });
    if (!order || order.userId !== input.userId) {
      throw new NotFoundException({
        message: '订单不存在',
      });
    }
    if (order.status !== OrderStatus.COMPLETED) {
      throw new BadRequestException({
        message: '订单未完成，无法评价',
      });
    }

    await this.prisma.orderReview.upsert({
      where: { orderId: order.id },
      create: {
        orderId: order.id,
        rating: input.rating,
        content: input.content,
      },
      update: {
        rating: input.rating,
        content: input.content,
      },
    });
  }

  async getActiveOrderForProvider(providerUserId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });
    if (!provider) {
      throw new NotFoundException({
        message: '服务者不存在',
      });
    }
    const order = await this.prisma.order.findFirst({
      where: {
        providerId: provider.id,
        status: {
          in: [OrderStatus.ACCEPTED, OrderStatus.ARRIVED, OrderStatus.STARTED],
        },
      },
      orderBy: { createdAt: 'desc' },
    });
    return order;
  }

  async listIncomingOrders(providerUserId: string) {
    const list = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING },
      take: 20,
    });
    return list;
  }

  async acceptOrder(providerUserId: string, orderId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });
    if (!provider) {
      throw new NotFoundException({
        message: '服务者不存在',
      });
    }

    const lockKey = `accept_order:${orderId}`;
    const result = await this.redis.withLock(lockKey, 2000, async () => {
      const order = await this.prisma.order.findUnique({
        where: { id: orderId },
      });
      if (!order) {
        throw new NotFoundException({
          message: '订单不存在',
        });
      }
      if (order.status !== OrderStatus.PENDING) {
        throw new BadRequestException({
          message: '订单不可抢',
        });
      }

      const updated = await this.changeStatusWithLog({
        orderId: order.id,
        oldStatus: order.status,
        newStatus: OrderStatus.ACCEPTED,
        operatorId: provider.id,
        operatorRole: UserRole.PROVIDER,
        remark: '抢单',
        extraUpdate: { provider: { connect: { id: provider.id } } },
      });
      return updated;
    });

    if (!result) {
      throw new BadRequestException({
        message: '订单正在被抢，请稍后重试',
      });
    }
  }

  async arriveOrder(providerUserId: string, orderId: string) {
    const { order, provider } =
      await this.ensureProviderOwnsOrder(providerUserId, orderId);
    if (order.status !== OrderStatus.ACCEPTED) {
      throw new BadRequestException({
        message: '只有已接单状态才能确认到达',
      });
    }
    await this.changeStatusWithLog({
      orderId: order.id,
      oldStatus: order.status,
      newStatus: OrderStatus.ARRIVED,
      operatorId: provider.id,
      operatorRole: UserRole.PROVIDER,
      remark: '到达现场',
    });
  }

  async startOrder(providerUserId: string, orderId: string) {
    const { order, provider } =
      await this.ensureProviderOwnsOrder(providerUserId, orderId);
    if (order.status !== OrderStatus.ARRIVED) {
      throw new BadRequestException({
        message: '只有已到达状态才能开始服务',
      });
    }
    await this.changeStatusWithLog({
      orderId: order.id,
      oldStatus: order.status,
      newStatus: OrderStatus.STARTED,
      operatorId: provider.id,
      operatorRole: UserRole.PROVIDER,
      remark: '开始服务',
    });
  }

  async completeOrder(providerUserId: string, orderId: string) {
    const { order, provider } =
      await this.ensureProviderOwnsOrder(providerUserId, orderId);
    if (order.status !== OrderStatus.STARTED) {
      throw new BadRequestException({
        message: '只有服务中状态才能完成',
      });
    }

    await this.changeStatusWithLog({
      orderId: order.id,
      oldStatus: order.status,
      newStatus: OrderStatus.COMPLETED,
      operatorId: provider.id,
      operatorRole: UserRole.PROVIDER,
      remark: '服务完成',
    });
  }

  async listAdminOrders(params: {
    status?: string;
    keyword?: string;
    page: number;
    pageSize: number;
  }) {
    const where: Prisma.OrderWhereInput = {};

    if (params.status && params.status !== 'all') {
      where.status = params.status as OrderStatus;
    }

    if (params.keyword) {
      where.OR = [
        { orderNo: { contains: params.keyword } },
        { user: { phone: { contains: params.keyword } } },
        { provider: { name: { contains: params.keyword } } },
      ];
    }

    const [list, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              nickname: true,
            },
          },
          provider: {
            select: {
              id: true,
              name: true,
              phone: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              price: true,
            },
          },
          address: {
            select: {
              id: true,
              contactName: true,
              phone: true,
              detail: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { list, total };
  }

  async assignOrder(params: {
    adminId: string;
    orderId: string;
    providerId: string;
  }) {
    const [order, provider] = await Promise.all([
      this.prisma.order.findUnique({ where: { id: params.orderId } }),
      this.prisma.provider.findUnique({ where: { id: params.providerId } }),
    ]);
    if (!order) {
      throw new NotFoundException({
        message: '订单不存在',
      });
    }
    if (!provider) {
      throw new NotFoundException({
        message: '服务者不存在',
      });
    }
    if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException({
        message: '仅待派单订单可手动指派',
      });
    }

    await this.changeStatusWithLog({
      orderId: order.id,
      oldStatus: order.status,
      newStatus: OrderStatus.ACCEPTED,
      operatorId: params.adminId,
      operatorRole: UserRole.ADMIN,
      remark: '后台指派',
      extraUpdate: { provider: { connect: { id: provider.id } } },
    });
  }

  private async ensureProviderOwnsOrder(providerUserId: string, orderId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });
    if (!provider) {
      throw new NotFoundException({
        message: '服务者不存在',
      });
    }
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order || order.providerId !== provider.id) {
      throw new NotFoundException({
        message: '订单不存在',
      });
    }
    return { order, provider };
  }

  private async changeStatusWithLog(params: {
    orderId: string;
    oldStatus: OrderStatus;
    newStatus: OrderStatus;
    operatorId: string;
    operatorRole: UserRole;
    remark?: string;
    extraUpdate?: Prisma.OrderUpdateInput;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: params.orderId },
        data: {
          status: params.newStatus,
          ...(params.extraUpdate || {}),
        },
      });

      await tx.orderOperationLog.create({
        data: {
          orderId: updated.id,
          operatorId: params.operatorId,
          operatorRole: params.operatorRole,
          oldStatus: params.oldStatus,
          newStatus: params.newStatus,
          remark: params.remark,
        },
      });

      await this.audit.log({
        module: 'order',
        action: 'status_change',
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        entityId: params.orderId,
        detail: {
          from: params.oldStatus,
          to: params.newStatus,
        },
      });

      return updated;
    });
  }
}


