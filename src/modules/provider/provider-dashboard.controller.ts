import { Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER']))
export class ProviderDashboardController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('dashboard/stats')
  async stats(@Req() req: any) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: req.user.id },
    });
    return ok({
      rating: provider?.rating?.toNumber() ?? 4.9,
      todayEarnings: provider?.todayEarnings.toNumber() ?? 0,
      isOnline: true,
    });
  }

  @Post('status/toggle')
  async toggleStatus() {
    return ok(null);
  }
}


