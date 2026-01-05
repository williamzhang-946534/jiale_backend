import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { OrderService } from './order.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { ok } from '../shared/types/api-response';

@Controller('v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['CUSTOMER']))
export class CustomerOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Post('orders/calculate')
  async calculate(@Req() req: any, @Body() body: any) {
    const data = await this.orderService.calculatePrice({
      userId: req.user.id,
      ...body,
    });
    return ok(data);
  }

  @Post('orders')
  async create(@Req() req: any, @Body() body: any) {
    const order = await this.orderService.createOrder({
      userId: req.user.id,
      ...body,
    });
    return ok({ orderId: order.id, payToken: order.orderNo });
  }

  @Get('user/orders')
  async list(@Req() req: any, @Query() query: any) {
    const { list, total } = await this.orderService.listUserOrders({
      userId: req.user.id,
      status: query.status,
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 20,
    });
    return ok({ list, total });
  }

  @Get('orders/:id')
  async detail(@Req() req: any, @Param('id') id: string) {
    const data = await this.orderService.getOrderDetailForUser(
      req.user.id,
      id,
    );
    return ok(data);
  }

  @Post('orders/:id/pay')
  async pay(@Req() req: any, @Param('id') id: string, @Body() body: any) {
    const data = await this.orderService.payOrder({
      userId: req.user.id,
      orderId: id,
      ...body,
      traceId: req.traceId,
    });
    return ok(data);
  }

  @Post('orders/:id/cancel')
  async cancel(@Req() req: any, @Param('id') id: string) {
    await this.orderService.cancelOrder({
      userId: req.user.id,
      orderId: id,
      traceId: req.traceId,
    });
    return ok(null);
  }

  @Post('orders/:id/review')
  async review(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { rating: number; content?: string },
  ) {
    await this.orderService.reviewOrder({
      userId: req.user.id,
      orderId: id,
      rating: body.rating,
      content: body.content,
    });
    return ok(null);
  }
}


