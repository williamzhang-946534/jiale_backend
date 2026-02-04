import {
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
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminCategoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  async getCategories() {
    // 获取所有一级分类（parentId为null）
    const topLevelCategories = await this.prisma.serviceCategory.findMany({
      where: {
        parentId: null
      },
      include: {
        children: {
          include: {
            _count: {
              select: {
                services: true,
              },
            },
          },
          orderBy: {
            sortOrder: 'asc',
          },
        },
        _count: {
          select: {
            services: true,
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    // 转换数据结构，确保只返回一级分类，二级分类在children中
    const formattedCategories = topLevelCategories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon,
      sortOrder: category.sortOrder,
      parentId: category.parentId,
      serviceCount: category._count.services,
      children: category.children.map(child => ({
        id: child.id,
        name: child.name,
        icon: child.icon,
        sortOrder: child.sortOrder,
        parentId: child.parentId,
        serviceCount: child._count.services,
        // 二级分类不能有子分类，所以不包含children
      })),
    }));

    return ok(formattedCategories);
  }

  @Post('categories')
  async createCategory(@Body() body: {
    name: string;
    parentId?: string;
    icon?: string;
    sortOrder?: number;
  }) {
    const { name, parentId, icon, sortOrder = 1 } = body;

    // 验证父分类是否存在
    if (parentId) {
      const parent = await this.prisma.serviceCategory.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new Error('父分类不存在');
      }
      
      // 检查父分类是否已经是二级分类（不能有parentId）
      if (parent.parentId) {
        throw new Error('二级分类不能添加子分类');
      }
    }

    const category = await this.prisma.serviceCategory.create({
      data: {
        name,
        parentId,
        icon,
        sortOrder,
      },
    });

    return ok(category);
  }

  @Put('categories/:id')
  async updateCategory(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      parentId?: string;
      icon?: string;
      sortOrder?: number;
    },
  ) {
    const { name, parentId, icon, sortOrder } = body;

    // 验证分类是否存在
    const existingCategory = await this.prisma.serviceCategory.findUnique({
      where: { id },
    });
    if (!existingCategory) {
      throw new Error('分类不存在');
    }

    // 验证父分类是否存在且不是自己
    if (parentId && parentId !== existingCategory.parentId) {
      if (parentId === id) {
        throw new Error('不能将自己设为父分类');
      }
      const parent = await this.prisma.serviceCategory.findUnique({
        where: { id: parentId },
      });
      if (!parent) {
        throw new Error('父分类不存在');
      }
      
      // 检查父分类是否已经是二级分类（不能有parentId）
      if (parent.parentId) {
        throw new Error('二级分类不能添加子分类');
      }
    }

    const category = await this.prisma.serviceCategory.update({
      where: { id },
      data: {
        name,
        parentId,
        icon,
        sortOrder,
      },
    });

    return ok(category);
  }

  @Delete('categories/:id')
  async deleteCategory(@Param('id') id: string) {
    // 检查是否有子分类
    const childrenCount = await this.prisma.serviceCategory.count({
      where: { parentId: id },
    });
    if (childrenCount > 0) {
      throw new Error('该分类下还有子分类，无法删除');
    }

    // 检查是否有关联的服务
    const servicesCount = await this.prisma.service.count({
      where: { categoryId: id },
    });
    if (servicesCount > 0) {
      throw new Error('该分类下还有服务，无法删除');
    }

    await this.prisma.serviceCategory.delete({
      where: { id },
    });

    return ok(null);
  }
}
