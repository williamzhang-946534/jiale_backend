import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { UnifiedHomeController } from './unified-home.controller';
import { ProfileController } from './profile.controller';
import { CategoryController } from './category.controller';
import { UnifiedServiceController } from './unified-service.controller';

@Module({
  imports: [SharedModule],
  controllers: [UnifiedHomeController, ProfileController, CategoryController, UnifiedServiceController],
})
export class CustomerModule {}


