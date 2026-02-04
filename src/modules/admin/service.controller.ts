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
  }) {
    const {
      page = 1,
      pageSize = 20,
      categoryId,
      keyword,
    } = query;

    const where: any = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (keyword) {
      where.OR = [
        { name: { contains: keyword } },
        { description: { contains: keyword } },
      ];
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
    unit: string;
    images?: string[];
    description?: string;
    tags?: string[];
    status?: string;
  }) {
    const {
      name,
      categoryId,
      price,
      unit,
      images = [],
      description,
      tags = [],
      status = 'active',
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
        unit,
        images,
        description,
        tags,
        status,
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
      status?: string;
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
      status,
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
        status,
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

    const key = this.storageService.generateUploadPath(UploadType.SERVICE_IMAGES, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

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
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
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
