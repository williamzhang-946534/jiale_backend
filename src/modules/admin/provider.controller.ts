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
          // 新增字段
          totalOrders: true,
          totalRevenue: true,
          walletBalance: true,
          withdrawableBalance: true,
          age: true,
          experience: true,
          zodiac: true,
          chineseZodiac: true,
          hometown: true,
          homeAddress: true,
          expectedSalary: true,
          actualSalary: true,
          providerTypes: true,
          serviceArea: true,
          isOnline: true,
          isRecommended: true,
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
      
      // 服务类型转换：枚举 -> 中文
      const typeMap: Record<string, string> = {
        'MATERNITY_NURSE': '月嫂',
        'CHILD_CARE_NURSE': '育儿嫂',
        'LIVE_IN_NANNY': '住家保姆',
        'CLEANING': '保洁',
        'HOUSEKEEPING': '清洁',
        'HOURLY_WORKER': '钟点工',
        'LAUNDRY_CARE': '洗护',
        'HOSPITAL_CARE': '医院看护',
        'ELDERLY_CARE': '老人护理',
        'COOKING': '烹饪',
        'TUTORING': '家教'
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
        
        // 新增字段
        totalOrders: provider.totalOrders || 0,
        totalRevenue: provider.totalRevenue?.toNumber() || 0,
        walletBalance: provider.walletBalance?.toNumber() || 0,
        withdrawableBalance: provider.withdrawableBalance?.toNumber() || 0,
        age: provider.age,
        experience: provider.experience,
        zodiac: provider.zodiac,
        chineseZodiac: provider.chineseZodiac,
        hometown: provider.hometown,
        homeAddress: provider.homeAddress,
        expectedSalary: provider.expectedSalary?.toNumber(),
        actualSalary: provider.actualSalary?.toNumber(),
        providerTypes: provider.providerTypes?.map((type: string) => typeMap[type] || type) || [],
        serviceArea: provider.serviceArea,
        isOnline: provider.isOnline || false,
        isRecommended: provider.isRecommended || false,
        
        // 正在服务的订单信息（需要额外查询）
        currentOrder: null, // TODO: 实现当前订单查询
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


