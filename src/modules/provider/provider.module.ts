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
import { BankCardService } from './bank-card.service';
import { BankCardController } from './bank-card.controller';
import { EnhancedWithdrawalService } from './enhanced-withdrawal.service';
import { WithdrawalController } from './withdrawal.controller';

@Module({
  imports: [SharedModule],
  providers: [
    ProviderVerificationService,
    ProviderStatsService,
    ProviderStatsScheduler,
    BankCardService,
    EnhancedWithdrawalService,
  ],
  controllers: [
    ProviderDashboardController,
    ProviderAuthController,
    ProviderProfileController,
    ProviderWalletController,
    ProviderStatsController,
    BankCardController,
    WithdrawalController,
  ],
  exports: [
    ProviderVerificationService,
    ProviderStatsService,
    BankCardService,
    EnhancedWithdrawalService,
  ],
})
export class ProviderModule {}


