import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Req,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { Inject } from '@nestjs/common';
import { UploadType } from '../shared/interfaces/storage.interface';

@ApiTags('用户管理')
@Controller('customer/v1')
@UseGuards(JwtAuthGuard)
export class UserController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('StorageService') private readonly storageService: any,
  ) {}

  @Get('profile')
  @ApiOperation({ summary: '获取用户信息' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getProfile(@Req() req: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        level: true,
        points: true,
        walletBalance: true,
        createdAt: true,
      },
    });

    return ok(user);
  }

  @Patch('profile')
  @ApiOperation({ summary: '更新用户信息' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateProfile(
    @Req() req: any,
    @Body() body: {
      nickname?: string;
      avatarUrl?: string;
    },
  ) {
    const { nickname, avatarUrl } = body;

    const user = await this.prisma.user.update({
      where: { id: req.user.id },
      data: {
        nickname,
        avatarUrl,
      },
      select: {
        id: true,
        phone: true,
        nickname: true,
        avatarUrl: true,
        role: true,
        level: true,
        points: true,
        walletBalance: true,
        updatedAt: true,
      },
    });

    return ok(user);
  }

  @Post('avatar/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传用户头像' })
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

    const key = this.storageService.generateUploadPath(UploadType.USER_AVATAR, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    // 更新用户头像
    await this.prisma.user.update({
      where: { id: req.user.id },
      data: { avatarUrl: url },
    });

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }

  @Post('feedback/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传反馈文件' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadFeedbackFile(
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp|mp4|mov|avi|mp3|wav)$/ }),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const key = this.storageService.generateUploadPath(UploadType.FEEDBACK_FILES, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }
}
