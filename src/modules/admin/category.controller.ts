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
    const categories = await this.prisma.serviceCategory.findMany({
      include: {
        parent: true,
        children: true,
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

    return ok({ data: categories });
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
