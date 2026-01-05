import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('services')
  async getServices(@Query() query: {
    page?: number;
    pageSize?: number;
    categoryId?: string;
    keyword?: string;
  }) {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      keyword,
    } = query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
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
        orderBy: {
          createdAt: 'desc',
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.service.count({ where }),
    ]);

    return ok({
      list,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Post('services')
  async createService(@Body() body: {
    name: string;
    categoryId: string;
    price: number;
    unit: string;
    images?: string[];
    description?: string;
    tags?: string[];
    status?: string;
  }) {
    const {
      name,
      categoryId,
      price,
      unit,
      images = [],
      description,
      tags = [],
      status = 'active',
    } = body;

    // 验证分类是否存在
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error('分类不存在');
    }

    const service = await this.prisma.service.create({
      data: {
        name,
        categoryId,
        price,
        unit,
        images,
        description,
        tags,
        status,
      },
      include: {
        category: true,
      },
    });

    return ok(service);
  }

  @Put('services/:id')
  async updateService(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      categoryId?: string;
      price?: number;
      unit?: string;
      images?: string[];
      description?: string;
      tags?: string[];
      status?: string;
    },
  ) {
    const {
      name,
      categoryId,
      price,
      unit,
      images,
      description,
      tags,
      status,
    } = body;

    // 验证服务是否存在
    const existingService = await this.prisma.service.findUnique({
      where: { id },
    });
    if (!existingService) {
      throw new Error('服务不存在');
    }

    // 验证分类是否存在
    if (categoryId && categoryId !== existingService.categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new Error('分类不存在');
      }
    }

    const service = await this.prisma.service.update({
      where: { id },
      data: {
        name,
        categoryId,
        price,
        unit,
        images,
        description,
        tags,
        status,
      },
      include: {
        category: true,
      },
    });

    return ok(service);
  }

  @Patch('services/:id/status')
  async updateServiceStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const { status } = body;

    const service = await this.prisma.service.update({
      where: { id },
      data: { status },
      include: {
        category: true,
      },
    });

    return ok(service);
  }

  @Delete('services/:id')
  async deleteService(@Param('id') id: string) {
    // 检查是否有关联的订单
    const ordersCount = await this.prisma.order.count({
      where: { serviceId: id },
    });
    if (ordersCount > 0) {
      throw new Error('该服务下还有订单，无法删除');
    }

    await this.prisma.service.delete({
      where: { id },
    });

    return ok(null);
  }
}
