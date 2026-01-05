import { Controller, Get, Param, Query, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { ProviderStatsService } from './provider-stats.service';
import { ok } from '../shared/types/api-response';

@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER', 'ADMIN']))
export class ProviderStatsController {
  constructor(private readonly providerStatsService: ProviderStatsService) {}

  @Get(':id/daily-stats')
  async getDailyStats(
    @Param('id') id: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;
    
    const stats = await this.providerStatsService.getDailyStats(id, start, end);
    return ok(stats);
  }

  @Get(':id/monthly-stats')
  async getMonthlyStats(
    @Param('id') id: string,
    @Query('year') year: number,
    @Query('month') month: number,
  ) {
    const stats = await this.providerStatsService.getMonthlyStats(id, year, month);
    return ok(stats);
  }

  @Post(':id/update-stats')
  async updateStats(
    @Param('id') id: string,
    @Body() body: { orderAmount: number; orderType: string },
  ) {
    const { orderAmount, orderType } = body;
    
    if (!orderAmount || !orderType) {
      return {
        code: 400,
        message: 'orderAmount and orderType are required',
        data: null,
      };
    }

    const stats = await this.providerStatsService.updateDailyStats(id, orderAmount, orderType);
    return ok(stats);
  }
}
