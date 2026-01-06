import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';

@Controller('admin/v1/settings')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminSettingsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('admins')
  async listAdmins() {
    const list = await this.prisma.adminUser.findMany({
      select: {
        id: true,
        username: true,
        name: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    return ok({ list });
  }

  @Post('admins')
  async createAdmin(
    @Body() body: { username: string; password: string; name?: string },
  ) {
    const { username, password, name } = body;
    if (!username || !password) {
      throw new BadRequestException('用户名和密码不能为空');
    }

    const exists = await this.prisma.adminUser.findUnique({
      where: { username },
    });
    if (exists) {
      throw new BadRequestException('用户名已存在');
    }

    const admin = await this.prisma.adminUser.create({
      data: {
        username,
        password,
        name,
      },
    });
    return ok(admin);
  }

  @Get('membership')
  async getMembershipSettings() {
    // 这里简化处理，实际项目中应该有专门的设置表
    const settings = {
      levels: [
        {
          level: 1,
          name: '普通会员',
          price: 0,
          benefits: ['基础服务', '订单管理'],
        },
        {
          level: 2,
          name: '银卡会员',
          price: 99,
          benefits: ['基础服务', '订单管理', '专属客服', '95折优惠'],
        },
        {
          level: 3,
          name: '金卡会员',
          price: 199,
          benefits: ['基础服务', '订单管理', '专属客服', '9折优惠', '优先派单'],
        },
        {
          level: 4,
          name: '钻石会员',
          price: 399,
          benefits: ['基础服务', '订单管理', '专属客服', '85折优惠', '优先派单', '免费保洁'],
        },
      ],
    };
    return ok(settings);
  }

  @Put('membership')
  async updateMembershipSettings(@Body() body: any) {
    // 这里简化处理，实际项目中应该更新设置表
    // 可以创建一个 Settings 表来存储这些配置
    return ok(body);
  }

  @Get('system')
  async getSystemSettings() {
    // 这里简化处理，实际项目中应该从 Settings 表读取
    const settings = {
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
      announcement: '系统将于今晚22:00-23:00进行维护',
    };
    return ok(settings);
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
    // 这里简化处理，实际项目中应该更新 Settings 表
    const settings = {
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
      announcement: body.announcement || '',
      updateTime: new Date().toISOString(),
    };
    return ok(settings);
  }
}

