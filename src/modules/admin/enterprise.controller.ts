import {
  Controller,
  Get,
  Query,
  UseGuards,
  Patch,
  Param,
  Body,
  Post,
  Put,
  Delete,
  BadRequestException,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { ok } from '../shared/types/api-response';

@ApiTags('企业定制管理')
@ApiBearerAuth()
@Controller('admin/v1/enterprise')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminEnterpriseController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('inquiries')
  @ApiOperation({ summary: '企业定制询价列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async list(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const status = query.status as string | undefined;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [list, total] = await Promise.all([
      this.prisma.enterpriseInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.enterpriseInquiry.count({ where }),
    ]);

    return ok({ list, total, page, pageSize });
  }

  @Patch('inquiries/:id/status')
  @ApiOperation({ summary: '更新询价状态' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; assignedSalesId?: string },
  ) {
    const updated = await this.prisma.enterpriseInquiry.update({
      where: { id },
      data: {
        status: body.status,
        assignedSalesId: body.assignedSalesId,
        updatedAt: Math.floor(Date.now() / 1000),
      },
    });
    return ok(updated);
  }

  // ========== 企业服务分类管理接口 ==========

  @Get('categories')
  @ApiOperation({ summary: '获取企业服务分类列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getCategories(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const status = query.status as string | undefined;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [categories, total] = await Promise.all([
      this.prisma.enterpriseServiceCategory.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.enterpriseServiceCategory.count({ where }),
    ]);

    return ok({ 
      list: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        description: cat.description,
        icon: cat.icon,
        sortOrder: cat.sortOrder,
        status: cat.status,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
      total, 
      page, 
      pageSize 
    });
  }

  @Post('categories')
  @ApiOperation({ summary: '创建企业服务分类' })
  @ApiResponse({ status: 200, description: '成功' })
  async createCategory(@Body() body: {
    name: string;
    description?: string;
    icon?: string;
    sortOrder?: number;
    status?: string;
  }) {
    const { name, description, icon, sortOrder = 1, status = 'active' } = body;

    if (!name) {
      throw new BadRequestException('分类名称不能为空');
    }

    // 检查名称是否重复
    const existing = await this.prisma.enterpriseServiceCategory.findFirst({
      where: { name },
    });
    if (existing) {
      throw new BadRequestException('分类名称已存在');
    }

    const now = Math.floor(Date.now() / 1000);
    const category = await this.prisma.enterpriseServiceCategory.create({
      data: {
        name,
        description,
        icon,
        sortOrder,
        status,
        createdAt: now,
        updatedAt: now,
      },
    });

    return ok({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }

  @Put('categories/:id')
  @ApiOperation({ summary: '更新企业服务分类' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateCategory(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      description?: string;
      icon?: string;
      sortOrder?: number;
      status?: string;
    },
  ) {
    // 检查分类是否存在
    const existing = await this.prisma.enterpriseServiceCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new BadRequestException('分类不存在');
    }

    // 如果更新名称，检查是否重复
    if (body.name && body.name !== existing.name) {
      const nameExists = await this.prisma.enterpriseServiceCategory.findFirst({
        where: { 
          name: body.name,
          id: { not: id }
        },
      });
      if (nameExists) {
        throw new BadRequestException('分类名称已存在');
      }
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.icon !== undefined) updateData.icon = body.icon;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.status !== undefined) updateData.status = body.status;
    updateData.updatedAt = Math.floor(Date.now() / 1000);

    const category = await this.prisma.enterpriseServiceCategory.update({
      where: { id },
      data: updateData,
    });

    return ok({
      id: category.id,
      name: category.name,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '删除企业服务分类' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteCategory(@Param('id') id: string) {
    // 检查分类是否存在
    const existing = await this.prisma.enterpriseServiceCategory.findUnique({
      where: { id },
      include: {
        services: true,
      },
    });
    if (!existing) {
      throw new BadRequestException('分类不存在');
    }

    // 检查是否有关联的服务
    if (existing.services.length > 0) {
      throw new BadRequestException('该分类下存在服务，无法删除');
    }

    await this.prisma.enterpriseServiceCategory.delete({
      where: { id },
    });

    return ok({ success: true });
  }
}
