import { Controller, Get, Put, Post, Body } from '@nestjs/common';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1/settings')
export class SystemSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('system')
  async getSystemSettings() {
    // 这里可以从系统设置表获取配置，目前返回模拟数据
    const systemSettings = {
      systemName: '家乐家政管理系统',
      systemVersion: 'v1.0.0',
      contactPhone: '400-123-4567',
      contactEmail: 'support@jiale.com',
      businessHours: '09:00-18:00',
      orderTimeout: 30,
      autoAssign: false,
      minOrderAmount: 50,
      serviceRadius: 50,
      maintenanceMode: false,
      announcement: '系统正常运行中'
    };

    return ok({
      data: systemSettings
    });
  }

  @Put('system')
  async updateSystemSettings(@Body() body: {
    contactPhone?: string;
    contactEmail?: string;
    businessHours?: string;
    orderTimeout?: number;
    autoAssign?: boolean;
    minOrderAmount?: number;
    serviceRadius?: number;
    maintenanceMode?: boolean;
    announcement?: string;
  }) {
    // 这里应该将设置保存到数据库或配置文件
    // 目前返回更新后的设置
    
    const updatedSettings = {
      systemName: '家乐家政管理系统',
      systemVersion: 'v1.0.0',
      contactPhone: body.contactPhone || '400-123-4567',
      contactEmail: body.contactEmail || 'support@jiale.com',
      businessHours: body.businessHours || '09:00-18:00',
      orderTimeout: body.orderTimeout || 30,
      autoAssign: body.autoAssign || false,
      minOrderAmount: body.minOrderAmount || 50,
      serviceRadius: body.serviceRadius || 50,
      maintenanceMode: body.maintenanceMode || false,
      announcement: body.announcement || '系统正常运行中',
      updateTime: new Date().toISOString()
    };

    return ok({
      data: updatedSettings,
      message: '系统设置更新成功'
    });
  }

  @Get('membership')
  async getMembershipSettings() {
    // 获取会员配置
    const membershipSettings = {
      levels: [
        {
          level: 1,
          name: '普通会员',
          price: 0,
          benefits: ['基础服务', '正常价格'],
          description: '享受基础家政服务'
        },
        {
          level: 2,
          name: '银卡会员',
          price: 99,
          benefits: ['基础服务', '9.5折优惠', '优先派单'],
          description: '享受折扣优惠和优先服务'
        },
        {
          level: 3,
          name: '金卡会员',
          price: 199,
          benefits: ['基础服务', '9折优惠', '优先派单', '专属客服'],
          description: '享受更多优惠和专属服务'
        }
      ],
      upgradeRules: {
        autoUpgrade: true,
        minOrders: [0, 10, 30],
        minSpent: [0, 1000, 3000]
      }
    };

    return ok({
      data: membershipSettings
    });
  }

  @Put('membership')
  async updateMembershipSettings(@Body() body: {
    levels?: Array<{
      level: number;
      name: string;
      price: number;
      benefits: string[];
      description: string;
    }>;
    upgradeRules?: {
      autoUpgrade: boolean;
      minOrders: number[];
      minSpent: number[];
    };
  }) {
    // 更新会员配置
    const updatedSettings = {
      levels: body.levels || [
        {
          level: 1,
          name: '普通会员',
          price: 0,
          benefits: ['基础服务', '正常价格'],
          description: '享受基础家政服务'
        }
      ],
      upgradeRules: body.upgradeRules || {
        autoUpgrade: true,
        minOrders: [0, 10, 30],
        minSpent: [0, 1000, 3000]
      },
      updateTime: new Date().toISOString()
    };

    return ok({
      data: updatedSettings,
      message: '会员配置更新成功'
    });
  }

  @Get('admins')
  async getAdminUsers() {
    // 获取管理员列表
    const admins = await this.prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true
      },
      orderBy: { createdAt: 'desc' }
    });

    return ok({
      data: admins
    });
  }

  @Post('admins')
  async createAdminUser(@Body() body: {
    username: string;
    password: string;
    name?: string;
  }) {
    // 创建管理员用户
    const { username, password, name } = body;

    // 这里应该对密码进行加密
    const hashedPassword = password; // 实际应该使用bcrypt加密

    const admin = await this.prisma.adminUser.create({
      data: {
        username,
        password: hashedPassword,
        name
      },
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true
      }
    });

    return ok({
      data: admin,
      message: '管理员创建成功'
    });
  }
}
