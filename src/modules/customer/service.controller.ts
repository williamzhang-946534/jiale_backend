import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('v1')
export class ServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('services')
  async getServices(@Query() query: {
    categoryId?: string;
    subCategoryId?: string;
    sort?: string;
    filter?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      categoryId,
      subCategoryId,
      sort = 'comprehensive',
      filter,
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {
      status: 'active',
    };

    if (subCategoryId) {
      where.categoryId = subCategoryId;
    } else if (categoryId) {
      where.category = {
        parentId: categoryId,
      };
    }

    if (filter) {
      where.tags = {
        hasSome: [filter],
      };
    }

    // 排序逻辑
    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'sales':
        orderBy = { orders: { _count: 'desc' } };
        break;
      case 'price_asc':
        orderBy = { price: 'asc' };
        break;
      case 'price_desc':
        orderBy = { price: 'desc' };
        break;
      case 'comprehensive':
      default:
        orderBy = { createdAt: 'desc' };
        break;
    }

    const [list, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.service.count({ where }),
    ]);

    const data = list.map((service) => ({
      id: service.id,
      name: service.name,
      categoryId: service.categoryId,
      categoryName: service.category.name,
      price: service.price,
      unit: service.unit,
      images: service.images,
      description: service.description,
      tags: service.tags,
      sales: service._count.orders,
      rating: 4.5 + Math.random() * 0.5, // 模拟评分
    }));

    return ok({
      list: data,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('providers/list')
  async getProvidersList(@Query() query: {
    categoryId?: string;
    subCategoryId?: string;
    sort?: string;
    page?: number;
    pageSize?: number;
  }) {
    const {
      categoryId,
      subCategoryId,
      sort = 'comprehensive',
      page = 1,
      pageSize = 20,
    } = query;

    const where: any = {
      status: 'VERIFIED',
    };

    // 排序逻辑
    let orderBy: any = { createdAt: 'desc' };
    switch (sort) {
      case 'rating':
        orderBy = { rating: 'desc' };
        break;
      case 'orders':
        orderBy = { orders: { _count: 'desc' } };
        break;
      case 'price_asc':
        orderBy = { createdAt: 'desc' };
        break;
      case 'price_desc':
        orderBy = { createdAt: 'desc' };
        break;
      case 'comprehensive':
      default:
        orderBy = { rating: 'desc' };
        break;
    }

    const [list, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        include: {
          user: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy,
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.provider.count({ where }),
    ]);

    const data = list.map((provider) => ({
      id: provider.id,
      name: provider.name,
      score: provider.rating?.toNumber() || 4.5,
      price: 45 + Math.floor(Math.random() * 100), // 模拟价格
      unit: '小时',
      orders: provider._count.orders,
      description: provider.intro || '专注家政服务多年，经验丰富',
      tags: ['经验丰富', '服务好'],
      isVerified: provider.status === 'VERIFIED',
      avatar: provider.avatarUrl,
    }));

    return ok({
      list: data,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Get('services/:id/detail')
  async getServiceDetail(@Param('id') id: string) {
    const service = await this.prisma.service.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!service) {
      throw new Error('服务不存在');
    }

    // 获取该服务分类下的服务者信息
    const providers = await this.prisma.provider.findMany({
      where: {
        status: 'VERIFIED',
      },
      take: 5,
      include: {
        user: true,
      },
    });

    const data = {
      baseInfo: {
        id: service.id,
        name: service.name,
        categoryId: service.categoryId,
        categoryName: service.category.name,
        price: service.price,
        unit: service.unit,
        images: service.images,
        description: service.description,
        tags: service.tags,
      },
      providers: providers.map((provider) => ({
        id: provider.id,
        name: provider.name,
        avatar: provider.avatarUrl,
        rating: provider.rating?.toNumber() || 4.5,
        intro: provider.intro,
        orders: 100 + Math.floor(Math.random() * 1000), // 模拟订单数
      })),
      standardDetail: {
        processSteps: [
          '预约确认',
          '上门服务',
          '专业清洁',
          '质量检查',
          '客户确认',
        ],
        comparisonImages: service.images.slice(0, 2),
      },
    };

    return ok(data);
  }

  @Get('services/:id/availability')
  async getServiceAvailability(@Param('id') id: string, @Query() query: { date?: string }) {
    const { date } = query;

    // 验证服务是否存在
    const service = await this.prisma.service.findUnique({
      where: { id },
    });
    if (!service) {
      throw new Error('服务不存在');
    }

    const targetDate = date ? new Date(date) : new Date();
    
    // 生成可用时间槽（这里简化处理，实际应该根据服务者的日程来计算）
    const timeSlots = [];
    const startHour = 8;
    const endHour = 20;
    
    for (let hour = startHour; hour < endHour; hour++) {
      const timeStr = `${hour.toString().padStart(2, '0')}:00`;
      // 随机生成一些不可用的时间槽来模拟真实情况
      const isAvailable = Math.random() > 0.3; // 70%的概率可用
      if (isAvailable) {
        timeSlots.push(timeStr);
      }
    }

    return ok({
      type: 'slots',
      date: targetDate.toISOString().split('T')[0],
      slots: timeSlots,
    });
  }
}
