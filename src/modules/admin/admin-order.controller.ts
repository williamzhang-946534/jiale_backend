import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminOrderController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('orders')
  async getOrders(@Query() query: {
    page?: number;
    pageSize?: number;
    status?: string;
    orderNo?: string;
    dateRange?: { start: string; end: string };
  }) {
    const {
      page = 1,
      pageSize = 20,
      status,
      orderNo,
      dateRange,
    } = query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (orderNo) {
      where.orderNo = { contains: orderNo };
    }

    if (dateRange) {
      const { start, end } = dateRange;
      where.createdAt = {
        gte: new Date(start),
        lte: new Date(end),
      };
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
              unit: true,
            },
          },
          address: true,
          reviews: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.order.count({ where }),
    ]);

    return ok({
      list,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('orders/:id')
  async getOrderDetail(@Param('id') id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        provider: true,
        service: true,
        address: true,
        reviews: true,
        orderLogs: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!order) {
      throw new Error('订单不存在');
    }

    // 构建时间轴
    const timeline: any = {
      created: order.createdAt.toISOString(),
      accepted: null,
      arrived: null,
      started: null,
      completed: null,
    };

    order.orderLogs.forEach((log) => {
      switch (log.newStatus) {
        case 'ACCEPTED':
          timeline.accepted = log.createdAt.toISOString();
          break;
        case 'ARRIVED':
          timeline.arrived = log.createdAt.toISOString();
          break;
        case 'STARTED':
          timeline.started = log.createdAt.toISOString();
          break;
        case 'COMPLETED':
          timeline.completed = log.createdAt.toISOString();
          break;
      }
    });

    const data = {
      ...order,
      timeline,
    };

    return ok(data);
  }

  @Post('orders/:id/assign')
  async assignOrder(
    @Param('id') id: string,
    @Body() body: { providerId: string },
    @Req() req: any,
  ) {
    const { providerId } = body;

    // 验证订单是否存在
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    if (!order) {
      throw new Error('订单不存在');
    }

    // 验证服务者是否存在且已认证
    const provider = await this.prisma.provider.findUnique({
      where: { id: providerId },
    });
    if (!provider || provider.status !== 'VERIFIED') {
      throw new Error('服务者不存在或未认证');
    }

    // 更新订单
    const updatedOrder = await this.prisma.order.update({
      where: { id },
      data: {
        providerId,
        status: 'ACCEPTED',
      },
      include: {
        user: true,
        provider: true,
        service: true,
      },
    });

    // 记录操作日志
    await this.prisma.orderOperationLog.create({
      data: {
        orderId: id,
        operatorId: req.user.id,
        operatorRole: 'ADMIN',
        oldStatus: order.status,
        newStatus: 'ACCEPTED',
        remark: `管理员指派服务者: ${provider.name}`,
      },
    });

    return ok(updatedOrder);
  }
}
