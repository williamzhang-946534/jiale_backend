import { Controller, Get, Param, Query, Post, Body, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { ProviderStatsService } from './provider-stats.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1/providers')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
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

  @Get(':id/weekly-stats')
  async getWeeklyStats(
    @Param('id') id: string,
    @Query('year') year?: number,
    @Query('week') week?: number,
  ) {
    const stats = await this.providerStatsService.getWeeklyStats(id, year, week);
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

  // 🆕 手动重置今日收入接口
  @Post('reset-today-earnings')
  async manualResetTodayEarnings(@Body() body: { providerId?: string }) {
    try {
      console.log('🔧 管理员手动重置今日收入...', body);
      
      const result = await this.providerStatsService.ensureTodayEarningsReset(body.providerId);
      
      return ok({
        message: '手动重置完成',
        affectedProviders: result.count,
        providerId: body.providerId || 'all',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ 手动重置失败:', error);
      return {
        code: 500,
        message: '手动重置失败: ' + (error as Error).message,
        data: null,
      };
    }
  }

  // 🆕 获取准确的今日收入接口
  @Get(':id/accurate-today-earnings')
  async getAccurateTodayEarnings(@Param('id') id: string) {
    try {
      const accurateEarnings = await this.providerStatsService.getAccurateTodayEarnings(id);
      
      return ok({
        providerId: id,
        todayEarnings: accurateEarnings,
        timestamp: new Date().toISOString(),
        dataSource: 'RealTime Calculation'
      });
    } catch (error) {
      console.error('❌ 获取准确今日收入失败:', error);
      return {
        code: 500,
        message: '获取准确今日收入失败: ' + (error as Error).message,
        data: null,
      };
    }
  }
}
