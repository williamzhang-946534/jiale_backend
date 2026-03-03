import { Injectable, BadRequestException, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

type CardType = 'DEBIT' | 'CREDIT';
type BankCardStatus = 'ACTIVE' | 'FROZEN' | 'EXPIRED';

@Injectable()
export class BankCardService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 获取银行卡列表
   */
  async getBankCards(providerUserId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    // 临时使用原始SQL查询避免Prisma模型问题
    try {
      const bankCards = await this.prisma.$queryRaw`
        SELECT id, bank_name, bank_code, masked_card_number, card_holder, card_type, is_default, status, created_at, last_used_at
        FROM bank_cards 
        WHERE provider_id = ${provider.id}
        ORDER BY is_default DESC, created_at DESC
      `;
      
      return ok(bankCards);
    } catch (error) {
      console.error('银行卡查询错误:', error);
      // 如果查询失败，返回空数组
      return ok([]);
    }
  }

  /**
   * 添加银行卡
   */
  async addBankCard(providerUserId: string, data: {
    bankName: string;
    bankCode: string;
    cardNumber: string;
    cardHolder: string;
    cardType: CardType;
  }) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    // 验证银行卡数量限制
    const cardCount = await this.prisma.bankCard.count({
      where: { providerId: provider.id },
    });

    if (cardCount >= 5) {
      throw new BadRequestException({ message: '最多只能绑定5张银行卡' });
    }

    // 验证银行卡号格式 (Luhn算法)
    if (!this.validateCardNumber(data.cardNumber)) {
      throw new BadRequestException({ message: '银行卡号格式不正确' });
    }

    // 验证持卡人姓名与服务者姓名一致
    if (data.cardHolder !== provider.name) {
      throw new BadRequestException({ message: '持卡人姓名与服务者实名认证姓名不一致' });
    }

    // 生成脱敏卡号
    const maskedCardNumber = this.maskCardNumber(data.cardNumber);

    // 检查是否已存在相同的银行卡
    const existingCard = await this.prisma.bankCard.findFirst({
      where: {
        providerId: provider.id,
        maskedCardNumber,
      },
    });

    if (existingCard) {
      throw new ConflictException({ message: '该银行卡已绑定' });
    }

    // 加密存储银行卡号 (这里简单处理，实际应该使用加密库)
    const encryptedCardNumber = this.encryptCardNumber(data.cardNumber);

    const bankCard = await this.prisma.$transaction(async (tx) => {
      // 如果是第一张卡，设置为默认卡
      const isDefault = cardCount === 0;

      const newCard = await tx.bankCard.create({
        data: {
          providerId: provider.id,
          bankName: data.bankName,
          bankCode: data.bankCode,
          cardNumber: encryptedCardNumber,
          maskedCardNumber,
          cardHolder: data.cardHolder,
          cardType: data.cardType as any, // 临时转换，等待Prisma生成
          isDefault,
          status: 'ACTIVE',
        },
        select: {
          id: true,
          bankName: true,
          maskedCardNumber: true,
          cardHolder: true,
          cardType: true,
          isDefault: true,
          status: true,
        },
      });

      return newCard;
    });

    return ok(bankCard);
  }

  /**
   * 设置默认银行卡
   */
  async setDefaultCard(providerUserId: string, cardId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    // 验证银行卡属于当前服务者
    const bankCard = await this.prisma.bankCard.findFirst({
      where: {
        id: cardId,
        providerId: provider.id,
      },
    });

    if (!bankCard) {
      throw new NotFoundException({ message: '银行卡不存在' });
    }

    await this.prisma.$transaction(async (tx) => {
      // 取消所有卡的默认状态
      await tx.bankCard.updateMany({
        where: { providerId: provider.id },
        data: { isDefault: false },
      });

      // 设置新的默认卡
      await tx.bankCard.update({
        where: { id: cardId },
        data: { isDefault: true },
      });
    });

    return ok(null);
  }

  /**
   * 删除银行卡
   */
  async deleteBankCard(providerUserId: string, cardId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    const bankCard = await this.prisma.bankCard.findFirst({
      where: {
        id: cardId,
        providerId: provider.id,
      },
    });

    if (!bankCard) {
      throw new NotFoundException({ message: '银行卡不存在' });
    }

    // 检查是否为默认卡
    if (bankCard.isDefault) {
      // 检查是否还有其他卡
      const otherCards = await this.prisma.bankCard.count({
        where: {
          providerId: provider.id,
          id: { not: cardId },
        },
      });

      if (otherCards > 0) {
        throw new BadRequestException({ message: '不能删除默认银行卡，请先设置其他银行卡为默认' });
      } else {
        throw new BadRequestException({ message: '不能删除唯一的银行卡' });
      }
    }

    // 检查是否有进行中的提现记录
    const activeWithdrawals = await this.prisma.withdrawalRecord.count({
      where: {
        bankCardId: cardId,
        status: { in: ['PENDING', 'PROCESSING'] },
      },
    });

    if (activeWithdrawals > 0) {
      throw new BadRequestException({ message: '该银行卡有进行中的提现记录，无法删除' });
    }

    await this.prisma.bankCard.delete({
      where: { id: cardId },
    });

    return ok(null);
  }

  /**
   * 更新银行卡信息
   */
  async updateBankCard(providerUserId: string, cardId: string, data: {
    cardHolder?: string;
    cardType?: CardType;
  }) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    const bankCard = await this.prisma.bankCard.findFirst({
      where: {
        id: cardId,
        providerId: provider.id,
      },
    });

    if (!bankCard) {
      throw new NotFoundException({ message: '银行卡不存在' });
    }

    // 如果更新持卡人姓名，验证与服务者姓名一致
    if (data.cardHolder && data.cardHolder !== provider.name) {
      throw new BadRequestException({ message: '持卡人姓名与服务者实名认证姓名不一致' });
    }

    const updatedCard = await this.prisma.bankCard.update({
      where: { id: cardId },
      data: {
        ...(data.cardHolder && { cardHolder: data.cardHolder }),
        ...(data.cardType && { cardType: data.cardType as any }), // 临时转换
      },
      select: {
        id: true,
        bankName: true,
        maskedCardNumber: true,
        cardHolder: true,
        cardType: true,
        isDefault: true,
        status: true,
        createdAt: true,
        lastUsedAt: true,
      },
    });

    return ok(updatedCard);
  }

  /**
   * 获取默认银行卡
   */
  async getDefaultBankCard(providerUserId: string) {
    const provider = await this.prisma.provider.findFirst({
      where: { userId: providerUserId },
    });

    if (!provider) {
      throw new NotFoundException({ message: '服务者不存在' });
    }

    const defaultCard = await this.prisma.bankCard.findFirst({
      where: {
        providerId: provider.id,
        isDefault: true,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        bankName: true,
        maskedCardNumber: true,
        cardHolder: true,
      },
    });

    return ok(defaultCard);
  }

  /**
   * 验证银行卡号 (Luhn算法)
   */
  private validateCardNumber(cardNumber: string): boolean {
    const cleaned = cardNumber.replace(/\s+/g, '');
    
    if (!/^\d+$/.test(cleaned) || cleaned.length < 13 || cleaned.length > 19) {
      return false;
    }

    let sum = 0;
    let isEven = false;

    for (let i = cleaned.length - 1; i >= 0; i--) {
      let digit = parseInt(cleaned[i]);

      if (isEven) {
        digit *= 2;
        if (digit > 9) {
          digit -= 9;
        }
      }

      sum += digit;
      isEven = !isEven;
    }

    return sum % 10 === 0;
  }

  /**
   * 脱敏处理银行卡号
   */
  private maskCardNumber(cardNumber: string): string {
    const cleaned = cardNumber.replace(/\s+/g, '');
    const last4 = cleaned.slice(-4);
    const groups = [];
    
    for (let i = 0; i < cleaned.length - 4; i += 4) {
      groups.push('****');
    }
    
    return [...groups, last4].join(' ');
  }

  /**
   * 加密银行卡号 (简化版，实际应使用专业加密库)
   */
  private encryptCardNumber(cardNumber: string): string {
    // 这里应该使用真正的加密算法，如AES
    // 为了演示，这里简单使用Base64编码
    return Buffer.from(cardNumber).toString('base64');
  }

  /**
   * 解密银行卡号 (简化版，实际应使用专业加密库)
   */
  private decryptCardNumber(encryptedCardNumber: string): string {
    // 这里应该使用真正的解密算法
    return Buffer.from(encryptedCardNumber, 'base64').toString();
  }
}
