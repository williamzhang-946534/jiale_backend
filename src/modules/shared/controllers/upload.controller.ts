import {
  Controller,
  Post,
  UploadedFile,
  UploadedFiles,
  Body,
  UseInterceptors,
  BadRequestException,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  Inject,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { UploadType } from '../interfaces/storage.interface';
import { UploadFileDto, UploadMultipleFilesDto, STSUploadDto, UploadResultDto, STSCredentialsDto } from '../dto/upload.dto';
import { ok } from '../types/api-response';

@ApiTags('文件上传')
@Controller('upload')
export class UploadController {
  constructor(@Inject('StorageService') private readonly storageService: any) {}

  @Post('single')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '单文件上传' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功', type: UploadResultDto })
  async uploadSingleFile(
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
    @Body() uploadDto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const key = this.storageService.generateUploadPath(uploadDto.type, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }

  @Post('multiple')
  @UseInterceptors(FilesInterceptor('files', 10)) // 最多10个文件
  @ApiOperation({ summary: '多文件上传' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功', type: [UploadResultDto] })
  async uploadMultipleFiles(
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
    @Body() uploadDto: UploadMultipleFilesDto,
  ) {
    if (!files || files.length === 0) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const maxCount = uploadDto.maxCount ? parseInt(uploadDto.maxCount) : 10;
    if (files.length > maxCount) {
      throw new BadRequestException(`最多只能上传${maxCount}个文件`);
    }

    const results = await Promise.all(
      files.map(async (file) => {
        const key = this.storageService.generateUploadPath(uploadDto.type, file.originalname);
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

  @Post('sts-credentials')
  @ApiOperation({ summary: '获取STS临时凭证（用于前端直传）' })
  @ApiResponse({ status: 200, description: '获取成功', type: STSCredentialsDto })
  async getSTSCredentials(@Body() stsDto: STSUploadDto) {
    if ('AliyunStorageService' === this.storageService.constructor.name) {
      const credentials = await (this.storageService as any).generateSTSCredentials(
        stsDto.prefix,
        stsDto.expire ? parseInt(stsDto.expire) : 3600,
      );
      
      return ok(credentials);
    } else {
      throw new BadRequestException('当前存储服务不支持STS凭证');
    }
  }

  @Post('delete')
  @ApiOperation({ summary: '删除文件' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async deleteFile(@Body() body: { key: string }) {
    if (!body.key) {
      throw new BadRequestException('文件key不能为空');
    }

    await this.storageService.deleteFile(body.key);
    return ok(null);
  }

  @Post('batch-delete')
  @ApiOperation({ summary: '批量删除文件' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async batchDeleteFiles(@Body() body: { keys: string[] }) {
    if (!body.keys || body.keys.length === 0) {
      throw new BadRequestException('文件keys不能为空');
    }

    if ('AliyunStorageService' === this.storageService.constructor.name) {
      await (this.storageService as any).deleteFiles(body.keys);
    } else {
      // 如果不支持批量删除，则逐个删除
      await Promise.all(body.keys.map(key => this.storageService.deleteFile(key)));
    }

    return ok(null);
  }

  @Post('check-exists')
  @ApiOperation({ summary: '检查文件是否存在' })
  @ApiResponse({ status: 200, description: '检查结果' })
  async checkFileExists(@Body() body: { key: string }) {
    if (!body.key) {
      throw new BadRequestException('文件key不能为空');
    }

    let exists = false;
    if ('AliyunStorageService' === this.storageService.constructor.name) {
      exists = await (this.storageService as any).fileExists(body.key);
    } else {
      // 对于不支持检查的服务，尝试获取文件信息来判断
      try {
        await this.storageService.getFileUrl(body.key);
        exists = true;
      } catch {
        exists = false;
      }
    }

    return ok({ exists });
  }
}
