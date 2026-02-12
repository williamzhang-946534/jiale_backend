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

    // 获取所有服务数据
    const allServices = await this.prisma.service.findMany({
      where: { status: 'active' },
      include: { category: true },
      orderBy: { priority: 'desc' }
    });

    const data = categories.map((category) => ({
      id: category.id,
      name: category.name,
      items: category.children.map((child) => ({
        id: child.id,
        name: child.name,
        items: allServices.filter(service => service.categoryId === child.id)
          .map(service => ({
            id: service.id,
            name: service.name,
            price: service.price.toNumber(),
            unit: service.unit,
            images: service.images,
            description: service.description,
            tags: service.tags,
            isSpecial: service.isSpecial,
            isFeatured: service.isFeatured,
            isRecommended: service.isRecommended,
            isPackage: service.isPackage,
            badge: service.badge,
            priority: service.priority,
            rating: 4.5
          }))
      }))
    }));

    return ok(data);
  }
}
