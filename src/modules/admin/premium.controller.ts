import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';
import { ok } from '../shared/types/api-response';

@ApiTags('高端管家管理')
@ApiBearerAuth()
@Controller('admin/v1/premium')
@UseGuards(JwtAuthGuard, new RoleGuard(['ADMIN']))
export class AdminPremiumController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('applications')
  @ApiOperation({ summary: '管家申请列表' })
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
      this.prisma.premiumApplication.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              phone: true,
              nickname: true,
            },
          },
          serviceCategory: true,
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.premiumApplication.count({ where }),
    ]);

    return ok({ list, total, page, pageSize });
  }

  @Post('applications/:id/approve')
  @ApiOperation({ summary: '通过申请' })
  @ApiResponse({ status: 200, description: '成功' })
  async approve(@Param('id') id: string) {
    const updated = await this.prisma.premiumApplication.update({
      where: { id },
      data: { status: 'approved' },
    });
    return ok(updated);
  }

  @Post('applications/:id/reject')
  @ApiOperation({ summary: '驳回申请' })
  @ApiResponse({ status: 200, description: '成功' })
  async reject(@Param('id') id: string, @Query('reason') reason?: string) {
    if (!reason) {
      throw new BadRequestException('reason 不能为空');
    }
    const updated = await this.prisma.premiumApplication.update({
      where: { id },
      data: { status: 'rejected', requirements: `REJECT_REASON: ${reason}` },
    });
    return ok(updated);
  }
}
