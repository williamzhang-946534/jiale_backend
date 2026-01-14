import { Controller, Get, Query, Post, Body, Patch, Param } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { ProviderType } from '@prisma/client';
import { 
  HomeInitResponseDto, 
  ServiceMatchDto, 
  ServiceRecommendationQueryDto,
  FlashSaleResponseDto,
  NewcomerClaimResponseDto,
  OrderCalendarQueryDto,
  OrderCalendarItemDto,
  FavoriteProviderQueryDto,
  SetDefaultAddressDto
} from '../shared/dto/home.dto';

@ApiTags('统一接口')
@ApiBearerAuth()
@Controller('v1')
export class UnifiedHomeController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('home/init')
  @ApiOperation({ summary: '获取首页综合数据' })
  @ApiResponse({ status: 200, description: '成功', type: HomeInitResponseDto })
  async homeInit() {
    // 并行获取所有首页数据
    const [banners, categories, specialOffers, featuredServices, featuredCards, packageDeals] = await Promise.all([
      this.getBanners(),
      this.getCategories(),
      this.getSpecialOffers(),
      this.getFeaturedServices(),
      this.getFeaturedCards(),
      this.getPackageDeals()
    ]);

    return ok({
      banners,
      categories,
      specialOffers,
      featuredServices,
      featuredCards,
      packageDeals
    });
  }

  @Post('services/match')
  @ApiOperation({ summary: '智能匹配服务者' })
  @ApiResponse({ status: 200, description: '匹配成功' })
  async serviceMatch(@Body() matchDto: ServiceMatchDto) {
    // 根据用户需求智能匹配服务者
    const providers = await this.prisma.provider.findMany({
      where: {
        status: 'VERIFIED',
        isBanned: false,
        providerTypes: {
          hasSome: [this.getServiceType(matchDto.serviceId) as any]
        }
      },
      include: {
        user: true
      },
      take: 10
    });

    // 这里可以添加更复杂的匹配逻辑（预算、地理位置等）
    const matchedProviders = providers.filter(provider => {
      // 简单的预算匹配逻辑
      if (matchDto.budgetRange) {
        const [min, max] = matchDto.budgetRange.split('-').map(Number);
        const salary = Number(provider.actualSalary || provider.expectedSalary || 0);
        return salary >= min && salary <= max;
      }
      return true;
    });

    return ok({
      data: matchedProviders.map(provider => ({
        id: provider.id,
        name: provider.name,
        avatar: provider.avatarUrl,
        rating: provider.rating?.toNumber() || 5.0,
        experience: provider.experience,
        intro: provider.intro,
        expectedSalary: provider.expectedSalary,
        serviceTypes: provider.providerTypes,
        hometown: provider.hometown
      }))
    });
  }

  @Get('services/recommendations')
  async getServiceRecommendations(@Query() query: ServiceRecommendationQueryDto) {
    // 获取推荐配套服务
    const currentService = await this.prisma.service.findUnique({
      where: { id: query.serviceId },
      include: { category: true }
    });

    if (!currentService) {
      return ok({ data: [] });
    }

    // 获取同类别的其他服务
    const recommendations = await this.prisma.service.findMany({
      where: {
        categoryId: currentService.categoryId,
        id: { not: query.serviceId },
        status: 'active'
      },
      include: { category: true },
      take: query.limit || 5,
      orderBy: { createdAt: 'desc' }
    });

    return ok({
      data: recommendations.map(service => ({
        id: service.id,
        name: service.name,
        categoryName: service.category.name,
        price: service.price,
        unit: service.unit,
        image: service.images[0] || '',
        rating: 4.5, // 可以从评价表计算
        tags: service.tags
      }))
    });
  }

  @Get('market/flash-sales')
  async getFlashSales() {
    const currentTime = new Date().toTimeString().slice(0, 5);
    
    // 模拟闪购数据，实际应该从专门的闪购表获取
    const flashSales = [
      {
        id: 'flash_1',
        flashPrice: 9.9,
        stock: 50,
        totalStock: 200,
        startTime: '10:00',
        endTime: '12:00'
      },
      {
        id: 'flash_2',
        flashPrice: 19.9,
        stock: 30,
        totalStock: 100,
        startTime: '14:00',
        endTime: '16:00'
      }
    ];

    return ok({
      currentTime,
      items: flashSales
    });
  }

  @Post('market/newcomer/claim')
  async claimNewcomerPackage() {
    // 新人礼包领取逻辑
    // 这里需要验证用户是否为新用户，是否已经领取过等
    
    return ok({
      success: true,
      couponAmount: 50,
      message: '新人礼包领取成功'
    });
  }

  @Get('orders/calendar')
  async getOrderCalendar(@Query() query: OrderCalendarQueryDto) {
    // 获取服务日历数据
    const startDate = new Date(query.year, query.month - 1, 1);
    const endDate = new Date(query.year, query.month, 0);

    const orders = await this.prisma.order.findMany({
      where: {
        serviceDate: {
          gte: startDate,
          lte: endDate
        },
        ...(query.addressId && query.addressId !== 'all' && {
          addressId: query.addressId
        })
      },
      include: {
        service: true
      },
      orderBy: {
        serviceDate: 'asc'
      }
    });

    return ok({
      data: orders.map(order => ({
        date: order.serviceDate.toISOString().split('T')[0],
        orderId: order.orderNo,
        status: order.status,
        serviceName: order.service.name
      }))
    });
  }

  @Get('users/favorites/providers')
  async getFavoriteProviders(@Query() query: FavoriteProviderQueryDto) {
    // 获取收藏的服务者列表
    // 这里需要创建收藏表来存储用户收藏的服务者
    
    // 模拟数据
    const favoriteProviders = await this.prisma.provider.findMany({
      where: {
        status: 'VERIFIED',
        isBanned: false,
        isRecommended: true
      },
      include: {
        user: true
      },
      skip: ((query.page || 1) - 1) * (query.pageSize || 10),
      take: query.pageSize || 10,
      orderBy: {
        [query.sortBy || 'createdAt']: query.sortOrder || 'desc'
      }
    });

    return ok({
      data: favoriteProviders.map(provider => ({
        id: provider.id,
        name: provider.name,
        avatar: provider.avatarUrl,
        rating: provider.rating?.toNumber() || 5.0,
        experience: provider.experience,
        intro: provider.intro,
        expectedSalary: provider.expectedSalary,
        serviceTypes: provider.providerTypes,
        hometown: provider.hometown,
        isOnline: provider.isOnline,
        totalOrders: provider.totalOrders,
        totalRevenue: provider.totalRevenue
      }))
    });
  }

  @Patch('users/addresses/:addrId/default')
  async setDefaultAddress(
    @Body() setDefaultDto: SetDefaultAddressDto,
    @Param('addrId') addrId: string
  ) {
    // 设置默认地址
    if (setDefaultDto.isDefault) {
      // 先将该用户的所有地址设为非默认
      await this.prisma.address.updateMany({
        where: {
          // 这里需要从JWT或session获取用户ID
          // userId: currentUserId
        },
        data: {
          isDefault: false
        }
      });
    }

    // 更新指定地址的默认状态
    const updatedAddress = await this.prisma.address.update({
      where: { id: addrId },
      data: {
        isDefault: setDefaultDto.isDefault
      }
    });

    return ok({
      data: updatedAddress
    });
  }

  // 私有辅助方法
  private async getBanners() {
    const banners = await this.prisma.banner.findMany({
      where: { status: 'published' },
      orderBy: { sortOrder: 'asc' }
    });
    return banners.map(banner => ({
      id: banner.id,
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl,
      sortOrder: banner.sortOrder
    }));
  }

  private async getCategories() {
    const categories = await this.prisma.serviceCategory.findMany({
      where: { parentId: null },
      include: {
        children: true
      },
      orderBy: { sortOrder: 'asc' },
      take: 8 // 限制返回8个分类
    });

    return categories.map(category => ({
      id: category.id,
      name: category.name,
      icon: category.icon || '📦',
      color: this.getCategoryColor(category.name),
      type: this.getCategoryType(category.name)
    }));
  }

  private async getSpecialOffers() {
    const specialOffers = await this.prisma.specialOffer.findMany({
      where: { status: 'active' },
      orderBy: { sortOrder: 'asc' },
      take: 10
    });

    return specialOffers.map(offer => ({
      id: offer.id,
      name: offer.name,
      price: offer.price.toNumber(),
      originalPrice: offer.price.toNumber() * 1.2,
      image: offer.image,
      discount: 0.8,
      unit: offer.unit,
      tags: [...offer.tags, '限时特惠']
    }));
  }

  private async getFeaturedServices() {
    // 获取推荐服务（可以是评分高的、订单多的等）
    const services = await this.prisma.service.findMany({
      where: { status: 'active' },
      include: { category: true },
      orderBy: { createdAt: 'desc' },
      take: 5
    });

    return services.map(service => ({
      id: service.id,
      isFeatured: true,
      name: service.name,
      rating: 4.8,
      price: service.price.toNumber(),
      image: service.images[0] || ''
    }));
  }

  private async getFeaturedCards() {
    // 获取特色卡片数据（固定四个：新人专享、团购秒杀、企业定制、高端管家）
    return [
      {
        id: 'newcomer_special',
        title: '新人专享',
        subtitle: '首次下单立减50元',
        icon: '🎁',
        color: 'bg-gradient-to-r from-green-400 to-emerald-500',
        link: '/market/newcomer',
        stats: {
          discount: 50,
          minOrder: 200,
          validDays: 7
        }
      },
      {
        id: 'group_buying',
        title: '团购秒杀',
        subtitle: '多人团购更优惠',
        icon: '⚡',
        color: 'bg-gradient-to-r from-red-400 to-pink-500',
        link: '/market/flash-sales',
        stats: {
          maxDiscount: 30,
          minPeople: 3,
          dailyLimit: 100
        }
      },
      {
        id: 'enterprise_custom',
        title: '企业定制',
        subtitle: '企业服务专属方案',
        icon: '🏢',
        color: 'bg-gradient-to-r from-blue-400 to-indigo-500',
        link: '/enterprise/custom',
        stats: {
          serviceTypes: 8,
          discountRange: '10-25%',
          responseTime: '24小时'
        }
      },
      {
        id: 'premium_manager',
        title: '高端管家',
        subtitle: '一站式家庭管理',
        icon: '👑',
        color: 'bg-gradient-to-r from-purple-400 to-violet-500',
        link: '/premium/manager',
        stats: {
          serviceCount: 12,
          experience: '5年+',
          rating: 4.9
        }
      }
    ];
  }

  private async getPackageDeals() {
    // 获取套餐专区数据（组合服务套餐）
    return [
      {
        id: 'new_mom_package',
        name: '新手妈妈套餐',
        description: '月嫂+产后康复+营养指导',
        originalPrice: 8999,
        discountPrice: 6999,
        discount: 22,
        duration: '30天',
        services: [
          { name: '金牌月嫂', days: 26 },
          { name: '产后康复', sessions: 10 },
          { name: '营养指导', sessions: 5 }
        ],
        badge: '热销',
        image: '/packages/new-mom.jpg'
      },
      {
        id: 'deep_cleaning_package',
        name: '全屋深度清洁',
        description: '厨房+卫生间+客厅+卧室全清洁',
        originalPrice: 599,
        discountPrice: 399,
        discount: 33,
        duration: '4小时',
        services: [
          { name: '厨房深度清洁', area: '15㎡' },
          { name: '卫生间消毒', area: '10㎡' },
          { name: '客厅整理', area: '20㎡' },
          { name: '卧室清洁', area: '15㎡' }
        ],
        badge: '限时特惠',
        image: '/packages/deep-cleaning.jpg'
      },
      {
        id: 'elderly_care_package',
        name: '老人照护套餐',
        description: '日常照料+医疗陪护+康复训练',
        originalPrice: 4999,
        discountPrice: 3999,
        discount: 20,
        duration: '15天',
        services: [
          { name: '日常照料', hours: 120 },
          { name: '医疗陪护', sessions: 3 },
          { name: '康复训练', sessions: 5 }
        ],
        badge: '推荐',
        image: '/packages/elderly-care.jpg'
      }
    ];
  }

  private getCategoryColor(categoryName: string): string {
    const colorMap: Record<string, string> = {
      '保洁清洗': 'bg-emerald-50',
      '母婴护理': 'bg-pink-50',
      '养老护理': 'bg-blue-50',
      '烹饪服务': 'bg-orange-50',
      '家教服务': 'bg-purple-50',
      '搬家运输': 'bg-yellow-50',
      '维修安装': 'bg-red-50',
      '宠物服务': 'bg-green-50'
    };
    return colorMap[categoryName] || 'bg-gray-50';
  }

  private getCategoryType(categoryName: string): 'fixed' | 'custom' {
    // 固定服务：标准化、可定价的服务
    const fixedServices = ['保洁清洗', '母婴护理', '搬家运输', '维修安装', '宠物服务'];
    
    // 定制服务：需要个性化定制、价格浮动的服务
    const customServices = ['养老护理', '烹饪服务', '家教服务'];
    
    if (fixedServices.includes(categoryName)) {
      return 'fixed';
    } else if (customServices.includes(categoryName)) {
      return 'custom';
    }
    
    // 默认为固定服务
    return 'fixed';
  }

  private getServiceType(serviceId: string): string {
    // 根据服务ID推断服务类型，这里简化处理
    const typeMap: Record<string, string> = {
      'svc_matron': 'MATERNITY_NURSE',
      'svc_child_care': 'CHILD_CARE_NURSE',
      'svc_cleaning': 'CLEANING',
      'svc_cooking': 'COOKING'
    };
    return typeMap[serviceId] || 'CLEANING';
  }
}
