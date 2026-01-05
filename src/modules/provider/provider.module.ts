import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { ProviderDashboardController } from './provider-dashboard.controller';
import { ProviderVerificationService } from './provider-verification.service';
import { ProviderAuthController } from './provider-auth.controller';
import { ProviderProfileController } from './provider-profile.controller';
import { ProviderWalletController } from './provider-wallet.controller';

@Module({
  imports: [SharedModule],
  providers: [ProviderVerificationService],
  controllers: [
    ProviderDashboardController,
    ProviderAuthController,
    ProviderProfileController,
    ProviderWalletController,
  ],
  exports: [ProviderVerificationService],
})
export class ProviderModule {}


