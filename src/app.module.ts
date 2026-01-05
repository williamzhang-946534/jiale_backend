import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CustomerModule } from './modules/customer/customer.module';
import { ProviderModule } from './modules/provider/provider.module';
import { AdminModule } from './modules/admin/admin.module';
import { SharedModule } from './modules/shared/shared.module';
import { OrderModule } from './modules/order/order.module';
import { FinanceModule } from './modules/finance/finance.module';

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
})
export class AppModule {}


