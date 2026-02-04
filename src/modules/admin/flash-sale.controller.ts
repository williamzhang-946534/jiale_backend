import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';

@ApiTags('闪购秒杀管理')
@Controller('admin/v1/flash-sale')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
@ApiBearerAuth()
export class FlashSaleAdminController {
  constructor(private readonly prisma: PrismaService) {}

  // ==================== 闪购场次管理 ====================

  @Get('sessions')
  @ApiOperation({ summary: '获取闪购场次列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getSessions(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('date') date?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limit = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * limit;

    const where: any = {};
    if (date) {
      where.date = date;
    }
    if (status) {
      where.status = status;
    }

    const [sessions, total] = await Promise.all([
      this.prisma.flashSaleSession.findMany({
        where,
        include: {
          products: {
            include: {
              service: {
                select: {
                  id: true,
                  name: true,
                  images: true,
                },
              },
            },
            orderBy: { sortOrder: 'asc' },
          },
        },
        orderBy: [
          { date: 'desc' },
          { sortOrder: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.flashSaleSession.count({ where }),
    ]);

    return ok({
      items: sessions.map((session) => ({
        id: session.id,
        date: session.date,
        startTime: session.startTime,
        endTime: session.endTime,
        status: session.status,
        sortOrder: session.sortOrder,
        products: session.products.map((product) => ({
          id: product.id,
          serviceId: product.serviceId,
          service: product.service,
          flashPrice: product.flashPrice.toNumber(),
          stockTotal: product.stockTotal,
          stockSold: product.stockSold,
          sortOrder: product.sortOrder,
        })),
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      })),
      total,
      page: pageNum,
      pageSize: limit,
    });
  }

  @Post('sessions')
  @ApiOperation({ summary: '创建闪购场次' })
  @ApiResponse({ status: 200, description: '成功' })
  async createSession(@Body() body: {
    date: number;
    startTime: string;
    endTime: string;
    sortOrder?: number;
    status?: string;
  }) {
    const { date, startTime, endTime, sortOrder = 1, status = 'upcoming' } = body;

    // 验证时间戳
    if (!date || date <= 0) {
      throw new BadRequestException('日期时间戳无效');
    }

    // 验证时间格式 HH:mm
    const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
    if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
      throw new BadRequestException('时间格式无效，请使用 HH:mm 格式');
    }

    // 验证开始时间早于结束时间
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    if (startMinutes >= endMinutes) {
      throw new BadRequestException('开始时间必须早于结束时间');
    }

    // 检查同日期时间段冲突
    const existing = await this.prisma.flashSaleSession.findFirst({
      where: {
        date,
        OR: [
          {
            AND: [
              { startTime: { lt: endTime } },
              { endTime: { gte: endTime } },
            ],
          },
          {
            AND: [
              { startTime: { gte: startTime } },
              { endTime: { lte: endTime } },
            ],
          },
        ],
      },
    });

    if (existing) {
      throw new BadRequestException('该时间段已存在闪购场次');
    }

    const now = Date.now();
    const session = await this.prisma.flashSaleSession.create({
      data: {
        date,
        startTime,
        endTime,
        sortOrder,
        status,
        createdAt: now,
        updatedAt: now,
      },
    });

    return ok({
      id: session.id,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      sortOrder: session.sortOrder,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  }

  @Put('sessions/:id')
  @ApiOperation({ summary: '更新闪购场次' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateSession(
    @Param('id') id: string,
    @Body() body: {
      date?: number;
      startTime?: string;
      endTime?: string;
      sortOrder?: number;
      status?: string;
    },
  ) {
    const existing = await this.prisma.flashSaleSession.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new BadRequestException('闪购场次不存在');
    }

    // 如果更新时间，需要验证
    if (body.date || body.startTime || body.endTime) {
      const date = body.date || existing.date;
      const startTime = body.startTime || existing.startTime;
      const endTime = body.endTime || existing.endTime;

      // 验证时间戳
      if (body.date && (!body.date || body.date <= 0)) {
        throw new BadRequestException('日期时间戳无效');
      }

      // 验证时间格式
      const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])$/;
      if (!timeRegex.test(startTime) || !timeRegex.test(endTime)) {
        throw new BadRequestException('时间格式无效，请使用 HH:mm 格式');
      }

      // 验证时间逻辑
      const [startHour, startMin] = startTime.split(':').map(Number);
      const [endHour, endMin] = endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;
      
      if (startMinutes >= endMinutes) {
        throw new BadRequestException('开始时间必须早于结束时间');
      }

      // 检查时间冲突（排除自己）
      const conflict = await this.prisma.flashSaleSession.findFirst({
        where: {
          date,
          id: { not: id },
          OR: [
            {
              AND: [
                { startTime: { lte: startTime } },
                { endTime: { gt: startTime } },
              ],
            },
            {
              AND: [
                { startTime: { lt: endTime } },
                { endTime: { gte: endTime } },
              ],
            },
            {
              AND: [
                { startTime: { gte: startTime } },
                { endTime: { lte: endTime } },
              ],
            },
          ],
        },
      });

      if (conflict) {
        throw new BadRequestException('该时间段已存在其他闪购场次');
      }
    }

    const updateData: any = {};
    if (body.date !== undefined) updateData.date = body.date;
    if (body.startTime !== undefined) updateData.startTime = body.startTime;
    if (body.endTime !== undefined) updateData.endTime = body.endTime;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.status !== undefined) updateData.status = body.status;
    updateData.updatedAt = Date.now();

    const session = await this.prisma.flashSaleSession.update({
      where: { id },
      data: updateData,
    });

    return ok({
      id: session.id,
      date: session.date,
      startTime: session.startTime,
      endTime: session.endTime,
      status: session.status,
      sortOrder: session.sortOrder,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
    });
  }

  @Delete('sessions/:id')
  @ApiOperation({ summary: '删除闪购场次' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteSession(@Param('id') id: string) {
    const existing = await this.prisma.flashSaleSession.findUnique({
      where: { id },
      include: {
        products: true,
      },
    });
    if (!existing) {
      throw new BadRequestException('闪购场次不存在');
    }

    if (existing.products.length > 0) {
      throw new BadRequestException('该场次下还有商品，无法删除');
    }

    await this.prisma.flashSaleSession.delete({
      where: { id },
    });

    return ok({ success: true, message: '删除成功' });
  }

  // ==================== 闪购商品管理 ====================

  @Get('products')
  @ApiOperation({ summary: '获取闪购商品列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getProducts(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('sessionId') sessionId?: string,
    @Query('serviceId') serviceId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limit = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * limit;

    const where: any = {};
    if (sessionId) {
      where.sessionId = sessionId;
    }
    if (serviceId) {
      where.serviceId = serviceId;
    }

    const [products, total] = await Promise.all([
      this.prisma.flashSaleProduct.findMany({
        where,
        include: {
          session: {
            select: {
              id: true,
              date: true,
              startTime: true,
              endTime: true,
              status: true,
            },
          },
          service: {
            select: {
              id: true,
              name: true,
              images: true,
              category: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: [
          { session: { date: 'desc' } },
          { sortOrder: 'asc' },
        ],
        skip,
        take: limit,
      }),
      this.prisma.flashSaleProduct.count({ where }),
    ]);

    return ok({
      items: products.map((product) => ({
        id: product.id,
        sessionId: product.sessionId,
        session: product.session,
        serviceId: product.serviceId,
        service: product.service,
        flashPrice: product.flashPrice.toNumber(),
        stockTotal: product.stockTotal,
        stockSold: product.stockSold,
        sortOrder: product.sortOrder,
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
      })),
      total,
      page: pageNum,
      pageSize: limit,
    });
  }

  @Post('products')
  @ApiOperation({ summary: '创建闪购商品' })
  @ApiResponse({ status: 200, description: '成功' })
  async createProduct(@Body() body: {
    sessionId: string;
    serviceId: string;
    flashPrice: number;
    stockTotal: number;
    sortOrder?: number;
  }) {
    const { sessionId, serviceId, flashPrice, stockTotal, sortOrder = 1 } = body;

    // 验证场次是否存在
    const session = await this.prisma.flashSaleSession.findUnique({
      where: { id: sessionId },
    });
    if (!session) {
      throw new BadRequestException('闪购场次不存在');
    }

    // 验证服务是否存在
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new BadRequestException('服务不存在');
    }

    // 验证价格
    if (flashPrice <= 0) {
      throw new BadRequestException('闪购价格必须大于0');
    }
    if (flashPrice >= service.price.toNumber()) {
      throw new BadRequestException('闪购价格必须小于原价');
    }

    // 验证库存
    if (stockTotal <= 0) {
      throw new BadRequestException('库存必须大于0');
    }

    // 检查同场次同服务是否已存在
    const existing = await this.prisma.flashSaleProduct.findFirst({
      where: {
        sessionId,
        serviceId,
      },
    });
    if (existing) {
      throw new BadRequestException('该服务在此场次中已存在');
    }

    const now = Date.now();
    const product = await this.prisma.flashSaleProduct.create({
      data: {
        sessionId,
        serviceId,
        flashPrice,
        stockTotal,
        stockSold: 0,
        sortOrder,
        createdAt: now,
        updatedAt: now,
      },
      include: {
        session: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            images: true,
            category: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return ok({
      id: product.id,
      sessionId: product.sessionId,
      session: product.session,
      serviceId: product.serviceId,
      service: product.service,
      flashPrice: product.flashPrice.toNumber(),
      stockTotal: product.stockTotal,
      stockSold: product.stockSold,
      sortOrder: product.sortOrder,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  }

  @Put('products/:id')
  @ApiOperation({ summary: '更新闪购商品' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateProduct(
    @Param('id') id: string,
    @Body() body: {
      flashPrice?: number;
      stockTotal?: number;
      sortOrder?: number;
    },
  ) {
    const existing = await this.prisma.flashSaleProduct.findUnique({
      where: { id },
      include: {
        service: true,
      },
    });
    if (!existing) {
      throw new BadRequestException('闪购商品不存在');
    }

    // 验证价格
    if (body.flashPrice !== undefined) {
      if (body.flashPrice <= 0) {
        throw new BadRequestException('闪购价格必须大于0');
      }
      if (body.flashPrice >= existing.service.price.toNumber()) {
        throw new BadRequestException('闪购价格必须小于原价');
      }
    }

    // 验证库存
    if (body.stockTotal !== undefined) {
      if (body.stockTotal <= 0) {
        throw new BadRequestException('库存必须大于0');
      }
      if (body.stockTotal < existing.stockSold) {
        throw new BadRequestException('库存不能小于已售数量');
      }
    }

    const updateData: any = {};
    if (body.flashPrice !== undefined) updateData.flashPrice = body.flashPrice;
    if (body.stockTotal !== undefined) updateData.stockTotal = body.stockTotal;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;

    const product = await this.prisma.flashSaleProduct.update({
      where: { id },
      data: updateData,
      include: {
        session: {
          select: {
            id: true,
            date: true,
            startTime: true,
            endTime: true,
            status: true,
          },
        },
        service: {
          select: {
            id: true,
            name: true,
            images: true,
            category: {
              select: { id: true, name: true },
            },
          },
        },
      },
    });

    return ok({
      id: product.id,
      sessionId: product.sessionId,
      session: product.session,
      serviceId: product.serviceId,
      service: product.service,
      flashPrice: product.flashPrice.toNumber(),
      stockTotal: product.stockTotal,
      stockSold: product.stockSold,
      sortOrder: product.sortOrder,
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
    });
  }

  @Delete('products/:id')
  @ApiOperation({ summary: '删除闪购商品' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteProduct(@Param('id') id: string) {
    const existing = await this.prisma.flashSaleProduct.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new BadRequestException('闪购商品不存在');
    }

    if (existing.stockSold > 0) {
      throw new BadRequestException('该商品已有销售记录，无法删除');
    }

    await this.prisma.flashSaleProduct.delete({
      where: { id },
    });

    return ok({ success: true, message: '删除成功' });
  }

  // ==================== 辅助接口 ====================

  @Get('available-services')
  @ApiOperation({ summary: '获取可选服务列表（用于创建闪购商品）' })
  @ApiResponse({ status: 200, description: '成功' })
  async getAvailableServices(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
    @Query('sessionId') sessionId?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limit = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * limit;

    const where: any = {
      status: 'active',
    };

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
    }

    // 如果指定了场次，排除该场次已有的服务
    if (sessionId) {
      const existingServiceIds = (
        await this.prisma.flashSaleProduct.findMany({
          where: { sessionId },
          select: { serviceId: true },
        })
      ).map((product) => product.serviceId);

      if (existingServiceIds.length > 0) {
        where.id = { notIn: existingServiceIds };
      }
    }

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.service.count({ where }),
    ]);

    return ok({
      items: services.map((service) => ({
        id: service.id,
        name: service.name,
        description: service.description,
        price: service.price.toNumber(),
        unit: service.unit,
        images: service.images,
        category: service.category,
        createdAt: service.createdAt,
      })),
      total,
      page: pageNum,
      pageSize: limit,
    });
  }
}
