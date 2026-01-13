// 简单的DTO类型定义，不使用装饰器
export class ServiceSpecificationDto {
  id!: string;
  label!: string;
  desc!: string;
  price!: number;
  originalPrice?: number;
  duration?: number;
}

export class ServiceDetailResponseDto {
  id!: string;
  name!: string;
  categoryId!: string;
  categoryName!: string;
  price!: number;
  unit!: string;
  images!: string[];
  description!: string;
  tags!: string[];
  specifications!: ServiceSpecificationDto[];
  details!: string[]; // 营销长图
  promises!: string[];
  process!: Array<{
    title: string;
    desc: string;
  }>;
  providerCount!: number;
  rating!: number;
  status!: string;
}

export class CreateOrderDto {
  serviceId!: string;
  specId!: string; // 新增：规格ID
  addressId!: string;
  serviceDate!: string;
  serviceTime!: string;
  duration?: number;
  couponId?: string;
  specialRequests?: string;
}

export class ServiceListQueryDto {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  subCategoryId?: string;
  sort?: string;
  filter?: string;
  keyword?: string;
}

export class ProviderListQueryDto {
  page?: number;
  pageSize?: number;
  categoryId?: string;
  subCategoryId?: string;
  sort?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  filter?: string;
  keyword?: string;
}

export class OrderListQueryDto {
  role?: 'customer' | 'provider' | 'admin';
  status?: string;
  orderNo?: string;
  dateRange?: {
    start: string;
    end: string;
  };
  page?: number;
  pageSize?: number;
}

export class UserProfileQueryDto {
  userType?: 'customer' | 'provider';
}
