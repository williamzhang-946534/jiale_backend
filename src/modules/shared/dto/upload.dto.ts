import { IsEnum, IsOptional, IsString, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UploadType } from '../interfaces/storage.interface';

export class UploadFileDto {
  @ApiProperty({
    description: '上传文件类型',
    enum: UploadType,
    example: UploadType.USER_AVATAR,
  })
  @IsEnum(UploadType)
  type!: UploadType;

  @ApiPropertyOptional({
    description: '原始文件名（可选，用于获取文件扩展名）',
    example: 'avatar.jpg',
  })
  @IsOptional()
  @IsString()
  originalName?: string;
}

export class UploadMultipleFilesDto {
  @ApiProperty({
    description: '上传文件类型',
    enum: UploadType,
    example: UploadType.SERVICE_IMAGES,
  })
  @IsEnum(UploadType)
  type!: UploadType;

  @ApiPropertyOptional({
    description: '原始文件名（可选，用于获取文件扩展名）',
    example: 'service-image.jpg',
  })
  @IsOptional()
  @IsString()
  originalName?: string;

  @ApiPropertyOptional({
    description: '最大文件数量限制',
    example: 5,
  })
  @IsOptional()
  @IsString()
  maxCount?: string;
}

export class STSUploadDto {
  @ApiProperty({
    description: '上传路径前缀',
    example: 'mobile/avatars',
  })
  @IsString()
  prefix!: string;

  @ApiPropertyOptional({
    description: 'STS凭证过期时间（秒）',
    example: 3600,
    default: 3600,
  })
  @IsOptional()
  @IsString()
  expire?: string;
}

// 文件上传响应DTO
export class UploadResultDto {
  @ApiProperty({
    description: '文件存储key',
    example: 'mobile/avatars/2024/01/15/abc123-def456.jpg',
  })
  key!: string;

  @ApiProperty({
    description: '文件访问URL',
    example: 'https://zbhsc.oss-cn-beijing.aliyuncs.com/mobile/avatars/2024/01/15/abc123-def456.jpg',
  })
  url!: string;

  @ApiProperty({
    description: '文件大小（字节）',
    example: 102400,
  })
  size!: number;

  @ApiProperty({
    description: '文件MIME类型',
    example: 'image/jpeg',
  })
  contentType!: string;
}

export class STSCredentialsDto {
  @ApiProperty({
    description: 'STS AccessKeyId',
    example: 'STS.accesskey.id',
  })
  accessKeyId!: string;

  @ApiProperty({
    description: 'STS AccessKeySecret',
    example: 'STS.accesskey.secret',
  })
  accessKeySecret!: string;

  @ApiProperty({
    description: 'STS SecurityToken',
    example: 'STS.security.token',
  })
  securityToken!: string;

  @ApiProperty({
    description: '凭证过期时间',
    example: '2024-01-15T12:00:00Z',
  })
  expiration!: string;
}
