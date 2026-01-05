import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { HomeController } from './home.controller';
import { ProfileController } from './profile.controller';
import { CategoryController } from './category.controller';
import { ServiceController } from './service.controller';

@Module({
  imports: [SharedModule],
  controllers: [HomeController, ProfileController, CategoryController, ServiceController],
})
export class CustomerModule {}


