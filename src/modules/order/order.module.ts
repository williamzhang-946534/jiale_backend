import { MiddlewareConsumer, Module, RequestMethod } from '@nestjs/common';
import { SharedModule } from '../shared/shared.module';
import { OrderService } from './order.service';
import { CustomerOrderController } from './order.customer.controller';
import { ProviderOrderController } from './order.provider.controller';
import { AdminOrderController } from './order.admin.controller';
import { IdempotencyMiddleware } from '../shared/middleware/idempotency.middleware';

@Module({
  imports: [SharedModule],
  providers: [OrderService],
  controllers: [
    CustomerOrderController,
    ProviderOrderController,
    AdminOrderController,
  ],
  exports: [OrderService],
})
export class OrderModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(IdempotencyMiddleware)
      .forRoutes(
        { path: 'v1/orders/:id/pay', method: RequestMethod.POST },
        { path: 'v1/orders/:id/cancel', method: RequestMethod.POST },
        { path: 'v1/orders/:id/review', method: RequestMethod.POST },
        { path: 'admin/v1/orders/:id/refund', method: RequestMethod.POST },
      );
  }
}


