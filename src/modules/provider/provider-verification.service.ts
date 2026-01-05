import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';

@Injectable()
export class ProviderVerificationService {
  constructor(private readonly prisma: PrismaService) {}

  private addWatermark(url: string): string {
    if (!url) return url;
    const hasQuery = url.includes('?');
    return `${url}${hasQuery ? '&' : '?'}watermark=1`;
  }

  async getProviderDetailForAdmin(id: string) {
    const provider = await this.prisma.provider.findUnique({
      where: { id },
    });
    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }
    
    // 处理证书文件 - 直接返回图片地址数组
    let certFiles: string[] = [];
    if (provider.certFiles) {
      const certData = provider.certFiles as any;
      
      // 如果已经是字符串数组，直接使用
      if (Array.isArray(certData) && typeof certData[0] === 'string') {
        certFiles = certData;
      }
      // 如果是对象数组，提取url字段
      else if (Array.isArray(certData) && certData[0]?.url) {
        certFiles = certData.map(item => item.url);
      }
      // 如果是单个字符串，转换为数组
      else if (typeof certData === 'string') {
        certFiles = [certData];
      }
    }
    
    return {
      ...provider,
      idCardImageUrl: this.addWatermark(provider.idCardImageUrl || ''),
      certFiles: certFiles.map(url => this.addWatermark(url)),
    };
  }
}


