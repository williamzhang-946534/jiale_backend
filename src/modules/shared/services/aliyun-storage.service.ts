import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StorageService, UploadType, STSCredentials } from '../interfaces/storage.interface';
import { v4 as uuidv4 } from 'uuid';
import OSS = require('ali-oss');

@Injectable()
export class AliyunStorageService implements StorageService {
  private client: OSS;
  private bucket: string;
  private domain: string;

  constructor(private configService: ConfigService) {
    const accessKeyId = this.configService.get<string>('ALIYUN_ACCESS_KEY_ID');
    const accessKeySecret = this.configService.get<string>('ALIYUN_ACCESS_KEY_SECRET');
    
    if (!accessKeyId || !accessKeySecret) {
      throw new Error('阿里云OSS配置缺失: 请检查 ALIYUN_ACCESS_KEY_ID 和 ALIYUN_ACCESS_KEY_SECRET 环境变量');
    }
    
    this.bucket = this.configService.get<string>('ALIYUN_OSS_BUCKET') || 'zbhsc';
    this.domain = this.configService.get<string>('ALIYUN_OSS_DOMAIN') || 'zbhsc.oss-cn-beijing.aliyuncs.com';
    
    this.client = new OSS({
      region: this.configService.get<string>('ALIYUN_OSS_REGION') || 'oss-cn-beijing',
      accessKeyId: accessKeyId,
      accessKeySecret: accessKeySecret,
      bucket: this.bucket,
    });
  }

  async uploadFile(file: Buffer, key: string, contentType?: string): Promise<string> {
    try {
      const result = await this.client.put(key, file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'max-age=31536000', // 1年缓存
        },
      });
      
      return this.getFileUrl(key);
    } catch (error: any) {
      throw new Error(`文件上传失败: ${error.message}`);
    }
  }

  async deleteFile(key: string): Promise<void> {
    try {
      await this.client.delete(key);
    } catch (error: any) {
      throw new Error(`文件删除失败: ${error.message}`);
    }
  }

  getFileUrl(key: string): string {
    return `https://${this.domain}/${key}`;
  }

  generateUploadPath(type: UploadType, originalName?: string): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    
    const uuid = uuidv4();
    const ext = originalName ? originalName.split('.').pop() : '';
    
    // 基础路径: type/year/month/
    const basePath = `${type}/${year}/${month}`;
    
    // 文件名: uuid.ext
    const fileName = ext ? `${uuid}.${ext}` : uuid;
    
    return `${basePath}/${fileName}`;
  }

  // 生成STS临时凭证用于前端直传
  async generateSTSCredentials(prefix?: string, expire: number = 3600): Promise<STSCredentials> {
    // 注意：需要安装 @alicloud/sts20150401
    // 这里提供一个简化的实现，实际使用时需要根据STS SDK调整
    try {
      // 临时返回基础配置，实际项目中需要集成STS SDK
      return {
        accessKeyId: this.configService.get<string>('ALIYUN_ACCESS_KEY_ID') || '',
        accessKeySecret: this.configService.get<string>('ALIYUN_ACCESS_KEY_SECRET') || '',
        securityToken: '',
        expiration: new Date(Date.now() + expire * 1000).toISOString(),
      };
    } catch (error: any) {
      throw new Error(`STS凭证生成失败: ${error.message}`);
    }
  }

  // 批量删除文件
  async deleteFiles(keys: string[]): Promise<void> {
    try {
      const result = await this.client.deleteMulti(keys);
      if (result.deleted && result.deleted.length < keys.length) {
        const deleted = result.deleted.map((item: any) => item.Key);
        const failed = keys.filter(key => !deleted.includes(key));
        console.warn('部分文件删除失败:', failed);
      }
    } catch (error: any) {
      throw new Error(`批量删除文件失败: ${error.message}`);
    }
  }

  // 检查文件是否存在
  async fileExists(key: string): Promise<boolean> {
    try {
      await this.client.head(key);
      return true;
    } catch (error) {
      return false;
    }
  }

  // 获取文件信息
  async getFileInfo(key: string): Promise<OSS.HeadObjectResult> {
    try {
      return await this.client.head(key);
    } catch (error: any) {
      throw new Error(`获取文件信息失败: ${error.message}`);
    }
  }
}
