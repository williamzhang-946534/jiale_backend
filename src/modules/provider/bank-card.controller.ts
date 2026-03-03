import { 
  Controller, 
  Get, 
  Post, 
  Put, 
  Delete, 
  Body, 
  Param, 
  Req, 
  UseGuards,
  BadRequestException
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { BankCardService } from './bank-card.service';

@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER']))
export class BankCardController {
  constructor(private readonly bankCardService: BankCardService) {}

  /**
   * 获取银行卡列表
   */
  @Get('bank-cards')
  async getBankCards(@Req() req: any) {
    return this.bankCardService.getBankCards(req.user.id);
  }

  /**
   * 添加银行卡
   */
  @Post('bank-cards')
  async addBankCard(@Req() req: any, @Body() body: {
    bankName: string;
    bankCode: string;
    cardNumber: string;
    cardHolder: string;
    cardType: 'DEBIT' | 'CREDIT';
  }) {
    // 验证必需字段
    const requiredFields = ['bankName', 'bankCode', 'cardNumber', 'cardHolder', 'cardType'];
    for (const field of requiredFields) {
      if (!body[field as keyof typeof body]) {
        throw new BadRequestException({ message: `${field} 字段是必需的` });
      }
    }

    // 验证卡片类型
    if (!['DEBIT', 'CREDIT'].includes(body.cardType)) {
      throw new BadRequestException({ message: '卡片类型必须是 DEBIT 或 CREDIT' });
    }

    return this.bankCardService.addBankCard(req.user.id, body);
  }

  /**
   * 设置默认银行卡
   */
  @Put('bank-cards/:cardId/default')
  async setDefaultCard(@Req() req: any, @Param('cardId') cardId: string) {
    if (!cardId) {
      throw new BadRequestException({ message: '银行卡ID是必需的' });
    }

    return this.bankCardService.setDefaultCard(req.user.id, cardId);
  }

  /**
   * 删除银行卡
   */
  @Delete('bank-cards/:cardId')
  async deleteBankCard(@Req() req: any, @Param('cardId') cardId: string) {
    if (!cardId) {
      throw new BadRequestException({ message: '银行卡ID是必需的' });
    }

    return this.bankCardService.deleteBankCard(req.user.id, cardId);
  }

  /**
   * 更新银行卡信息
   */
  @Put('bank-cards/:cardId')
  async updateBankCard(
    @Req() req: any, 
    @Param('cardId') cardId: string,
    @Body() body: {
      cardHolder?: string;
      cardType?: 'DEBIT' | 'CREDIT';
    }
  ) {
    if (!cardId) {
      throw new BadRequestException({ message: '银行卡ID是必需的' });
    }

    // 验证卡片类型（如果提供）
    if (body.cardType && !['DEBIT', 'CREDIT'].includes(body.cardType)) {
      throw new BadRequestException({ message: '卡片类型必须是 DEBIT 或 CREDIT' });
    }

    return this.bankCardService.updateBankCard(req.user.id, cardId, body);
  }
}
