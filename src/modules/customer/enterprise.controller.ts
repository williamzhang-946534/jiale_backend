import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { PrismaService } from '../shared/services/prisma.service';
import { ok } from '../shared/types/api-response';
import { JwtAuthGuard } from '../shared/guards/jwt-auth.guard';
import { RoleGuard } from '../shared/guards/role.guard';

@ApiTags('企业定制')
@Controller('v1/enterprise')
export class EnterpriseController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('services')
  @ApiOperation({ summary: '企业定制服务列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async services() {
    const categories = await this.prisma.enterpriseServiceCategory.findMany({
      where: { status: 'active' },
      orderBy: { sortOrder: 'asc' },
    });

    const services = await this.prisma.service.findMany({
      where: {
        status: 'active',
        enterpriseCategoryId: { not: null },
      },
      select: {
        id: true,
        name: true,
        description: true,
        price: true,
        enterpriseCategoryId: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const grouped = new Map<string, typeof services>();
    for (const s of services) {
      const key = s.enterpriseCategoryId as string;
      const arr = grouped.get(key) ?? [];
      arr.push(s);
      grouped.set(key, arr);
    }

    return ok({
      categories: categories.map((c) => ({
        id: c.id,
        name: c.name,
        description: c.description ?? '',
        icon: c.icon ?? '',
        services: (grouped.get(c.id) ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          description: s.description ?? '',
          basePrice: s.price.toNumber(),
        })),
      })),
    });
  }

  @Post('inquiry')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, new RoleGuard(['CUSTOMER']))
  @ApiOperation({ summary: '提交企业定制需求' })
  @ApiResponse({ status: 200, description: '成功' })
  async inquiry(
    @Req() req: any,
    @Body()
    body: {
      companyName: string;
      contactName: string;
      contactPhone: string;
      serviceIds: string[];
      area: number;
      address: string;
      requirements?: string;
    },
  ) {
    if (
      !body?.companyName ||
      !body?.contactName ||
      !body?.contactPhone ||
      !body?.serviceIds?.length ||
      !body?.area ||
      !body?.address
    ) {
      throw new BadRequestException('参数不完整');
    }

    const now = Math.floor(Date.now() / 1000); // 转换为秒级时间戳
    const inquiry = await this.prisma.enterpriseInquiry.create({
      data: {
        companyName: body.companyName,
        contactName: body.contactName,
        contactPhone: body.contactPhone,
        serviceIds: body.serviceIds,
        area: Number(body.area),
        address: body.address,
        requirements: body.requirements,
        status: 'pending',
        assignedSalesId: null,
        createdAt: now,
        updatedAt: now,
      },
    });

    return ok({
      success: true,
      inquiryId: inquiry.id,
    });
  }
}
