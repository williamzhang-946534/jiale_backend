import { Module, OnModuleInit } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomerModule } from './modules/customer/customer.module';
import { ProviderModule } from './modules/provider/provider.module';
import { AdminModule } from './modules/admin/admin.module';
import { SharedModule } from './modules/shared/shared.module';
import { OrderModule } from './modules/order/order.module';
import { FinanceModule } from './modules/finance/finance.module';
import { ProviderStatsService } from './modules/provider/provider-stats.service';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    SharedModule,
    OrderModule,
    FinanceModule,
    CustomerModule,
    ProviderModule,
    AdminModule,
  ],
  providers: [ProviderStatsService], // 🎯 添加到根模块以便在应用启动时使用
})
export class AppModule implements OnModuleInit {
  constructor(private readonly providerStatsService: ProviderStatsService) {}

  async onModuleInit() {
    console.log('🚀 应用启动，检查今日收入重置状态...');
    try {
      const result = await this.providerStatsService.ensureTodayEarningsReset();
      console.log(`✅ 今日收入重置检查完成，重置了 ${result.count} 个服务者`);
    } catch (error) {
      console.error('❌ 应用启动时今日收入重置检查失败:', error);
    }
  }
}


