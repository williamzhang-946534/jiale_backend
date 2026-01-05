import { Controller, Get, Query } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { Provider } from '@prisma/client';

@Controller('v1')
export class HomeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('home/banners')
  async banners() {
    const data = await this.prisma.banner.findMany({
      orderBy: { sortOrder: 'asc' },
    });
    return ok({ data });
  }

  @Get('home/quick-entries')
  async quickEntries() {
    return ok({
      data: [
        {
          id: 'gold_matron',
          name: '金牌月嫂',
          icon: '👑',
          targetCategoryId: 'nanny',
        },
      ],
    });
  }

  @Get('home/providers')
  async homeProviders(@Query() query: any) {
    void query;
    const providers = await this.prisma.provider.findMany({
      take: 20,
    });
    return ok({
      data: providers.map((p: Provider) => ({
        id: p.id,
        name: p.name,
        role: '金牌月嫂',
        avatar: p.avatarUrl,
        rating: p.rating?.toNumber() ?? 5.0,
        distance: '2.5km',
        tags: [],
      })),
    });
  }

  @Get('home/special-offers')
  async specialOffers() {
    // 获取限时特惠服务，这里简单返回一些标记为特价的服务
    const services = await this.prisma.service.findMany({
      where: {
        status: 'active',
        tags: {
          hasSome: ['特价', '限时', '优惠'],
        },
      },
      take: 10,
      include: {
        category: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // 如果没有标记为特价的服务，返回一些最新的服务作为推荐
    if (services.length === 0) {
      const defaultServices = await this.prisma.service.findMany({
        where: {
          status: 'active',
        },
        take: 10,
        include: {
          category: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return ok({
        data: defaultServices.map((service) => ({
          id: service.id,
          name: service.name,
          categoryName: service.category.name,
          price: service.price,
          originalPrice: service.price.toNumber() * 1.2, // 模拟原价
          discount: 0.8, // 8折
          unit: service.unit,
          image: service.images[0] || '',
          tags: [...service.tags, '推荐'],
        })),
      });
    }

    return ok({
      data: services.map((service) => ({
        id: service.id,
        name: service.name,
        categoryName: service.category.name,
        price: service.price,
        originalPrice: service.price.toNumber() * 1.2, // 模拟原价
        discount: 0.8, // 8折
        unit: service.unit,
        image: service.images[0] || '',
        tags: service.tags,
      })),
    });
  }
}


