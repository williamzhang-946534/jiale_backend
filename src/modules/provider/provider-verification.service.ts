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
    const certFiles = ((provider.certFiles as any) || []) as any[];
    return {
      ...provider,
      idCardImageUrl: this.addWatermark(provider.idCardImageUrl || ''),
      certFiles: certFiles.map((c) => ({
        ...c,
        url: this.addWatermark(c.url),
      })),
    };
  }
}


