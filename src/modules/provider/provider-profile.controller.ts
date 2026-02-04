import { 
  Body, 
  Controller, 
  Get, 
  Put, 
  Req, 
  UseGuards, 
  Post,
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

@ApiTags('服务者管理')
@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER']))
export class ProviderProfileController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('StorageService') private readonly storageService: any,
  ) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    const provider = await this.prisma.provider.findFirst({
      where: {
        userId: req.user.id,
      },
      include: {
        user: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    // 获取评价统计
    const reviews = await this.prisma.orderReview.findMany({
      where: {
        order: {
          providerId: provider.id,
        },
      },
    });

    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 5.0;

    const data = {
      id: provider.id,
      name: provider.name,
      phone: provider.phone,
      avatar: provider.avatarUrl,
      intro: provider.intro,
      status: provider.status,
      rating: avgRating,
      totalOrders: provider._count.orders,
      totalReviews: reviews.length,
      todayEarnings: provider.todayEarnings,
      walletBalance: provider.walletBalance,
      idCardNumber: provider.idCardNumber ? 
        provider.idCardNumber.replace(/(\d{6})\d{8}(\d{4})/, '$1********$2') : null,
      certFiles: provider.certFiles,
      createdAt: provider.createdAt,
      user: {
        id: provider.user.id,
        phone: provider.user.phone,
        nickname: provider.user.nickname,
      },
    };

    return ok(data);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: {
    name?: string;
    intro?: string;
    avatarUrl?: string;
  }) {
    const { name, intro, avatarUrl } = body;

    const provider = await this.prisma.provider.findFirst({
      where: {
        userId: req.user.id,
      },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    const updatedProvider = await this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        name,
        intro,
        avatarUrl,
      },
    });

    return ok({
      id: updatedProvider.id,
      name: updatedProvider.name,
      intro: updatedProvider.intro,
      avatarUrl: updatedProvider.avatarUrl,
      updatedAt: updatedProvider.updatedAt,
    });
  }

  @Post('avatar/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传服务者头像' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的头像');
    }

    const provider = await this.prisma.provider.findFirst({
      where: { userId: req.user.id },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    const key = this.storageService.generateUploadPath(UploadType.USER_AVATAR, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    // 更新服务者头像
    await this.prisma.provider.update({
      where: { id: provider.id },
      data: { avatarUrl: url },
    });

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }

  @Post('certification/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传认证材料' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadCertificationFile(
    @Req() req: any,
    @Body() body: { type: 'idCard' | 'certificate' },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|pdf)$/ }),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const provider = await this.prisma.provider.findFirst({
      where: { userId: req.user.id },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    const key = this.storageService.generateUploadPath(UploadType.TEMP_FILES, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    // 根据类型更新对应字段
    if (body.type === 'idCard') {
      await this.prisma.provider.update({
        where: { id: provider.id },
        data: { idCardImageUrl: url },
      });
    } else if (body.type === 'certificate') {
      // 证书文件存储为JSON数组
      const certFiles = provider.certFiles as any[] || [];
      certFiles.push({ url, uploadTime: new Date().toISOString() });
      
      await this.prisma.provider.update({
        where: { id: provider.id },
        data: { certFiles },
      });
    }

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }
}
