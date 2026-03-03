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
import { ProviderStatsService } from '../provider/provider-stats.service';
import { Decimal } from '@prisma/client/runtime/binary';

@Injectable()
export class OrderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditLogger,
    private readonly decimal: DecimalUtils,
    private readonly redis: RedisService,
    private readonly providerStats: ProviderStatsService,
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

    // 暂时移除同一时间订单冲突检查，允许同一时间创建多个订单
    // const conflict = await this.prisma.order.findFirst({
    //   where: {
    //     userId: input.userId,
    //     serviceDate,
    //     serviceTime: input.serviceTime,
    //     status: {
    //       in: [OrderStatus.PENDING, OrderStatus.ACCEPTED, OrderStatus.STARTED],
    //     },
    //   },
    // });
    // if (conflict) {
    //   throw new BadRequestException({
    //     message: '该时间已有订单',
    //   });
    // }

    const orderNo = `ORD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    return this.prisma.order.create({
      data: {
        orderNo,
        userId: input.userId,
        serviceId: input.serviceId,
        addressId: input.addressId,
        status: OrderStatus.PENDING, // 临时使用PENDING状态
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

  // 🎯 订单状态分组配置 (5个核心分组)
  private readonly ORDER_STATUS_GROUPS = {
    // 客户端状态分组
    pending: {
      label: '待接单',
      statuses: [OrderStatus.PENDING] as OrderStatus[],
      description: '已支付，等待服务者接单'
    },
    in_progress: {
      label: '进行中', 
      statuses: [OrderStatus.ACCEPTED, OrderStatus.ARRIVED, OrderStatus.STARTED] as OrderStatus[],
      description: '服务者已接单，正在进行服务'
    },
    completed: {
      label: '已完成',
      statuses: [OrderStatus.COMPLETED] as OrderStatus[], 
      description: '服务已完成，等待评价'
    },
    cancelled: {
      label: '已取消',
      statuses: [OrderStatus.CANCELED] as OrderStatus[],
      description: '订单已取消'
    },
    
    // 全部状态
    all: {
      label: '全部',
      statuses: [...Object.values(OrderStatus)] as OrderStatus[],
      description: '所有状态的订单'
    }
  };

  // 🔄 状态反向映射（从具体状态到分组）
  private readonly STATUS_TO_GROUP: Record<OrderStatus, string> = Object.values(OrderStatus).reduce((acc, status) => {
    for (const [groupKey, group] of Object.entries(this.ORDER_STATUS_GROUPS)) {
      if (group.statuses.includes(status as OrderStatus)) {
        acc[status] = groupKey;
        break;
      }
    }
    return acc;
  }, {} as Record<OrderStatus, string>);

  // 🛠️ 工具方法：获取状态分组信息
  getStatusGroup(groupKey: string) {
    const upperKey = groupKey.toUpperCase();
    return this.ORDER_STATUS_GROUPS[upperKey as keyof typeof this.ORDER_STATUS_GROUPS] || null;
  }

  // 🛠️ 工具方法：获取状态所属分组
  getStatusGroupForStatus(status: OrderStatus): string {
    return this.STATUS_TO_GROUP[status] || 'unknown';
  }

  // 🛠️ 工具方法：获取所有状态分组（用于前端下拉菜单等）
  getAllStatusGroups() {
    // 只返回客户端需要的5个核心分组，排除all分组（前端通常单独处理）
    const clientGroups = ['pending', 'in_progress', 'completed', 'cancelled'];
    return Object.entries(this.ORDER_STATUS_GROUPS)
      .filter(([key]) => clientGroups.includes(key))
      .map(([key, group]) => ({
        key,
        label: group.label,
        description: group.description,
        statuses: group.statuses
      }));
  }

  // 🛠️ 工具方法：获取状态显示文本（用于前端订单列表显示）
  getStatusDisplayText(status: OrderStatus): string {
    const statusTexts = {
      [OrderStatus.PENDING_PAYMENT]: '待支付',
      [OrderStatus.PENDING]: '待接单',
      [OrderStatus.ACCEPTED]: '已接单',
      [OrderStatus.ARRIVED]: '已到达',
      [OrderStatus.STARTED]: '服务中',
      [OrderStatus.COMPLETED]: '已完成',
      [OrderStatus.CANCELED]: '已取消'
    };
    return statusTexts[status] || status;
  }

  async listUserOrders(params: {
    userId: string;
    status?: string;
    page: number;
    pageSize: number;
  }) {
    console.log('🔍 listUserOrders params:', params);
    
    const where: Prisma.OrderWhereInput = {
      userId: params.userId,
    };
    
    if (params.status && params.status !== 'all') {
      const statusUpper = params.status.toUpperCase();
      console.log('🔍 statusUpper:', statusUpper);
      
      // 🎯 工程化状态分组查询 - 简化版本
      if (statusUpper === 'IN_PROGRESS') {
        where.status = { in: [OrderStatus.ACCEPTED, OrderStatus.ARRIVED, OrderStatus.STARTED] };
        console.log('🔍 where.status (IN_PROGRESS):', where.status);
      } else if (statusUpper === 'PENDING') {
        where.status = OrderStatus.PENDING;
        console.log('🔍 where.status (PENDING):', where.status);
      } else if (statusUpper === 'COMPLETED') {
        where.status = OrderStatus.COMPLETED;
        console.log('🔍 where.status (COMPLETED):', where.status);
      } else if (statusUpper === 'CANCELLED') {
        where.status = OrderStatus.CANCELED;
        console.log('🔍 where.status (CANCELLED):', where.status);
      } else {
        // 兼容单状态查询
        where.status = statusUpper as OrderStatus;
        console.log('🔍 single status where.status:', where.status);
      }
    }

    console.log('🔍 final where clause:', where);

    try {
      const [list, total] = await Promise.all([
        this.prisma.order.findMany({
          where,
          include: {
            service: true,
            provider: true,
            address: true,
          },
          orderBy: { createdAt: 'desc' },
          skip: (params.page - 1) * params.pageSize,
          take: params.pageSize,
        }),
        this.prisma.order.count({ where }),
      ]);

      console.log('🔍 query results:', { listLength: list.length, total });
      return { list, total };
    } catch (error) {
      console.error('❌ Prisma query error:', error);
      console.error('❌ Error details:', {
        message: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : 'No stack trace',
        where: where
      });
      throw error;
    }
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
          status: OrderStatus.PENDING, // 支付成功后状态改为待接单
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
    reason: 'auto_cancel' | 'manual_cancel';
    description: string;
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

    // PENDING_PAYMENT状态的订单取消时，直接取消
    // PENDING状态的订单取消时，需要考虑退款逻辑
    const remark = input.reason === 'auto_cancel' 
      ? `系统自动取消: ${input.description}`
      : `用户取消: ${input.description}`;

    await this.changeStatusWithLog({
      orderId: order.id,
      oldStatus: order.status,
      newStatus: OrderStatus.CANCELED,
      operatorId: input.userId,
      operatorRole: UserRole.CUSTOMER,
      remark,
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
      include: { user: true }
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
      select: {
        id: true,
        orderNo: true,
        status: true,
        totalPrice: true,
        serviceDate: true,
        serviceTime: true,
        specialRequests: true,
        duration: true,
        createdAt: true,
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            images: true
          }
        },
        address: {
          select: {
            id: true,
            contactName: true,
            phone: true,
            fullAddress: true,
            province: true,
            city: true,
            district: true,
            detail: true,
            latitude: true,
            longitude: true
          }
        },
        user: {
          select: {
            id: true,
            nickname: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!order) {
      return null;
    }

    // 计算距离 - 使用模拟数据
    const distance = this.calculateMockDistance(order.id);

    // 返回和抢单池相同的数据结构
    return {
      // 基础订单信息
      id: order.id,
      orderNo: order.orderNo,
      status: order.status,
      price: order.totalPrice,
      serviceDate: order.serviceDate,
      serviceTime: order.serviceTime,
      specialRequests: order.specialRequests,
      duration: order.duration,
      createdAt: order.createdAt,

      // 服务信息
      service: {
        id: order.service.id,
        name: order.service.name,
        category: order.service.category,
        price: order.service.price,
        images: order.service.images
      },

      // 地址信息
      address: {
        id: order.address.id,
        contactName: order.address.contactName,
        phone: order.address.phone,
        fullAddress: order.address.fullAddress || 
          `${order.address.province || ''}${order.address.city || ''}${order.address.district || ''}${order.address.detail || ''}`,
        latitude: order.address.latitude,
        longitude: order.address.longitude
      },

      // 用户信息
      customer: {
        id: order.user.id,
        nickname: order.user.nickname,
        phone: order.user.phone
      },

      // 计算的距离信息
      distance: distance,
      distanceText: `${distance}km`
    };
  }

  async listIncomingOrders(providerUserId: string) {
    // 获取服务者信息
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
      include: { user: true }
    });

    const list = await this.prisma.order.findMany({
      where: { status: OrderStatus.PENDING },
      take: 20,
      select: {
        id: true,
        orderNo: true,
        status: true,
        totalPrice: true,
        serviceDate: true,
        serviceTime: true,
        specialRequests: true,
        duration: true,
        createdAt: true,
        service: {
          select: {
            id: true,
            name: true,
            category: true,
            price: true,
            images: true
          }
        },
        address: {
          select: {
            id: true,
            contactName: true,
            phone: true,
            fullAddress: true,
            province: true,
            city: true,
            district: true,
            detail: true,
            latitude: true,
            longitude: true
          }
        },
        user: {
          select: {
            id: true,
            nickname: true,
            phone: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 丰富返回数据，添加距离计算和格式化
    return list.map(order => {
      // 计算距离 - 使用模拟数据，实际项目中应该：
      // 1. 从Provider模型获取服务者当前位置
      // 2. 或者从实时位置服务获取
      // 3. 或者使用服务者最后活跃位置
      const distance = this.calculateMockDistance(order.id);
      
      return {
        // 基础订单信息
        id: order.id,
        orderNo: order.orderNo,
        status: order.status,
        price: order.totalPrice, // 使用totalPrice字段
        serviceDate: order.serviceDate,
        serviceTime: order.serviceTime,
        specialRequests: order.specialRequests,
        duration: order.duration,
        createdAt: order.createdAt,

        // 服务信息
        service: {
          id: order.service.id,
          name: order.service.name,
          category: order.service.category,
          price: order.service.price,
          images: order.service.images
        },

        // 地址信息
        address: {
          id: order.address.id,
          contactName: order.address.contactName,
          phone: order.address.phone,
          fullAddress: order.address.fullAddress || 
            `${order.address.province || ''}${order.address.city || ''}${order.address.district || ''}${order.address.detail || ''}`,
          latitude: order.address.latitude,
          longitude: order.address.longitude
        },

        // 用户信息
        customer: {
          id: order.user.id,
          nickname: order.user.nickname,
          phone: order.user.phone
        },

        // 计算的距离信息
        distance: distance,
        distanceText: `${distance}km`
      };
    });
  }

  // 🛠️ 工具方法：模拟距离计算（实际项目中应该使用真实的距离计算）
  private calculateMockDistance(orderId: string): number {
    // 为不同订单生成模拟距离，让前端看到不同的距离数据
    const hash = orderId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const distance = (hash % 50) + 1; // 1-50km的随机距离
    return Math.round(distance * 10) / 10; // 保留1位小数
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

    // 生成服务者收入交易记录
    await this.prisma.$transaction(async (tx) => {
      // 获取服务者当前余额
      const currentProvider = await tx.provider.findUnique({
        where: { id: provider.id },
        select: { 
          walletBalance: true,
          withdrawableBalance: true
        }
      });

      const beforeBalance = currentProvider?.walletBalance || new Decimal(0);
      const beforeWithdrawable = currentProvider?.withdrawableBalance || new Decimal(0);
      const afterBalance = beforeBalance.add(order.totalPrice);
      const afterWithdrawable = beforeWithdrawable.add(order.totalPrice);

      // 更新订单状态
      await tx.order.update({
        where: { id: order.id },
        data: { status: OrderStatus.COMPLETED },
      });

      // 生成交易记录
      await tx.transaction.create({
        data: {
          type: 'INCOME',
          amount: order.totalPrice,
          beforeBalance: beforeBalance,
          afterBalance: afterBalance,
          providerId: provider.id,
          orderId: order.id,
        },
      });

      // 更新服务者余额（只更新余额相关字段）
      await tx.provider.update({
        where: { id: provider.id },
        data: { 
          walletBalance: afterBalance,
          withdrawableBalance: afterWithdrawable,
        },
      });

      // 记录状态变更日志
      await tx.orderOperationLog.create({
        data: {
          orderId: order.id,
          operatorId: provider.id,
          operatorRole: UserRole.PROVIDER,
          oldStatus: order.status,
          newStatus: OrderStatus.COMPLETED,
          remark: '服务完成',
        },
      });

      // 🎯 更新服务者每日统计（在事务中执行）
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dailyStats = await tx.providerDailyStats.upsert({
        where: {
          providerId_date: {
            providerId: provider.id,
            date: today,
          },
        },
        update: {
          orderCount: {
            increment: 1,
          },
          orderAmount: {
            increment: order.totalPrice.toNumber(),
          },
          earnings: {
            increment: order.totalPrice.toNumber(),
          },
        },
        create: {
          providerId: provider.id,
          date: today,
          orderCount: 1,
          orderAmount: order.totalPrice.toNumber(),
          earnings: order.totalPrice.toNumber(),
          orderTypes: {
            service_completion: 1,
          },
        },
      });

      // 更新订单类型统计
      const currentOrderTypes = (dailyStats.orderTypes as any) || {};
      currentOrderTypes['service_completion'] = (currentOrderTypes['service_completion'] || 0) + 1;

      await tx.providerDailyStats.update({
        where: { id: dailyStats.id },
        data: {
          orderTypes: currentOrderTypes,
        },
      });

      // 更新服务者总统计
      await tx.provider.update({
        where: { id: provider.id },
        data: {
          totalOrders: {
            increment: 1,
          },
          totalRevenue: {
            increment: order.totalPrice.toNumber(),
          },
          todayEarnings: {
            increment: order.totalPrice.toNumber(),
          },
        },
      });
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


