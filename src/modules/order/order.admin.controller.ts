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

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminOrderController {
  constructor(private readonly orderService: OrderService) {}

  @Get('orders')
  async list(@Query() query: any) {
    const { list, total } = await this.orderService.listAdminOrders({
      status: query.status,
      keyword: query.keyword,
      page: Number(query.page) || 1,
      pageSize: Number(query.pageSize) || 20,
    });
    return ok({ list, total });
  }

  @Post('orders/:id/assign')
  async assign(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { providerId: string },
  ) {
    await this.orderService.assignOrder({
      adminId: req.user.id,
      orderId: id,
      providerId: body.providerId,
    });
    return ok(null);
  }
}


