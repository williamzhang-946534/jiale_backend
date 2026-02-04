import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UnifiedHomeController } from './unified-home.controller';
import { ProfileController } from './profile.controller';
import { CategoryController } from './category.controller';
import { UnifiedServiceController } from './unified-service.controller';
import { UserController } from './user.controller';
import { NewcomerController } from './newcomer.controller';
import { FlashSaleController } from './flash-sale.controller';
import { EnterpriseController } from './enterprise.controller';
import { PremiumController } from './premium.controller';

@Module({
  imports: [SharedModule],
  controllers: [
    UnifiedHomeController,
    ProfileController,
    CategoryController,
    UnifiedServiceController,
    UserController,
    NewcomerController,
    FlashSaleController,
    EnterpriseController,
    PremiumController,
  ],
})
export class CustomerModule {}


