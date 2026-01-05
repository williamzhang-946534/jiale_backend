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
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminFinanceController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly finance: FinanceService,
  ) {}

  @Get('finance/withdrawals')
  async withdrawals(@Query() query: any) {
    const status = query.status;
    const where = status ? { status } : {};
    const data = await this.prisma.withdrawal.findMany({ where });
    return ok({ data });
  }

  @Post('finance/withdrawals/:id/audit')
  async audit(
    @Param('id') id: string,
    @Body() body: { action: 'approve' | 'reject' },
    @Req() req: any,
  ) {
    const w = await this.finance.auditWithdrawal({
      adminId: req.user.id,
      id,
      action: body.action,
    });
    return ok(w);
  }

  @Post('orders/:id/refund')
  async refund(
    @Param('id') id: string,
    @Body()
    body: {
      amount: number;
      reason: string;
      type: 'full' | 'partial';
    },
    @Req() req: any,
  ) {
    await this.finance.refundOrder({
      adminId: req.user.id,
      orderId: id,
      amount: body.amount,
      reason: body.reason,
      type: body.type,
    });
    return ok(null);
  }
}


