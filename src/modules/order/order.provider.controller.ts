import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { ok } from '../shared/types/api-response';

@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER']))
export class ProviderOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('orders/active')
  async getActive(@Req() req: any) {
    const data = await this.orderService.getActiveOrderForProvider(
      req.user.id,
    );
    return ok(data);
  }

  @Get('orders/incoming')
  async incoming(@Req() req: any) {
    const data = await this.orderService.listIncomingOrders(req.user.id);
    return ok(data);
  }

  @Post('orders/:id/accept')
  async accept(@Req() req: any, @Param('id') id: string) {
    await this.orderService.acceptOrder(req.user.id, id);
    return ok(null);
  }

  @Post('orders/:id/arrive')
  async arrive(@Req() req: any, @Param('id') id: string) {
    await this.orderService.arriveOrder(req.user.id, id);
    return ok(null);
  }

  @Post('orders/:id/start')
  async start(@Req() req: any, @Param('id') id: string) {
    await this.orderService.startOrder(req.user.id, id);
    return ok(null);
  }

  @Post('orders/:id/complete')
  async complete(@Req() req: any, @Param('id') id: string) {
    await this.orderService.completeOrder(req.user.id, id);
    return ok(null);
  }
}


