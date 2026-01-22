import { Controller, Get, Query, Post, Body, Param } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { 
  ServiceDetailResponseDto,
  CreateOrderDto,
  ServiceListQueryDto,
  ProviderListQueryDto
} from '../shared/dto/service.dto';

@Controller('v1')
export class UnifiedServiceController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('services/detail/:serviceId')
  async getServiceDetail(@Param('serviceId') serviceId: string) {
    let service = await this.prisma.service.findUnique({
      where: { id: serviceId },
      include: { 
        category: true,
        // 这里可以包含规格信息，如果有的话
      }
    });

    // 如果没找到服务，尝试作为分类ID查找该分类下的第一个服务
    if (!service) {
      service = await this.prisma.service.findFirst({
        where: {
          categoryId: serviceId,
          status: 'active'
        },
        include: { category: true }
      });
    }

    if (!service) {
      return {
        code: 404,
        message: '服务不存在',
        data: null
      };
    }

    // 获取该服务的服务者数量
    const providerCount = await this.prisma.provider.count({
      where: {
        status: 'VERIFIED',
        isBanned: false,
        // 这里可以根据服务类别匹配服务者
      }
    });

    // 模拟规格数据，实际应该从专门的规格表获取
    const specifications = this.generateSpecifications(serviceId);

    return ok({
      id: service.id,
      name: service.name,
      categoryId: service.categoryId,
      categoryName: service.category.name,
      price: service.price.toNumber(),
      originalPrice: this.generateOriginalPrice(service.price.toNumber()),
      isSpecial: this.generateIsSpecial(service.id),
      unit: service.unit,
      images: service.images,
      details: this.generateDetailImages(serviceId),
      description: service.description || '',
      tags: service.tags,
      specifications,
      promises: this.generatePromises(serviceId),
      process: this.generateProcessSteps(serviceId),
      providerCount,
      sales: this.generateSales(service.id),
      rating: 4.8, // 可以从评价表计算
      status: service.status
    });
  }

  @Post('orders/create')
  async createOrder(@Body() createOrderDto: CreateOrderDto) {
    // 验证规格ID是否有效
    const specification = this.validateSpecification(createOrderDto.serviceId, createOrderDto.specId);
    if (!specification) {
      return ok({
        code: 400,
        message: '无效的规格ID',
        data: null
      });
    }

    // 计算订单价格
    const originalPrice = specification.price;
    let discount = 0;
    let totalPrice = originalPrice;

    // 如果有优惠券，计算折扣
    if (createOrderDto.couponId) {
      // 这里应该查询优惠券信息并计算折扣
      discount = 10; // 模拟10元优惠
      totalPrice = originalPrice - discount;
    }

    // 创建订单
    const order = await this.prisma.order.create({
      data: {
        orderNo: this.generateOrderNo(),
        userId: 'current_user_id', // 应该从JWT或session获取
        serviceId: createOrderDto.serviceId,
        addressId: createOrderDto.addressId,
        serviceDate: new Date(createOrderDto.serviceDate),
        serviceTime: createOrderDto.serviceTime,
        duration: createOrderDto.duration,
        originalPrice,
        discount,
        totalPrice,
        specialRequests: createOrderDto.specialRequests,
        status: 'PENDING',
        timeline: {
          created: new Date().toISOString()
        }
      },
      include: {
        service: true,
        address: true
      }
    });

    return ok({
      orderId: order.orderNo,
      payToken: 'mock_pay_token_' + order.id, // 实际应该调用支付接口获取
      order: {
        id: order.id,
        orderNo: order.orderNo,
        serviceName: order.service.name,
        serviceDate: order.serviceDate,
        serviceTime: order.serviceTime,
        totalPrice: order.totalPrice.toNumber(),
        address: order.address
      }
    });
  }

  @Get('services')
  async getServices(@Query() query: ServiceListQueryDto) {
    const where: any = {
      status: 'active'
    };

    if (query.categoryId) {
      where.categoryId = query.categoryId;
    }

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword, mode: 'insensitive' } },
        { description: { contains: query.keyword, mode: 'insensitive' } },
        { tags: { hasSome: [query.keyword] } }
      ];
    }

    if (query.filter) {
      where.tags = { hasSome: [query.filter] };
    }

    const services = await this.prisma.service.findMany({
      where,
      include: { category: true },
      skip: ((query.page || 1) - 1) * (query.pageSize || 20),
      take: query.pageSize || 20,
      orderBy: this.getSortOrder(query.sort)
    });

    return ok(services.map(service => ({
        id: service.id,
        name: service.name,
        categoryName: service.category.name,
        price: service.price.toNumber(),
        unit: service.unit,
        image: service.images[0] || '',
        tags: service.tags,
        rating: 4.5, // 可以从评价表计算
        providerCount: 0, // 可以从服务者表计算
        description: service.description
      })));
  }

  @Get('providers')
  async getProviders(@Query() query: ProviderListQueryDto) {
    const where: any = {
      status: 'VERIFIED',
      isBanned: false
    };

    if (query.keyword) {
      where.OR = [
        { name: { contains: query.keyword, mode: 'insensitive' } },
        { intro: { contains: query.keyword, mode: 'insensitive' } }
      ];
    }

    if (query.filter) {
      where.providerTypes = { hasSome: [query.filter] };
    }

    // 如果有地理位置信息，可以添加距离筛选
    if (query.latitude && query.longitude) {
      // 这里可以使用PostGIS或简单的距离计算
      // 暂时不实现，返回所有符合条件的服务者
    }

    const providers = await this.prisma.provider.findMany({
      where,
      include: { user: true },
      skip: ((query.page || 1) - 1) * (query.pageSize || 20),
      take: query.pageSize || 20,
      orderBy: this.getProviderSortOrder(query.sort)
    });

    return ok({
      data: providers.map(provider => ({
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
        totalRevenue: provider.totalRevenue.toNumber(),
        distance: provider.homeAddress ? '2.5km' : '未知' // 模拟距离
      }))
    });
  }

  // 私有辅助方法
  private generateSpecifications(serviceId: string) {
    // 根据服务ID生成不同的规格
    const specMap: Record<string, any[]> = {
      'svc_daily_clean': [
        { id: 'sp1', label: '2小时', desc: '基础除尘', price: 45 },
        { id: 'sp2', label: '4小时', desc: '深度除垢', price: 85 }
      ],
      'svc_matron': [
        { id: 'sp1', label: '26天', desc: '标准月嫂服务', price: 12800 },
        { id: 'sp2', label: '52天', desc: '双月月嫂服务', price: 23600 }
      ]
    };

    return specMap[serviceId] || [
      { id: 'sp1', label: '标准', desc: '标准服务', price: 100 }
    ];
  }

  private validateSpecification(serviceId: string, specId: string) {
    const specifications = this.generateSpecifications(serviceId);
    return specifications.find(spec => spec.id === specId);
  }

  private generateDetailImages(serviceId: string): string[] {
    // 模拟营销长图
    return [
      `https://example.com/details/${serviceId}_1.jpg`,
      `https://example.com/details/${serviceId}_2.jpg`
    ];
  }

  private generatePromises(serviceId: string): string[] {
    const promiseMap: Record<string, string[]> = {
      'svc_daily_clean': ['不满意重新做', '财产险保障', '迟到赔付'],
      'svc_matron': ['专业母婴护理', '健康体检', '不满意可更换']
    };
    return promiseMap[serviceId] || ['品质保障', '专业服务'];
  }

  private generateProcessSteps(serviceId: string) {
    const processMap: Record<string, any[]> = {
      'svc_daily_clean': [
        { title: '准时上门', desc: '服饰整齐' },
        { title: '工具准备', desc: '专业清洁工具' },
        { title: '清洁服务', desc: '按标准流程清洁' },
        { title: '验收确认', desc: '客户确认满意' }
      ],
      'svc_matron': [
        { title: '健康评估', desc: '产妇和婴儿健康检查' },
        { title: '制定计划', desc: '个性化护理方案' },
        { title: '专业护理', desc: '24小时贴心照顾' },
        { title: '定期反馈', desc: '每日护理记录' }
      ]
    };
    return processMap[serviceId] || [
      { title: '服务准备', desc: '专业人员准备' },
      { title: '开始服务', desc: '按标准流程执行' },
      { title: '服务完成', desc: '客户验收确认' }
    ];
  }

  private generateOrderNo(): string {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD${date}${random}`;
  }

  private getSortOrder(sort?: string) {
    const sortMap: Record<string, any> = {
      'comprehensive': { createdAt: 'desc' },
      'sales': { createdAt: 'desc' },
      'price_asc': { price: 'asc' },
      'price_desc': { price: 'desc' }
    };
    return sortMap[sort || 'comprehensive'];
  }

  private getProviderSortOrder(sort?: string) {
    const sortMap: Record<string, any> = {
      'comprehensive': { createdAt: 'desc' },
      'rating': { rating: 'desc' },
      'price_asc': { expectedSalary: 'asc' },
      'price_desc': { expectedSalary: 'desc' }
    };
    return sortMap[sort || 'comprehensive'];
  }

  // 生成原价（比现价高20-50%）
  private generateOriginalPrice(currentPrice: number): number {
    const markup = 1.2 + Math.random() * 0.3; // 1.2-1.5倍
    return Math.round(currentPrice * markup);
  }

  // 生成是否特价（30%概率是特价）
  private generateIsSpecial(serviceId: string): boolean {
    // 可以根据服务ID的hash值来决定，确保结果一致
    const hash = serviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return hash % 10 < 3; // 30%概率
  }

  // 生成月销量（50-500之间）
  private generateSales(serviceId: string): number {
    // 根据服务ID生成稳定的销量数据
    const hash = serviceId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 50 + (hash % 450); // 50-500之间
  }
}
