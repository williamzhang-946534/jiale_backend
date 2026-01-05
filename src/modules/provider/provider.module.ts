import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ProviderDashboardController } from './provider-dashboard.controller';
import { ProviderVerificationService } from './provider-verification.service';
import { ProviderStatsService } from './provider-stats.service';
import { ProviderStatsScheduler } from './provider-stats.scheduler';
import { ProviderStatsController } from './provider-stats.controller';
import { ProviderAuthController } from './provider-auth.controller';
import { ProviderProfileController } from './provider-profile.controller';
import { ProviderWalletController } from './provider-wallet.controller';

@Module({
  imports: [SharedModule],
  providers: [
    ProviderVerificationService,
    ProviderStatsService,
    ProviderStatsScheduler,
  ],
  controllers: [
    ProviderDashboardController,
    ProviderAuthController,
    ProviderProfileController,
    ProviderWalletController,
    ProviderStatsController,
  ],
  exports: [
    ProviderVerificationService,
    ProviderStatsService,
  ],
})
export class ProviderModule {}


