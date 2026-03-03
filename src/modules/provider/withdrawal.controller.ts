import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Query, 
  Param, 
  Req, 
  UseGuards,
  BadRequestException,
  Body
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { EnhancedWithdrawalService } from './enhanced-withdrawal.service';

type WithdrawalRecordStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CANCELLED';

@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER']))
export class WithdrawalController {
  constructor(private readonly withdrawalService: EnhancedWithdrawalService) {}

  /**
   * 申请提现
   */
  @Post('withdrawal/apply')
  async applyWithdrawal(@Req() req: any, @Body() body: {
    amount: number;
    bankCardId: string;
    remark?: string;
  }) {
    // 验证必需字段
    if (!body.amount || body.amount <= 0) {
      throw new BadRequestException({ message: '提现金额必须大于0' });
    }

    if (!body.bankCardId) {
      throw new BadRequestException({ message: '银行卡ID是必需的' });
    }

    return this.withdrawalService.applyWithdrawal(req.user.id, body);
  }

  /**
   * 获取提现记录列表
   */
  @Get('withdrawal/history')
  async getWithdrawalHistory(@Req() req: any, @Query() query: {
    page?: number;
    limit?: number;
    status?: WithdrawalRecordStatus;
    startDate?: string;
    endDate?: string;
  }) {
    // 验证分页参数
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(50, Math.max(1, query.limit || 10));

    // 验证状态参数
    if (query.status && !['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED'].includes(query.status)) {
      throw new BadRequestException({ message: '无效的状态参数' });
    }

    return this.withdrawalService.getWithdrawalHistory(req.user.id, {
      page,
      limit,
      status: query.status,
      startDate: query.startDate,
      endDate: query.endDate,
    });
  }

  /**
   * 计算提现手续费
   */
  @Get('withdrawal/fee')
  async getWithdrawalFee(@Query('amount') amount: string) {
    if (!amount) {
      throw new BadRequestException({ message: '金额参数是必需的' });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      throw new BadRequestException({ message: '金额必须是大于0的数字' });
    }

    return this.withdrawalService.getWithdrawalFee(amountNum);
  }

  /**
   * 获取提现详情
   */
  @Get('withdrawal/:withdrawalId')
  async getWithdrawalDetail(@Req() req: any, @Param('withdrawalId') withdrawalId: string) {
    if (!withdrawalId) {
      throw new BadRequestException({ message: '提现记录ID是必需的' });
    }

    return this.withdrawalService.getWithdrawalDetail(req.user.id, withdrawalId);
  }

  /**
   * 取消提现申请
   */
  @Put('withdrawal/:withdrawalId/cancel')
  async cancelWithdrawal(@Req() req: any, @Param('withdrawalId') withdrawalId: string) {
    if (!withdrawalId) {
      throw new BadRequestException({ message: '提现记录ID是必需的' });
    }

    return this.withdrawalService.cancelWithdrawal(req.user.id, withdrawalId);
  }
}
