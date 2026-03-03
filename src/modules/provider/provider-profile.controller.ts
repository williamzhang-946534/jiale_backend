import { 
  Body, 
  Controller, 
  Get, 
  Put, 
  Req, 
  UseGuards, 
  Post,
  UploadedFile,
  UseInterceptors,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { UploadType } from '../shared/interfaces/storage.interface';
import { ok } from '../shared/types/api-response';

// Custom file type validator
import { FileValidator } from '@nestjs/common';

class CustomFileTypeValidator extends FileValidator {
  constructor(private readonly allowedTypes: string[]) {
    super({});
  }
  
  isValid(file: any): boolean {
    return this.allowedTypes.includes(file.mimetype);
  }
  
  buildErrorMessage(): string {
    return `Invalid file type. Allowed types: ${this.allowedTypes.join(', ')}`;
  }
}

@ApiTags('服务者管理')
@Controller('v1/provider')
@UseGuards(JwtAuthGuard, new RoleGuard(['PROVIDER']))
export class ProviderProfileController {
  constructor(
    private readonly prisma: PrismaService,
    @Inject('StorageService') private readonly storageService: any,
  ) {}

  @Get('profile')
  async getProfile(@Req() req: any) {
    console.log('🔍 Profile API called for userId:', req.user.id);
    
    const provider = await this.prisma.provider.findFirst({
      where: {
        userId: req.user.id,
      },
      include: {
        user: true,
        _count: {
          select: {
            orders: true,
          },
        },
      },
    });

    console.log('🔍 Found provider:', {
      providerId: provider?.id,
      providerUserId: provider?.userId,
      userPhone: provider?.user?.phone,
      userNickname: provider?.user?.nickname
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    // 获取评价统计
    const reviews = await this.prisma.orderReview.findMany({
      where: {
        order: {
          providerId: provider.id,
        },
      },
    });

    const avgRating = reviews.length > 0 
      ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length 
      : 0;

    const data = {
      id: provider.id,
      name: provider.name,
      phone: provider.phone,
      avatar: provider.avatarUrl,
      intro: provider.intro,
      status: provider.status,
      rating: Number(avgRating.toFixed(1)),
      totalOrders: provider._count.orders,
      totalReviews: reviews.length,
      todayEarnings: provider.todayEarnings.toString(),
      walletBalance: provider.walletBalance.toString(),
      idCardNumber: provider.idCardNumber ? 
        provider.idCardNumber.substring(0, 6) + '********' + provider.idCardNumber.substring(provider.idCardNumber.length - 4) : '',
      certFiles: provider.certFiles,
      createdAt: provider.createdAt,
      user: provider.user,
    };

    return ok(data);
  }

  @Put('profile')
  async updateProfile(@Req() req: any, @Body() body: {
    name?: string;
    intro?: string;
    avatarUrl?: string;
  }) {
    const { name, intro, avatarUrl } = body;

    const provider = await this.prisma.provider.findFirst({
      where: {
        userId: req.user.id,
      },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    const updatedProvider = await this.prisma.provider.update({
      where: { id: provider.id },
      data: {
        name,
        intro,
        avatarUrl,
      },
    });

    return ok({
      id: updatedProvider.id,
      name: updatedProvider.name,
      intro: updatedProvider.intro,
      avatarUrl: updatedProvider.avatarUrl,
      updatedAt: updatedProvider.updatedAt,
    });
  }

  @Post('avatar/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传服务者头像' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadAvatar(
    @Req() req: any,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 2 * 1024 * 1024 }), // 2MB
          new FileTypeValidator({ fileType: /(jpg|jpeg|png|gif|webp)$/ }),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的头像');
    }

    const provider = await this.prisma.provider.findFirst({
      where: { userId: req.user.id },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    const key = this.storageService.generateUploadPath(UploadType.USER_AVATAR, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    // 更新服务者头像
    await this.prisma.provider.update({
      where: { id: provider.id },
      data: { avatarUrl: url },
    });

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }

  @Post('certification/upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: '上传认证材料' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 200, description: '上传成功' })
  async uploadCertificationFile(
    @Req() req: any,
    @Body() body: { type: 'idCard' | 'certificate' },
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), // 5MB
          new CustomFileTypeValidator(['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf']),
        ],
        errorHttpStatusCode: 400,
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file) {
      throw new BadRequestException('请选择要上传的文件');
    }

    const provider = await this.prisma.provider.findFirst({
      where: { userId: req.user.id },
    });

    if (!provider) {
      throw new Error('服务者账号不存在');
    }

    const key = this.storageService.generateUploadPath(UploadType.TEMP_FILES, file.originalname);
    const url = await this.storageService.uploadFile(file.buffer, key, file.mimetype);

    // 根据类型更新对应字段
    if (body.type === 'idCard') {
      await this.prisma.provider.update({
        where: { id: provider.id },
        data: { idCardImageUrl: url },
      });
    } else if (body.type === 'certificate') {
      // 证书文件存储为JSON数组
      const certFiles = provider.certFiles as any[] || [];
      certFiles.push({ url, uploadTime: new Date().toISOString() });
      
      await this.prisma.provider.update({
        where: { id: provider.id },
        data: { certFiles },
      });
    }

    return ok({
      key,
      url,
      size: file.size,
      contentType: file.mimetype,
    });
  }

  // 查看所有用户和服务者的对应关系
  @Get('debug-user-provider-mapping')
  async debugUserProviderMapping() {
    console.log('🔍 Debugging user-provider mapping...');
    
    // 获取所有用户
    const allUsers = await this.prisma.user.findMany({
      select: {
        id: true,
        phone: true,
        nickname: true,
        role: true,
      }
    });

    // 获取所有服务者
    const allProviders = await this.prisma.provider.findMany({
      include: {
        user: {
          select: {
            id: true,
            phone: true,
            nickname: true,
            role: true,
          }
        }
      }
    });

    const result = {
      users: allUsers,
      providers: allProviders.map(p => ({
        providerId: p.id,
        userId: p.userId,
        name: p.name,
        phone: p.phone,
        user: p.user,
        mismatch: p.userId !== p.user?.id
      })),
      summary: {
        totalUsers: allUsers.length,
        totalProviders: allProviders.length,
        providerUsers: allUsers.filter(u => u.role === 'PROVIDER').length,
        customerUsers: allUsers.filter(u => u.role === 'CUSTOMER').length,
        mismatchedProviders: allProviders.filter(p => p.userId !== p.user?.id).length,
      }
    };

    console.log('🔍 User-Provider Mapping Result:', result);
    return ok(result);
  }

  // 修复数据关联问题
  @Post('fix-data-relationships')
  async fixDataRelationships() {
    console.log('🔧 开始修复数据关联...');
    
    try {
      // 1. 为钱七创建正确的Provider记录
      const qianqiUser = await this.prisma.user.findFirst({
        where: { phone: '13800138005' }
      });
      
      if (qianqiUser && qianqiUser.role === 'PROVIDER') {
        // 检查是否已有Provider记录
        const existingProvider = await this.prisma.provider.findFirst({
          where: { userId: qianqiUser.id }
        });
        
        if (existingProvider) {
          // 更新现有记录
          const updatedProvider = await this.prisma.provider.update({
            where: { id: existingProvider.id },
            data: {
              name: '钱师傅',
              phone: '13800138005',
              status: 'VERIFIED',
              intro: '专业维修师傅，技术过硬，服务态度好',
              avatarUrl: 'https://example.com/avatar4.jpg',
              rating: 4.7,
              todayEarnings: 200.00,
              walletBalance: 1800.00,
              idCardNumber: '110101199003033445',
              certFiles: ['身份证.jpg', '技能证.jpg'],
            }
          });
          console.log('✅ 更新了钱七的Provider记录:', updatedProvider);
        } else {
          // 创建新记录
          const newProvider = await this.prisma.provider.create({
            data: {
              userId: qianqiUser.id,
              name: '钱师傅',
              phone: '13800138005',
              status: 'VERIFIED',
              intro: '专业维修师傅，技术过硬，服务态度好',
              avatarUrl: 'https://example.com/avatar4.jpg',
              rating: 4.7,
              todayEarnings: 200.00,
              walletBalance: 1800.00,
              idCardNumber: '110101199003033445',
              certFiles: ['身份证.jpg', '技能证.jpg'],
            }
          });
          console.log('✅ 为钱七创建了Provider记录:', newProvider);
        }
      }
      
      // 2. 为赵六创建正确的Provider记录
      const zhaoliuUser = await this.prisma.user.findFirst({
        where: { phone: '13800138004' }
      });
      
      if (zhaoliuUser && zhaoliuUser.role === 'PROVIDER') {
        const existingProvider = await this.prisma.provider.findFirst({
          where: { userId: zhaoliuUser.id }
        });
        
        if (existingProvider) {
          // 更新现有记录
          const updatedProvider = await this.prisma.provider.update({
            where: { id: existingProvider.id },
            data: {
              name: '赵师傅',
              phone: '13800138004',
              status: 'VERIFIED',
              intro: '专业家政服务，经验丰富',
              avatarUrl: 'https://example.com/avatar5.jpg',
              rating: 4.6,
              todayEarnings: 150.00,
              walletBalance: 1200.00,
              idCardNumber: '110101199004044556',
              certFiles: ['身份证.jpg', '家政证.jpg'],
            }
          });
          console.log('✅ 更新了赵六的Provider记录:', updatedProvider);
        } else {
          // 创建新记录
          const newProvider = await this.prisma.provider.create({
            data: {
              userId: zhaoliuUser.id,
              name: '赵师傅',
              phone: '13800138004',
              status: 'VERIFIED',
              intro: '专业家政服务，经验丰富',
              avatarUrl: 'https://example.com/avatar5.jpg',
              rating: 4.6,
              todayEarnings: 150.00,
              walletBalance: 1200.00,
              idCardNumber: '110101199004044556',
              certFiles: ['身份证.jpg', '家政证.jpg'],
            }
          });
          console.log('✅ 为赵六创建了Provider记录:', newProvider);
        }
      }
      
      // 3. 删除错误的Provider记录（张月嫂，因为张三是CUSTOMER）
      const wrongProvider = await this.prisma.provider.findFirst({
        where: { name: '张月嫂' }
      });
      
      if (wrongProvider) {
        await this.prisma.provider.delete({
          where: { id: wrongProvider.id }
        });
        console.log('✅ 删除了错误的Provider记录: 张月嫂');
      }
      
      console.log('🎉 数据修复完成！');
      return ok({ message: '数据关联修复完成' });
      
    } catch (error) {
      console.error('❌ 数据修复失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error('数据修复失败: ' + errorMessage);
    }
  }

  // 为钱师傅添加测试交易记录
  @Post('add-test-transactions')
  async addTestTransactions() {
    console.log('🔧 为钱师傅添加测试交易记录...');
    
    try {
      // 获取钱师傅的Provider记录
      const qianqiProvider = await this.prisma.provider.findFirst({
        where: { phone: '13800138005' }
      });
      
      if (!qianqiProvider) {
        throw new Error('找不到钱师傅的Provider记录');
      }
      
      // 添加最近几天的交易记录
      const transactions = [];
      
      // 今天
      transactions.push({
        type: 'INCOME' as const,
        amount: 150.00,
        beforeBalance: 1800.00,
        afterBalance: 1950.00,
        providerId: qianqiProvider.id,
        createdAt: new Date(),
      });
      
      // 昨天
      transactions.push({
        type: 'INCOME' as const,
        amount: 200.00,
        beforeBalance: 1600.00,
        afterBalance: 1800.00,
        providerId: qianqiProvider.id,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      });
      
      // 2天前
      transactions.push({
        type: 'INCOME' as const,
        amount: 180.00,
        beforeBalance: 1420.00,
        afterBalance: 1600.00,
        providerId: qianqiProvider.id,
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      });
      
      // 3天前
      transactions.push({
        type: 'INCOME' as const,
        amount: 220.00,
        beforeBalance: 1200.00,
        afterBalance: 1420.00,
        providerId: qianqiProvider.id,
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
      });
      
      // 批量创建交易记录
      await this.prisma.transaction.createMany({
        data: transactions
      });
      
      console.log('✅ 成功添加了', transactions.length, '条交易记录');
      return ok({ message: `成功添加了${transactions.length}条交易记录` });
      
    } catch (error) {
      console.error('❌ 添加交易记录失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error('添加交易记录失败: ' + errorMessage);
    }
  }

  // 为现有COMPLETED订单补充生成交易记录
  @Post('generate-missing-transactions')
  async generateMissingTransactions() {
    console.log('🔧 为现有COMPLETED订单补充生成交易记录...');
    
    try {
      // 获取钱师傅的Provider记录
      const qianqiProvider = await this.prisma.provider.findFirst({
        where: { phone: '13800138005' }
      });
      
      if (!qianqiProvider) {
        throw new Error('找不到钱师傅的Provider记录');
      }
      
      console.log('🔍 钱师傅Provider ID:', qianqiProvider.id);
      
      // 查找钱师傅的所有COMPLETED订单
      const completedOrders = await this.prisma.order.findMany({
        where: {
          providerId: qianqiProvider.id,
          status: 'COMPLETED'
        },
        include: {
          transactions: true
        }
      });
      
      console.log('🔍 找到', completedOrders.length, '个COMPLETED订单');
      
      // 特别检查1200元的订单
      const order1200 = await this.prisma.order.findFirst({
        where: {
          totalPrice: 1200,
          status: 'COMPLETED'
        },
        include: {
          transactions: true,
          provider: true
        }
      });
      
      if (order1200) {
        console.log('🔍 1200元订单详情:', {
          orderId: order1200.id,
          orderNo: order1200.orderNo,
          providerId: order1200.providerId,
          providerName: order1200.provider?.name,
          providerPhone: order1200.provider?.phone,
          transactionCount: order1200.transactions.length,
          transactions: order1200.transactions.map(t => ({
            type: t.type,
            amount: t.amount,
            createdAt: t.createdAt
          }))
        });
      }
      
      let generatedCount = 0;
      let currentBalance = qianqiProvider.walletBalance;
      
      for (const order of completedOrders) {
        // 检查是否已有交易记录
        const existingTransaction = order.transactions.find(t => t.type === 'INCOME');
        
        if (!existingTransaction) {
          const beforeBalance = currentBalance;
          const afterBalance = currentBalance.add(order.totalPrice);
          
          // 生成交易记录
          await this.prisma.transaction.create({
            data: {
              type: 'INCOME' as const,
              amount: order.totalPrice,
              beforeBalance: beforeBalance,
              afterBalance: afterBalance,
              providerId: qianqiProvider.id,
              orderId: order.id,
              createdAt: order.updatedAt, // 使用订单完成时间
            }
          });
          
          currentBalance = afterBalance;
          generatedCount++;
          console.log(`✅ 为订单 ${order.orderNo} 生成了交易记录，金额: ${order.totalPrice}`);
        }
      }
      
      // 更新Provider余额
      await this.prisma.provider.update({
        where: { id: qianqiProvider.id },
        data: { walletBalance: currentBalance }
      });
      
      console.log(`🎉 成功为 ${generatedCount} 个订单补充生成了交易记录`);
      return ok({ 
        message: `成功为${generatedCount}个订单补充生成了交易记录`,
        finalBalance: currentBalance.toString(),
        order1200Info: order1200 ? {
          hasTransaction: order1200.transactions.length > 0,
          providerId: order1200.providerId,
          qianqiProviderId: qianqiProvider.id
        } : null
      });
      
    } catch (error) {
      console.error('❌ 补充交易记录失败:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      throw new Error('补充交易记录失败: ' + errorMessage);
    }
  }
}
