import { Module } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { FinanceService } from './finance.service';

@Module({
  imports: [SharedModule],
  providers: [FinanceService],
  exports: [FinanceService],
})
export class FinanceModule {}


