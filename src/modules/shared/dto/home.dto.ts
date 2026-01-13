// 简单的DTO类型定义，不使用装饰器
export class HomeInitResponseDto {
  banners!: Array<{
    id: string;
    imageUrl: string;
    linkUrl?: string;
    sortOrder: number;
  }>;
  categories!: Array<{
    id: string;
    name: string;
    icon: string;
    color?: string;
  }>;
  specialOffers!: Array<{
    id: string;
    name: string;
    price: number;
    originalPrice: number;
    image: string;
    discount: number;
    unit: string;
    tags: string[];
  }>;
  featuredServices!: Array<{
    id: string;
    isFeatured: boolean;
    name: string;
    rating: number;
    price: number;
    image: string;
  }>;
  featuredCards!: Array<{
    id: string;
    title: string;
    subtitle: string;
    icon: string;
    color: string;
    link: string;
    stats: {
      discount?: number;
      minOrder?: number;
      validDays?: number;
      maxDiscount?: number;
      minPeople?: number;
      dailyLimit?: number;
      serviceTypes?: number;
      discountRange?: string;
      responseTime?: string;
      serviceCount?: number;
      experience?: string;
      rating?: number;
    };
  }>;
  packageDeals!: Array<{
    id: string;
    name: string;
    description: string;
    originalPrice: number;
    discountPrice: number;
    discount: number;
    duration: string;
    services: Array<{
      name: string;
      days?: number;
      sessions?: number;
      hours?: number;
      area?: string;
    }>;
    badge: string;
    image: string;
  }>;
}

export class ServiceMatchDto {
  serviceId!: string;
  startDate!: string;
  budgetRange!: string;
  specialRequirements?: string;
}

export class ServiceRecommendationQueryDto {
  serviceId!: string;
  limit?: number;
}

export class FlashSaleItemDto {
  id!: string;
  flashPrice!: number;
  stock!: number;
  totalStock!: number;
  startTime!: string;
  endTime!: string;
}

export class FlashSaleResponseDto {
  currentTime!: string;
  items!: FlashSaleItemDto[];
}

export class NewcomerClaimResponseDto {
  success!: boolean;
  couponAmount?: number;
  message?: string;
}

export class OrderCalendarQueryDto {
  year!: number;
  month!: number;
  addressId?: string;
}

export class OrderCalendarItemDto {
  date!: string;
  orderId!: string;
  status!: string;
  serviceName?: string;
}

export class FavoriteProviderQueryDto {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export class SetDefaultAddressDto {
  isDefault!: boolean;
}
