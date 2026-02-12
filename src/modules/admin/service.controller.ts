import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Query,
  UseGuards,
  UploadedFile,
  UploadedFiles,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { UploadType } from '../shared/interfaces/storage.interface';
import { ok } from '../shared/types/api-response';

@ApiTags('服务管理')
@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminServiceController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('StorageService') private readonly storageService: any,
  ) {}

  @Get('services')
  async getServices(@Query() query: {
    page?: number;
    pageSize?: number;
    categoryId?: string;
    keyword?: string;
    // 🆕 营销设置搜索条件
    isSpecial?: boolean;         // 特价服务
    isFeatured?: boolean;        // 精选服务
    isRecommended?: boolean;     // 推荐服务
    // 🆕 套餐服务搜索条件
    isPackage?: boolean;         // 套餐服务
    // 🆕 其他搜索条件
    status?: string;             // 服务状态
    type?: string;               // 服务类型
    minPrice?: number;           // 最低价格
    maxPrice?: number;           // 最高价格
    location?: string;           // 服务区域
  }) {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      keyword,
      // 🆕 营销设置搜索条件
      isSpecial,
      isFeatured,
      isRecommended,
      // 🆕 套餐服务搜索条件
      isPackage,
      // 🆕 其他搜索条件
      status,
      type,
      minPrice,
      maxPrice,
      location,
    } = query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
        { tags: { hasSome: [keyword] } }
      ];
    }

    // 🆕 营销设置筛选
    if (isSpecial !== undefined) {
      where.isSpecial = String(isSpecial) === 'true';
    }
    if (isFeatured !== undefined) {
      where.isFeatured = String(isFeatured) === 'true';
    }
    if (isRecommended !== undefined) {
      where.isRecommended = String(isRecommended) === 'true';
    }

    // 🆕 套餐服务筛选
    if (isPackage !== undefined) {
      where.isPackage = String(isPackage) === 'true';
    }

    // 🆕 其他筛选条件
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }
    if (minPrice !== undefined || maxPrice !== undefined) {
      where.price = {};
      if (minPrice !== undefined) {
        where.price.gte = minPrice;
      }
      if (maxPrice !== undefined) {
        where.price.lte = maxPrice;
      }
    }
    if (location) {
      where.OR = where.OR || [];
      where.OR.push(
        { location: { contains: location } },
        { serviceArea: { hasSome: [location] } }
      );
    }

    const [list, total] = await Promise.all([
      this.prisma.service.findMany({
        where,
        include: {
          category: true,
          _count: {
            select: {
              orders: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (Number(page) - 1) * Number(pageSize),
        take: Number(pageSize),
      }),
      this.prisma.service.count({ where }),
    ]);

    return ok({
      list,
      total,
      page: Number(page),
      pageSize: Number(pageSize),
    });
  }

  @Post('services')
  async createService(@Body() body: {
    name: string;
    categoryId: string;
    price: number;
    originalPrice?: number;    // 🆕 原价（用于套餐）
    discount?: number;         // 🆕 折扣率（0.1-1.0）
    isPackage?: boolean;       // 🆕 是否为套餐
    packageItems?: any;        // 🆕 套餐项目详情
    unit: string;
    images?: string[];
    description?: string;
    tags?: string[];
    providerCount?: number;  // 🆕 可提供服务人数
    location?: string;       // 🆕 主要服务区域
    serviceDuration?: number;  // 🆕 标准服务时长（分钟）
    minBookingTime?: number;   // 🆕 最少提前预约时间（小时）
    badge?: string;            // 🆕 服务徽章
    serviceArea?: string[];     // 🆕 详细服务区域
    maxBookingTime?: number;   // 🆕 最远提前预约时间（小时）
    insurance?: string;        // 🆕 保险保障
    guarantee?: string[];      // 🆕 服务保证
    afterSales?: string;       // 🆕 售后服务
    status?: string;
    // 🆕 补充的新字段
    type?: string;              // 🆕 服务类型
    isSpecial?: boolean;         // 🆕 特价标识
    isFeatured?: boolean;         // 🆕 精选标识
    isRecommended?: boolean;      // 🆕 推荐标识
    priority?: number;           // 🆕 排序权重
    cancelDeadline?: number;      // 🆕 免费取消截止时间
    serviceDetails?: string[];     // 🆕 详情图片
    servicePromises?: string[];   // 🆕 服务承诺
    serviceProcess?: any;         // 🆕 服务流程
    salesCount?: number;          // 🆕 销量
  }) {
    const {
      name,
      categoryId,
      price,
      originalPrice,      // 🆕 原价（用于套餐）
      discount,           // 🆕 折扣率（0.1-1.0）
      isPackage = false,  // 🆕 是否为套餐
      packageItems,       // 🆕 套餐项目详情
      unit,
      images = [],
      description,
      tags = [],
      providerCount = 0,  // 🆕
      location,           // 🆕
      serviceDuration,    // 🆕 标准服务时长（分钟）
      minBookingTime,     // 🆕 最少提前预约时间（小时）
      badge,              // 🆕 服务徽章
      serviceArea = [],   // 🆕 详细服务区域
      maxBookingTime,     // 🆕 最远提前预约时间（小时）
      insurance,          // 🆕 保险保障
      guarantee = [],     // 🆕 服务保证
      afterSales,         // 🆕 售后服务
      status = 'active',
      // 🆕 补充的新字段
      type = 'STANDARD',              // 🆕 服务类型
      isSpecial = false,         // 🆕 特价标识
      isFeatured = false,        // 🆕 精选标识
      isRecommended = false,      // 🆕 推荐标识
      priority = 0,           // 🆕 排序权重
      cancelDeadline = 24,      // 🆕 免费取消截止时间
      serviceDetails = [],     // 🆕 详情图片
      servicePromises = [],   // 🆕 服务承诺
      serviceProcess,         // 🆕 服务流程
      salesCount = 0,        // 🆕 销量
    } = body;

    // 验证分类是否存在
    const category = await this.prisma.serviceCategory.findUnique({
      where: { id: categoryId },
    });
    if (!category) {
      throw new Error('分类不存在');
    }

    const service = await this.prisma.service.create({
      data: {
        name,
        categoryId,
        price,
        originalPrice,      // 🆕 原价（用于套餐）
        discount,           // 🆕 折扣率（0.1-1.0）
        isPackage,           // 🆕 是否为套餐
        packageItems,        // 🆕 套餐项目详情
        unit,
        images,
        description,
        tags,
        providerCount,  // 🆕
        location,       // 🆕
        serviceDuration, // 🆕 标准服务时长（分钟）
        minBookingTime,  // 🆕 最少提前预约时间（小时）
        badge,           // 🆕 服务徽章
        serviceArea,     // 🆕 详细服务区域
        maxBookingTime,  // 🆕 最远提前预约时间（小时）
        insurance,       // 🆕 保险保障
        guarantee,       // 🆕 服务保证
        afterSales,      // 🆕 售后服务
        status,
        // 🆕 补充的新字段
        type,              // 🆕 服务类型
        isSpecial,         // 🆕 特价标识
        isFeatured,        // 🆕 精选标识
        isRecommended,     // 🆕 推荐标识
        priority,          // 🆕 排序权重
        cancelDeadline,     // 🆕 免费取消截止时间
        serviceDetails,     // 🆕 详情图片
        servicePromises,   // 🆕 服务承诺
        serviceProcess,     // 🆕 服务流程
        salesCount,        // 🆕 销量
      },
      include: {
        category: true,
      },
    });

    return ok(service);
  }

  @Put('services/:id')
  async updateService(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      categoryId?: string;
      price?: number;
      unit?: string;
      images?: string[];
      description?: string;
      tags?: string[];
      providerCount?: number;  // 🆕 可提供服务人数
      location?: string;       // 🆕 主要服务区域
      serviceDuration?: number;  // 🆕 标准服务时长（分钟）
      minBookingTime?: number;   // 🆕 最少提前预约时间（小时）
      badge?: string;            // 🆕 服务徽章
      serviceArea?: string[];     // 🆕 详细服务区域
      maxBookingTime?: number;   // 🆕 最远提前预约时间（小时）
      insurance?: string;        // 🆕 保险保障
      guarantee?: string[];      // 🆕 服务保证
      afterSales?: string;       // 🆕 售后服务
      status?: string;
      // 🆕 套餐相关字段
      originalPrice?: number;    // 🆕 原价（用于套餐）
      discount?: number;         // 🆕 折扣率（0.1-1.0）
      isPackage?: boolean;       // 🆕 是否为套餐
      packageItems?: any;        // 🆕 套餐项目详情
      // 🆕 补充的新字段
      type?: string;              // 🆕 服务类型
      isSpecial?: boolean;         // 🆕 特价标识
      isFeatured?: boolean;         // 🆕 精选标识
      isRecommended?: boolean;      // 🆕 推荐标识
      priority?: number;           // 🆕 排序权重
      cancelDeadline?: number;      // 🆕 免费取消截止时间
      serviceDetails?: string[];     // 🆕 详情图片
      servicePromises?: string[];   // 🆕 服务承诺
      serviceProcess?: any;         // 🆕 服务流程
      salesCount?: number;          // 🆕 销量
    },
  ) {
    const {
      name,
      categoryId,
      price,
      unit,
      images,
      description,
      tags,
      providerCount,  // 🆕
      location,       // 🆕
      serviceDuration, // 🆕 标准服务时长（分钟）
      minBookingTime,  // 🆕 最少提前预约时间（小时）
      badge,           // 🆕 服务徽章
      serviceArea,     // 🆕 详细服务区域
      maxBookingTime,  // 🆕 最远提前预约时间（小时）
      insurance,       // 🆕 保险保障
      guarantee,       // 🆕 服务保证
      afterSales,      // 🆕 售后服务
      status,
      // 🆕 套餐相关字段
      originalPrice,      // 🆕 原价（用于套餐）
      discount,           // 🆕 折扣率（0.1-1.0）
      isPackage,          // 🆕 是否为套餐
      packageItems,       // 🆕 套餐项目详情
      // 🆕 补充的新字段
      type,              // 🆕 服务类型
      isSpecial,         // 🆕 特价标识
      isFeatured,        // 🆕 精选标识
      isRecommended,     // 🆕 推荐标识
      priority,          // 🆕 排序权重
      cancelDeadline,     // 🆕 免费取消截止时间
      serviceDetails,     // 🆕 详情图片
      servicePromises,   // 🆕 服务承诺
      serviceProcess,     // 🆕 服务流程
      salesCount,        // 🆕 销量
    } = body;

    // 验证服务是否存在
    const existingService = await this.prisma.service.findUnique({
      where: { id },
    });
    if (!existingService) {
      throw new Error('服务不存在');
    }

    // 验证分类是否存在
    if (categoryId && categoryId !== existingService.categoryId) {
      const category = await this.prisma.serviceCategory.findUnique({
        where: { id: categoryId },
      });
      if (!category) {
        throw new Error('分类不存在');
      }
    }

    const service = await this.prisma.service.update({
      where: { id },
      data: {
        name,
        categoryId,
        price,
        unit,
        images,
        description,
        tags,
        providerCount,  // 🆕
        location,       // 🆕
        serviceDuration, // 🆕 标准服务时长（分钟）
        minBookingTime,  // 🆕 最少提前预约时间（小时）
        badge,           // 🆕 服务徽章
        serviceArea,     // 🆕 详细服务区域
        maxBookingTime,  // 🆕 最远提前预约时间（小时）
        insurance,       // 🆕 保险保障
        guarantee,       // 🆕 服务保证
        afterSales,      // 🆕 售后服务
        status,
        // 🆕 套餐相关字段
        originalPrice,      // 🆕 原价（用于套餐）
        discount,           // 🆕 折扣率（0.1-1.0）
        isPackage,          // 🆕 是否为套餐
        packageItems,       // 🆕 套餐项目详情
        // 🆕 补充的新字段
        type,              // 🆕 服务类型
        isSpecial,         // 🆕 特价标识
        isFeatured,        // 🆕 精选标识
        isRecommended,     // 🆕 推荐标识
        priority,          // 🆕 排序权重
        cancelDeadline,     // 🆕 免费取消截止时间
        serviceDetails,     // 🆕 详情图片
        servicePromises,   // 🆕 服务承诺
        serviceProcess,     // 🆕 服务流程
        salesCount,        // 🆕 销量
      },
      include: {
        category: true,
      },
    });

    return ok(service);
  }

  @Patch('services/:id/status')
  async updateServiceStatus(
    @Param('id') id: string,
    @Body() body: { status: string },
  ) {
    const { status } = body;

    const service = await this.prisma.service.update({
      where: { id },
      data: { status },
      include: {
        category: true,
      },
    });

    return ok(service);
  }

  @Delete('services/:id')
  async deleteService(@Param('id') id: string) {
    // 检查是否有关联的订单
    const ordersCount = await this.prisma.order.count({
      where: { serviceId: id },
    });
    if (ordersCount > 0) {
      throw new Error('该服务下还有订单，无法删除');
    }

    await this.prisma.service.delete({
      where: { id },
    });

    return ok(null);
  }

  @Post('services/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传服务图片' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadServiceImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    console.log('Received file:', file);
    console.log('File mimetype:', file.mimetype);
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    const key = this.storageService.generateUploadPath(UploadType.SERVICE_IMAGES, file.originalname);
    console.log('Generated key:', key);
    let url: string;
    try {
      url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);
      console.log('Upload successful, URL:', url);
    } catch (error) {
      console.error('Upload error:', error);
      throw error;
    }

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }

  @Post('services/upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // 最多10个文件
  @ApiOperation({ summary: '批量上传服务图片' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadMultipleServiceImages(
    @UploadedFiles(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: 'image/jpeg' }),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    files: Express.Multer.File[],
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的图片');
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const key = this.storageService.generateUploadPath(UploadType.SERVICE_IMAGES, file.originalname);
        const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);
        
        return {
          key,
          url,
          size: file.size,
          contentType: file.mimetype,
        };
      }),
    );

    return ok(results);
  }
}
