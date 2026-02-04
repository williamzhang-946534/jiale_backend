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

@ApiTags('新人专区管理')
@Controller('admin/v1/newcomer')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
@ApiBearerAuth()
export class NewcomerAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('offers')
  @ApiOperation({ summary: '获取新人专享服务列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getOffers(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('status') status?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limit = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * limit;

    const where = status ? { status } : {};

    const [offers, total] = await Promise.all([
      this.prisma.newcomerOffer.findMany({
        where,
        include: {
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
        orderBy: { sortOrder: 'asc' },
        skip,
        take: limit,
      }),
      this.prisma.newcomerOffer.count({ where }),
    ]);

    return ok({
      items: offers.map((offer) => ({
        id: offer.id,
        serviceId: offer.serviceId,
        service: offer.service,
        originalPrice: offer.originalPrice.toNumber(),
        newcomerPrice: offer.newcomerPrice.toNumber(),
        stockLimit: offer.stockLimit,
        claimedCount: offer.claimedCount,
        sortOrder: offer.sortOrder,
        status: offer.status,
        createdAt: offer.createdAt,
        updatedAt: offer.updatedAt,
      })),
      total,
      page: pageNum,
      pageSize: limit,
    });
  }

  @Post('offers')
  @ApiOperation({ summary: '创建新人专享服务' })
  @ApiResponse({ status: 200, description: '成功' })
  async createOffer(@Body() body: {
    serviceId: string;
    originalPrice: number;
    newcomerPrice: number;
    stockLimit: number;
    sortOrder?: number;
    status?: string;
  }) {
    const { serviceId, originalPrice, newcomerPrice, stockLimit, sortOrder = 1, status = 'active' } = body;

    // 验证服务是否存在
    const service = await this.prisma.service.findUnique({
      where: { id: serviceId },
    });
    if (!service) {
      throw new BadRequestException('服务不存在');
    }

    // 验证价格
    if (originalPrice <= 0 || newcomerPrice <= 0) {
      throw new BadRequestException('价格必须大于0');
    }
    if (newcomerPrice >= originalPrice) {
      throw new BadRequestException('新人价必须小于原价');
    }

    // 验证库存
    if (stockLimit <= 0) {
      throw new BadRequestException('库存必须大于0');
    }

    // 检查是否已存在该服务的专享活动
    const existing = await this.prisma.newcomerOffer.findFirst({
      where: { serviceId, status: 'active' },
    });
    if (existing) {
      throw new BadRequestException('该服务已存在专享活动');
    }

    const offer = await this.prisma.newcomerOffer.create({
      data: {
        serviceId,
        originalPrice,
        newcomerPrice,
        stockLimit,
        claimedCount: 0,
        sortOrder,
        status,
      },
      include: {
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
      id: offer.id,
      serviceId: offer.serviceId,
      service: offer.service,
      originalPrice: offer.originalPrice.toNumber(),
      newcomerPrice: offer.newcomerPrice.toNumber(),
      stockLimit: offer.stockLimit,
      claimedCount: offer.claimedCount,
      sortOrder: offer.sortOrder,
      status: offer.status,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    });
  }

  @Put('offers/:id')
  @ApiOperation({ summary: '更新新人专享服务' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateOffer(
    @Param('id') id: string,
    @Body() body: {
      originalPrice?: number;
      newcomerPrice?: number;
      stockLimit?: number;
      sortOrder?: number;
      status?: string;
    },
  ) {
    const existing = await this.prisma.newcomerOffer.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new BadRequestException('专享服务不存在');
    }

    // 验证价格
    if (body.originalPrice !== undefined && body.originalPrice <= 0) {
      throw new BadRequestException('原价必须大于0');
    }
    if (body.newcomerPrice !== undefined && body.newcomerPrice <= 0) {
      throw new BadRequestException('新人价必须大于0');
    }
    if (body.originalPrice !== undefined && body.newcomerPrice !== undefined && body.newcomerPrice >= body.originalPrice) {
      throw new BadRequestException('新人价必须小于原价');
    }
    if (body.originalPrice === undefined && body.newcomerPrice !== undefined && body.newcomerPrice >= existing.originalPrice.toNumber()) {
      throw new BadRequestException('新人价必须小于原价');
    }

    // 验证库存
    if (body.stockLimit !== undefined && body.stockLimit <= 0) {
      throw new BadRequestException('库存必须大于0');
    }
    if (body.stockLimit !== undefined && body.stockLimit < existing.claimedCount) {
      throw new BadRequestException('库存不能小于已领取数量');
    }

    const updateData: any = {};
    if (body.originalPrice !== undefined) updateData.originalPrice = body.originalPrice;
    if (body.newcomerPrice !== undefined) updateData.newcomerPrice = body.newcomerPrice;
    if (body.stockLimit !== undefined) updateData.stockLimit = body.stockLimit;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.status !== undefined) updateData.status = body.status;

    const offer = await this.prisma.newcomerOffer.update({
      where: { id },
      data: updateData,
      include: {
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
      id: offer.id,
      serviceId: offer.serviceId,
      service: offer.service,
      originalPrice: offer.originalPrice.toNumber(),
      newcomerPrice: offer.newcomerPrice.toNumber(),
      stockLimit: offer.stockLimit,
      claimedCount: offer.claimedCount,
      sortOrder: offer.sortOrder,
      status: offer.status,
      createdAt: offer.createdAt,
      updatedAt: offer.updatedAt,
    });
  }

  @Delete('offers/:id')
  @ApiOperation({ summary: '删除新人专享服务' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteOffer(@Param('id') id: string) {
    const existing = await this.prisma.newcomerOffer.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new BadRequestException('专享服务不存在');
    }

    // 检查是否已有用户领取
    if (existing.claimedCount > 0) {
      throw new BadRequestException('已有用户领取，无法删除');
    }

    await this.prisma.newcomerOffer.delete({
      where: { id },
    });

    return ok({ success: true, message: '删除成功' });
  }

  @Get('services')
  @ApiOperation({ summary: '获取可选服务列表（用于创建专享服务）' })
  @ApiResponse({ status: 200, description: '成功' })
  async getAvailableServices(
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('keyword') keyword?: string,
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const limit = pageSize ? parseInt(pageSize, 10) : 20;
    const skip = (pageNum - 1) * limit;

    const where = keyword
      ? {
          OR: [
            { name: { contains: keyword } },
            { description: { contains: keyword } },
          ],
        }
      : {};

    // 排除已有专享活动的服务
    const existingServiceIds = (
      await this.prisma.newcomerOffer.findMany({
        where: { status: 'active' },
        select: { serviceId: true },
      })
    ).map((offer) => offer.serviceId);

    const [services, total] = await Promise.all([
      this.prisma.service.findMany({
        where: {
          ...where,
          id: { notIn: existingServiceIds },
          status: 'active',
        },
        include: {
          category: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.service.count({
        where: {
          ...where,
          id: { notIn: existingServiceIds },
          status: 'active',
        },
      }),
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
