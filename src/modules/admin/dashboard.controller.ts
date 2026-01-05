import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard/stats')
  async stats() {
    const pendingProviders = await this.prisma.provider.count({
      where: { status: 'PENDING' },
    });
    const totalGmv = 125800.0;
    const todayOrders = 45;
    const activeUsers = 340;

    return ok({
      data: {
        totalGmv,
        todayOrders,
        pendingProviders,
        activeUsers,
      },
    });
  }

  @Get('dashboard/charts')
  async charts(@Query() query: any) {
    const range = query.range || 'week';
    return ok({
      data: {
        labels: ['周一', '周二', '周三', '周四', '周五', '周六', '周日'],
        orderValues: [12, 19, 9, 5, 22, 30, 18],
        revenueValues: [1200, 1900, 900, 500, 2200, 3000, 1800],
        range,
      },
    });
  }
}


