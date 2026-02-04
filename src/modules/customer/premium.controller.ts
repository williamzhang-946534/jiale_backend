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

@ApiTags('高端管家')
@Controller('v1/premium')
export class PremiumController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('services')
  @ApiOperation({ summary: '高端管家服务类型' })
  @ApiResponse({ status: 200, description: '成功' })
  async services() {
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

  @Post('apply')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, new RoleGuard(['CUSTOMER']))
  @ApiOperation({ summary: '申请高端管家服务' })
  @ApiResponse({ status: 200, description: '成功' })
  async apply(
    @Req() req: any,
    @Body()
    body: {
      serviceId: string;
      contactInfo: { name: string; phone: string; email?: string };
      requirements?: string;
      budgetRange?: string;
    },
  ) {
    if (!body?.serviceId || !body?.contactInfo?.name || !body?.contactInfo?.phone) {
      throw new BadRequestException('参数不完整');
    }

    const category = await this.prisma.premiumServiceCategory.findUnique({
      where: { id: body.serviceId },
    });
    if (!category || category.status !== 'active') {
      throw new BadRequestException('服务不存在');
    }

    const application = await this.prisma.premiumApplication.create({
      data: {
        userId: req.user.id,
        serviceCategoryId: category.id,
        contactName: body.contactInfo.name,
        contactPhone: body.contactInfo.phone,
        contactEmail: body.contactInfo.email,
        requirements: body.requirements,
        budgetRange: body.budgetRange,
        status: 'pending',
      },
    });

    return ok({
      success: true,
      applicationId: application.id,
    });
  }
}
