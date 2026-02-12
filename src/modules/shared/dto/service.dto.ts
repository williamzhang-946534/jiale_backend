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
  // === 基础信息 ===
  id!: string;
  name!: string;
  description!: string;
  
  // === 分类信息 ===
  categoryId!: string;
  categoryName!: string;
  subCategoryId?: string;      // 🆕 子分类ID
  
  // === 价格信息 ===
  price!: number;
  originalPrice?: number;     // 🆕 原价（用于套餐）
  discount?: number;          // 🆕 折扣率（0.1-1.0）
  isPackage?: boolean;        // 🆕 是否为套餐
  packageItems?: any;          // 🆕 套餐项目详情
  unit!: string;
  
  // === 媒体资源 ===
  images!: string[];
  details!: string[];          // 🆕 真实存储的详情图片
  
  // === 评价统计 ===
  rating!: number;
  sales!: number;              // 🆕 真实存储的销量
  providerCount!: number;      // 🆕 可提供服务人数
  
  // === 标签分类 ===
  tags!: string[];             // 🆕 服务标签
  type?: string;              // 🆕 服务类型
  
  // === 服务详情 ===
  promises!: string[];        // 🆕 真实存储的服务承诺
  process!: Array<{            // 🆕 真实存储的服务流程
    title: string;
    desc: string;
  }>;
  specifications!: ServiceSpecificationDto[];
  
  // === 营销标识 ===
  isSpecial?: boolean;        // 🆕 真实存储的特价标识
  isFeatured?: boolean;        // 🆕 是否精选
  isRecommended?: boolean;    // 🆕 是否推荐
  badge?: string;             // 🆕 服务徽章
  priority?: number;          // 🆕 排序权重
  
  // === 服务规则 ===
  location?: string;          // 🆕 主要服务区域
  serviceArea?: string[];     // 🆕 详细服务区域
  minBookingTime?: number;    // 🆕 最少提前预约时间（小时）
  maxBookingTime?: number;    // 🆕 最远提前预约时间（小时）
  serviceDuration?: number;    // 🆕 标准服务时长（分钟）
  cancelDeadline?: number;    // 🆕 免费取消截止时间
  
  // === 服务保障 ===
  insurance?: string;         // 🆕 保险保障
  guarantee?: string[];       // 🆕 服务保证
  afterSales?: string;        // 🆕 售后服务
  
  // === 状态信息 ===
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
