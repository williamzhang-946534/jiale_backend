import {
  Controller,
  Get,
  Query,
  UseGuards,
  Patch,
  Param,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { ok } from '../shared/types/api-response';

@ApiTags('企业定制管理')
@ApiBearerAuth()
@Controller('admin/v1/enterprise')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminEnterpriseController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('inquiries')
  @ApiOperation({ summary: '企业定制询价列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async list(@Query() query: any) {
    const page = Number(query.page) || 1;
    const pageSize = Number(query.pageSize) || 20;
    const status = query.status as string | undefined;

    const where: any = {};
    if (status && status !== 'all') {
      where.status = status;
    }

    const [list, total] = await Promise.all([
      this.prisma.enterpriseInquiry.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.enterpriseInquiry.count({ where }),
    ]);

    return ok({ list, total, page, pageSize });
  }

  @Patch('inquiries/:id/status')
  @ApiOperation({ summary: '更新询价状态' })
  @ApiResponse({ status: 200, description: '成功' })
  async updateStatus(
    @Param('id') id: string,
    @Body() body: { status: string; assignedSalesId?: string },
  ) {
    const updated = await this.prisma.enterpriseInquiry.update({
      where: { id },
      data: {
        status: body.status,
        assignedSalesId: body.assignedSalesId,
      },
    });
    return ok(updated);
  }
}
