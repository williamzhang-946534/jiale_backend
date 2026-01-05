import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ProviderStatsService } from './provider-stats.service';

@Injectable()
export class ProviderStatsScheduler {
  constructor(private readonly providerStatsService: ProviderStatsService) {}

  /**
   * 每天凌晨0点重置服务者今日收入
   */
  @Cron('0 0 * * *') // 每天凌晨0点执行
  async resetDailyEarnings() {
    console.log('开始重置服务者今日收入...');
    await this.providerStatsService.resetDailyEarnings();
    console.log('服务者今日收入重置完成');
  }

  /**
   * 每天凌晨1点生成前一天的统计报告
   */
  @Cron('0 1 * * *') // 每天凌晨1点执行
  async generateDailyReport() {
    console.log('开始生成昨日统计报告...');
    // TODO: 实现统计报告生成逻辑
    console.log('昨日统计报告生成完成');
  }
}
