import { Controller, Get, Param, Query, UseGuards, Patch, Body, Post } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ProviderVerificationService } from '../provider/provider-verification.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminProviderController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly providerVerification: ProviderVerificationService,
  ) {}

  @Get('providers')
  async list(@Query() query: any) {
    const status = query.status;
    const keyword = query.keyword;
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;

    const where: any = {};
    
    // 状态值转换：小写 -> 大写
    if (status) {
      const statusMap: Record<string, string> = {
        'unverified': 'UNVERIFIED',
        'pending': 'PENDING', 
        'verified': 'VERIFIED',
        'rejected': 'REJECTED'
      };
      
      if (status === 'banned') {
        // 查询已封禁的服务者
        where.isBanned = true;
      } else {
        where.status = statusMap[status] || status;
      }
    }
    
    if (keyword)
      where.OR = [
        { name: { contains: keyword } },
        { phone: { contains: keyword } },
      ];

    const [list, total] = await Promise.all([
      this.prisma.provider.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          name: true,
          phone: true,
          status: true,
          isBanned: true,
          createdAt: true,
          rating: true,
          intro: true,
        } as any,
        orderBy: {
          createdAt: 'desc',
        },
      }),
      this.prisma.provider.count({ where }),
    ]);

    // 格式化为文档要求的格式
    const formattedList = (list as any[]).map((provider: any) => {
      // 状态值转换：大写 -> 小写
      const statusMap: Record<string, string> = {
        'UNVERIFIED': 'unverified',
        'PENDING': 'pending',
        'VERIFIED': 'verified',
        'REJECTED': 'rejected'
      };
      
      return {
        id: provider.id,
        name: provider.name,
        phone: provider.phone,
        status: provider.isBanned ? 'banned' : (statusMap[provider.status] || provider.status?.toLowerCase()),
        isBanned: provider.isBanned,
        createTime: provider.createdAt?.toISOString(),
        rating: provider.rating?.toNumber() || 0,
        intro: provider.intro,
      };
    });

    return ok({
      list: formattedList,
      total,
      page,
      pageSize,
    });
  }

  @Get('providers/:id/detail')
  async detail(@Param('id') id: string) {
    const data = await this.providerVerification.getProviderDetailForAdmin(id);
    return ok(data);
  }

  @Patch('providers/:id/account-status')
  async updateAccountStatus(@Param('id') id: string, @Body() body: { isBanned: boolean }) {
    const provider = await this.prisma.provider.update({
      where: { id },
      data: { isBanned: body.isBanned } as any,
    });
    
    return ok({
      id: provider.id,
      isBanned: (provider as any).isBanned,
    });
  }

  @Post('providers/:id/audit')
  async auditProvider(@Param('id') id: string, @Body() body: { action: string; rejectReason?: string }) {
    const { action, rejectReason } = body;
    
    if (!['approve', 'reject'].includes(action)) {
      return {
        code: 400,
        message: 'Invalid action. Must be "approve" or "reject"',
        data: null,
      };
    }
    
    const updateData: any = {
      status: action === 'approve' ? 'VERIFIED' : 'REJECTED',
    };
    
    // 如果是拒绝，添加拒绝原因
    if (action === 'reject' && rejectReason) {
      updateData.rejectReason = rejectReason;
    }
    
    const provider = await this.prisma.provider.update({
      where: { id },
      data: updateData as any,
    });
    
    return ok({
      id: provider.id,
      status: (provider as any).status,
      action,
      rejectReason: action === 'reject' ? rejectReason : undefined,
    });
  }
}


