import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
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
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiConsumes } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { ok } from '../shared/types/api-response';
import { Inject } from '@nestjs/common';

@ApiTags('高端管家管理')
@ApiBearerAuth()
@Controller('admin/v1/premium')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminPremiumSimpleController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('StorageService') private readonly storageService: any,
  ) {}

  @Get('applications')
  @ApiOperation({ summary: '管家申请列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async list(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const status = query.status as string | undefined;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [list, total] = await Promise.all([
      this.prisma.premiumApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              nickname: true,
            },
          },
          serviceCategory: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.premiumApplication.count({ where }),
    ]);

    return ok({ list, total, page, pageSize });
  }

  @Post('applications/:id/approve')
  @ApiOperation({ summary: '通过申请' })
  @ApiResponse({ status: 200, description: '成功' })
  async approve(@Param('id') id: string) {
    const updated = await this.prisma.premiumApplication.update({
      where: { id },
      data: { 
        status: 'approved',
        updatedAt: Math.floor(Date.now() / 1000),
      },
    });
    return ok(updated);
  }

  @Post('applications/:id/reject')
  @ApiOperation({ summary: '驳回申请' })
  @ApiResponse({ status: 200, description: '成功' })
  async reject(@Param('id') id: string, @Query('reason') reason?: string) {
    if (!reason) {
      throw new BadRequestException('reason 不能为空');
    }
    const updated = await this.prisma.premiumApplication.update({
      where: { id },
      data: { 
        status: 'rejected', 
        requirements: `REJECT_REASON: ${reason}`,
        updatedAt: Math.floor(Date.now() / 1000),
      },
    });
    return ok(updated);
  }

  // ========== 高端管家服务分类管理接口 ==========

  @Get('categories')
  @ApiOperation({ summary: '获取高端管家服务分类列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getCategories(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const status = query.status as string | undefined;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [categories, total] = await Promise.all([
      this.prisma.premiumServiceCategory.findMany({
        where,
        orderBy: { sortOrder: 'asc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.premiumServiceCategory.count({ where }),
    ]);

    return ok({ 
      list: categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        tag: cat.tag,
        description: cat.description,
        image: cat.image,
        minServiceHours: cat.minServiceHours,
        advanceBookingDays: cat.advanceBookingDays,
        depositAmount: cat.depositAmount.toNumber(),
        sortOrder: cat.sortOrder,
        status: cat.status,
        createdAt: cat.createdAt,
        updatedAt: cat.updatedAt,
      })),
      total, 
      page, 
      pageSize 
    });
  }

  @Post('categories')
  @ApiOperation({ summary: '创建高端管家服务分类' })
  @ApiResponse({ status: 200, description: '成功' })
  async createCategory(@Body() body: {
    name: string;
    tag?: string;
    description?: string;
    image?: string;
    minServiceHours?: number;
    advanceBookingDays?: number;
    depositAmount?: number;
    sortOrder?: number;
    status?: string;
  }) {
    const { 
      name, 
      tag, 
      description, 
      image, 
      minServiceHours = 1, 
      advanceBookingDays = 0, 
      depositAmount = 0, 
      sortOrder = 1, 
      status = 'active' 
    } = body;

    if (!name) {
      throw new BadRequestException('分类名称不能为空');
    }

    // 检查名称是否重复
    const existing = await this.prisma.premiumServiceCategory.findFirst({
      where: { name },
    });
    if (existing) {
      throw new BadRequestException('分类名称已存在');
    }

    const now = Math.floor(Date.now() / 1000);
    const category = await this.prisma.premiumServiceCategory.create({
      data: {
        name,
        tag,
        description,
        image,
        minServiceHours,
        advanceBookingDays,
        depositAmount,
        sortOrder,
        status,
        createdAt: now,
        updatedAt: now,
      },
    });

    return ok({
      id: category.id,
      name: category.name,
      tag: category.tag,
      description: category.description,
      image: category.image,
      minServiceHours: category.minServiceHours,
      advanceBookingDays: category.advanceBookingDays,
      depositAmount: category.depositAmount.toNumber(),
      sortOrder: category.sortOrder,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }

  @Put('categories/:id')
  @ApiOperation({ summary: '更新高端管家服务分类' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateCategory(@Param('id') id: string, @Body() body: {
    name?: string;
    tag?: string;
    description?: string;
    image?: string;
    minServiceHours?: number;
    advanceBookingDays?: number;
    depositAmount?: number;
    sortOrder?: number;
    status?: string;
  }) {
    // 检查分类是否存在
    const existing = await this.prisma.premiumServiceCategory.findUnique({
      where: { id },
    });
    if (!existing) {
      throw new BadRequestException('分类不存在');
    }

    // 如果更新名称，检查是否重复
    if (body.name && body.name !== existing.name) {
      const nameExists = await this.prisma.premiumServiceCategory.findFirst({
        where: { 
          name: body.name,
          id: { not: id }
        },
      });
      if (nameExists) {
        throw new BadRequestException('分类名称已存在');
      }
    }

    const updateData: any = {};
    if (body.name !== undefined) updateData.name = body.name;
    if (body.tag !== undefined) updateData.tag = body.tag;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.image !== undefined) updateData.image = body.image;
    if (body.minServiceHours !== undefined) updateData.minServiceHours = body.minServiceHours;
    if (body.advanceBookingDays !== undefined) updateData.advanceBookingDays = body.advanceBookingDays;
    if (body.depositAmount !== undefined) updateData.depositAmount = body.depositAmount;
    if (body.sortOrder !== undefined) updateData.sortOrder = body.sortOrder;
    if (body.status !== undefined) updateData.status = body.status;
    updateData.updatedAt = Math.floor(Date.now() / 1000);

    const category = await this.prisma.premiumServiceCategory.update({
      where: { id },
      data: updateData,
    });

    return ok({
      id: category.id,
      name: category.name,
      tag: category.tag,
      description: category.description,
      image: category.image,
      minServiceHours: category.minServiceHours,
      advanceBookingDays: category.advanceBookingDays,
      depositAmount: category.depositAmount.toNumber(),
      sortOrder: category.sortOrder,
      status: category.status,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    });
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: '删除高端管家服务分类' })
  @ApiResponse({ status: 200, description: '成功' })
  async deleteCategory(@Param('id') id: string) {
    // 检查分类是否存在
    const existing = await this.prisma.premiumServiceCategory.findUnique({
      where: { id },
      include: {
        applications: true,
      },
    });
    if (!existing) {
      throw new BadRequestException('分类不存在');
    }

    // 检查是否有关联的申请
    if (existing.applications.length > 0) {
      throw new BadRequestException('该分类下存在申请记录，无法删除');
    }

    await this.prisma.premiumServiceCategory.delete({
      where: { id },
    });

    return ok({ success: true });
  }

  // ========== 高端管家图片上传接口 ==========

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传高端管家图片' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadPremiumImage(
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
      throw new BadRequestException('请选择要上传的文件');
    }

    // 使用 common/static 类型存储高端管家图片
    const key = this.storageService.generateUploadPath('common/static', file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }

  @Post('upload-multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // 最多10个文件
  @ApiOperation({ summary: '批量上传高端管家图片' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadMultiplePremiumImages(
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
      throw new BadRequestException('请选择要上传的文件');
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const key = this.storageService.generateUploadPath('common/static', file.originalname);
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
