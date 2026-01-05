import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('v1')
export class CategoryController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories/tree')
  async getCategoriesTree() {
    const categories = await this.prisma.serviceCategory.findMany({
      where: {
        parentId: null, // 只获取顶级分类
      },
      include: {
        children: {
          orderBy: {
            sortOrder: 'asc',
          },
        },
      },
      orderBy: {
        sortOrder: 'asc',
      },
    });

    const data = categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: category.children.map((child) => ({
        id: child.id,
        name: child.name,
      })),
    }));

    return ok({ data });
  }
}
