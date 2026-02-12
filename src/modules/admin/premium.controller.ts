import {
  BadRequestException,
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';

@ApiTags('高端管家管理')
@ApiBearerAuth()
@Controller('admin/v1/premium')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminPremiumController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('categories')
  @ApiOperation({ summary: '获取高端管家服务分类列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async getCategories() {
    const categories = await this.prisma.premiumServiceCategory.findMany({
      where: { status: 'active' },
      orderBy: { sortOrder: 'asc' },
    });

    return ok({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        tag: c.tag ?? '',
        description: c.description ?? '',
        image: c.image ?? '',
        requirements: {
          minServiceHours: c.minServiceHours,
          advanceBookingDays: c.advanceBookingDays,
          depositAmount: c.depositAmount.toNumber(),
        },
      })),
    });
  }
}
