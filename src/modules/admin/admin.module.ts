import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { AdminDashboardController } from './dashboard.controller';
import { AdminProviderController } from './provider.controller';
import { FinanceModule } from '../finance/finance.module';
import { AdminFinanceController } from './finance.controller';
import { ProviderVerificationService } from '../provider/provider-verification.service';
import { AdminUserController } from './admin-user.controller';
import { AdminSettingsController } from './admin-settings.controller';
import { AdminCategoryController } from './category.controller';
import { AdminServiceController } from './service.controller';
import { AdminOrderController } from './admin-order.controller';
import { AdminUserManagementController } from './admin-user-management.controller';
import { AdminMarketingController } from './marketing.controller';
import { ProviderStatsController } from './provider-stats.controller';
import { SystemSettingsController } from './system-settings.controller';
import { AdminEnterpriseController } from './enterprise.controller';
import { AdminPremiumController } from './premium.controller';
import { NewcomerAdminController } from './newcomer.controller';
import { FlashSaleAdminController } from './flash-sale.controller';

@Module({
  imports: [SharedModule, FinanceModule],
  controllers: [
    AdminDashboardController,
    AdminProviderController,
    AdminFinanceController,
    AdminUserController,
    AdminSettingsController,
    AdminCategoryController,
    AdminServiceController,
    AdminOrderController,
    AdminUserManagementController,
    AdminMarketingController,
    ProviderStatsController,
    SystemSettingsController,
    AdminEnterpriseController,
    AdminPremiumController,
    NewcomerAdminController,
    FlashSaleAdminController,
  ],
  providers: [ProviderVerificationService],
})
export class AdminModule {}


