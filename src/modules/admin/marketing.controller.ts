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
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { UploadType } from '../shared/interfaces/storage.interface';
import { ok } from '../shared/types/api-response';

@ApiTags('营销管理')
@Controller('admin/v1/marketing')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminMarketingController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('StorageService') private readonly storageService: any,
  ) {}

  // 轮播图管理
  @Get('banners')
  async getBanners(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    
    const [banners, total] = await Promise.all([
      this.prisma.banner.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.banner.count(),
    ]);
    
    return ok({
      list: banners,
      total,
      page,
      pageSize,
    });
  }

  @Post('banners')
  async createBanner(@Body() body: {
    imageUrl: string;
    linkUrl?: string;
    sortOrder?: number;
  }) {
    const { imageUrl, linkUrl, sortOrder = 1 } = body;

    const banner = await this.prisma.banner.create({
      data: {
        imageUrl,
        linkUrl,
        sortOrder,
      },
    });

    return ok(banner);
  }

  @Delete('banners/:id')
  async deleteBanner(@Param('id') id: string) {
    await this.prisma.banner.delete({
      where: { id },
    });
    return ok(null);
  }

  @Patch('banners/:id/status')
  async updateBannerStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    const { status } = body;
    const banner = await this.prisma.banner.update({
      where: { id },
      data: { status },
    });

    return ok(banner);
  }

  @Put('banners/:id')
  @ApiOperation({ summary: '更新轮播图' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateBanner(
    @Param('id') id: string,
    @Body() body: {
      imageUrl?: string;
      linkUrl?: string;
      sortOrder?: number;
      status?: string;
    }
  ) {
    const { imageUrl, linkUrl, sortOrder, status } = body;

    const banner = await this.prisma.banner.update({
      where: { id },
      data: {
        imageUrl,
        linkUrl,
        sortOrder,
        status,
      },
    });

    return ok(banner);
  }

  @Post('banners/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传轮播图图片' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadBannerImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    const key = this.storageService.generateUploadPath(UploadType.BANNER_IMAGES, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }

  // 优惠券模板管理
  @Post('coupons')
  async createCouponTemplate(@Body() body: {
    name: string;
    amount: number;
    minSpend: number;
    totalQuantity: number;
    validDays: number;
    description?: string;
    userLimit?: number;
    categoryIds?: string[];
  }) {
    const {
      name,
      amount,
      minSpend,
      totalQuantity,
      validDays,
      description,
      userLimit = 1,
      categoryIds = [],
    } = body;

    const couponTemplate = await this.prisma.couponTemplate.create({
      data: {
        name,
        amount,
        minSpend,
        totalQuantity,
        validDays,
        description,
        userLimit,
        categoryIds,
      },
    });

    return ok({
      ...couponTemplate,
      remainingQuantity: couponTemplate.totalQuantity,
      status: 'active',
      createTime: couponTemplate.createdAt,
      expireTime: new Date(Date.now() + validDays * 24 * 60 * 60 * 1000).toISOString(),
    });
  }

  @Get('coupons')
  async getCouponTemplates(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    
    const [templates, total] = await Promise.all([
      this.prisma.couponTemplate.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          _count: {
            select: {
              userCoupons: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.couponTemplate.count(),
    ]);

    return ok({
      list: templates,
      total,
      page,
      pageSize,
    });
  }

  // 限时特惠管理
  @Get('special-offers')
  async getSpecialOffers(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    
    const [specialOffers, total] = await Promise.all([
      this.prisma.specialOffer.findMany({
        skip: (page - 1) * pageSize,
        take: pageSize,
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.specialOffer.count(),
    ]);
    
    return ok({
      list: specialOffers,
      total,
      page,
      pageSize,
    });
  }

  @Post('special-offers')
  async createSpecialOffer(@Body() body: {
    name: string;
    categoryId: string;    // 🔄 统一使用 categoryId
    price: number;
    unit: string;
    rating: number;
    images: string[];      // 🔄 统一使用 images 数组
    description: string;
    providerCount?: number;
    tags?: string[];
    sortOrder?: number;
  }) {
    const {
      name,
      categoryId,    // 🔄
      price,
      unit,
      rating,
      images,        // 🔄
      description,
      providerCount = 0,
      tags = [],
      sortOrder = 1,
    } = body;

    const specialOffer = await this.prisma.specialOffer.create({
      data: {
        name,
        categoryId,    // 🔄
        price,
        unit,
        rating,
        images,        // 🔄
        description,
        providerCount,
        tags,
        sortOrder,
      },
    });

    return ok(specialOffer);
  }

  @Put('special-offers/:id')
  async updateSpecialOffer(
    @Param('id') id: string,
    @Body() body: {
      name?: string;
      categoryId?: string;    // 🔄 统一使用 categoryId
      price?: number;
      unit?: string;
      rating?: number;
      images?: string[];      // 🔄 统一使用 images 数组
      description?: string;
      providerCount?: number;
      tags?: string[];
      status?: string;
      sortOrder?: number;
    }
  ) {
    const specialOffer = await this.prisma.specialOffer.update({
      where: { id },
      data: body,
    });

    return ok(specialOffer);
  }

  @Delete('special-offers/:id')
  async deleteSpecialOffer(@Param('id') id: string) {
    await this.prisma.specialOffer.delete({
      where: { id },
    });
    return ok(null);
  }

  @Patch('special-offers/:id/status')
  async updateSpecialOfferStatus(
    @Param('id') id: string,
    @Body() body: { status: string }
  ) {
    const { status } = body;
    const specialOffer = await this.prisma.specialOffer.update({
      where: { id },
      data: { status },
    });

    return ok(specialOffer);
  }

  @Post('special-offers/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传限时特惠图片' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadSpecialOfferImage(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的图片');
    }

    const key = this.storageService.generateUploadPath(UploadType.BANNER_IMAGES, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }
}
