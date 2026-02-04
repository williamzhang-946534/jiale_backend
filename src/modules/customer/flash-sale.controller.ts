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

function toHHmm(d: Date) {
  return d.toTimeString().slice(0, 5);
}

@ApiTags('闪购秒杀')
@Controller('v1/flash-sale')
export class FlashSaleController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('sessions')
  @ApiOperation({ summary: '闪购场次列表' })
  @ApiResponse({ status: 200, description: '成功' })
  async sessions() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const sessions = await this.prisma.flashSaleSession.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        products: {
          where: { status: 'active' },
          include: { service: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const data = sessions.map((s) => {
      const start = s.startTime;
      const end = s.endTime;
      const current = toHHmm(now);
      const status = current > end ? 'ended' : current >= start ? 'active' : 'upcoming';

      return {
        id: s.id,
        startTime: start,
        endTime: end,
        status,
        products: s.products.map((p) => ({
          id: p.id,
          serviceId: p.serviceId,
          serviceName: p.service.name,
          originalPrice: p.service.price.toNumber(),
          flashPrice: p.flashPrice.toNumber(),
          stockTotal: p.stockTotal,
          stockSold: p.stockSold,
          image: p.service.images?.[0] || '',
        })),
      };
    });

    return ok({ sessions: data });
  }

  @Get('active')
  @ApiOperation({ summary: '当前活跃场次' })
  @ApiResponse({ status: 200, description: '成功' })
  async active() {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    const sessions = await this.prisma.flashSaleSession.findMany({
      where: {
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
      include: {
        products: {
          where: { status: 'active' },
          include: { service: true },
          orderBy: { sortOrder: 'asc' },
        },
      },
      orderBy: { sortOrder: 'asc' },
    });

    const current = toHHmm(now);
    const activeSession = sessions.find((s) => current >= s.startTime && current <= s.endTime);
    if (!activeSession) {
      return ok({ sessionId: null, endTime: null, products: [] });
    }

    const endTime = new Date(startOfDay);
    const [h, m] = activeSession.endTime.split(':').map((x) => parseInt(x, 10));
    endTime.setHours(h, m, 0, 0);

    return ok({
      sessionId: activeSession.id,
      endTime: endTime.toISOString(),
      products: activeSession.products.map((p) => ({
        id: p.id,
        serviceId: p.serviceId,
        serviceName: p.service.name,
        originalPrice: p.service.price.toNumber(),
        flashPrice: p.flashPrice.toNumber(),
        stockTotal: p.stockTotal,
        stockSold: p.stockSold,
        image: p.service.images?.[0] || '',
      })),
    });
  }

  @Post('participate')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, new RoleGuard(['CUSTOMER']))
  @ApiOperation({ summary: '参与闪购（创建订单）' })
  @ApiResponse({ status: 200, description: '成功' })
  async participate(
    @Req() req: any,
    @Body()
    body: {
      productId: string;
      addressId: string;
      serviceDate: string;
      serviceTime: string;
    },
  ) {
    if (!body?.productId || !body?.addressId || !body?.serviceDate || !body?.serviceTime) {
      throw new BadRequestException('参数不完整');
    }

    const product = await this.prisma.flashSaleProduct.findUnique({
      where: { id: body.productId },
      include: { service: true, session: true },
    });
    if (!product || product.status !== 'active') {
      throw new BadRequestException('闪购商品不存在');
    }

    const now = new Date();
    const current = toHHmm(now);
    if (current < product.session.startTime || current > product.session.endTime) {
      throw new BadRequestException('不在活动时间内');
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const updated = await tx.flashSaleProduct.update({
        where: { id: product.id },
        data: { stockSold: { increment: 1 } },
      });
      if (updated.stockSold > updated.stockTotal) {
        throw new BadRequestException('库存不足');
      }

      const address = await tx.address.findUnique({ where: { id: body.addressId } });
      if (!address || address.userId !== req.user.id) {
        throw new BadRequestException('地址无效');
      }

      const originalPrice = product.service.price;
      const totalPrice = product.flashPrice;
      const discount = originalPrice.minus(totalPrice);

      const orderNo = `ORD-${Date.now()}-${Math.floor(Math.random() * 9999)}`;
      const order = await tx.order.create({
        data: {
          orderNo,
          userId: req.user.id,
          serviceId: product.serviceId,
          addressId: address.id,
          status: 'PENDING',
          serviceDate: new Date(body.serviceDate),
          serviceTime: body.serviceTime,
          originalPrice,
          discount,
          totalPrice,
          timeline: {
            created: new Date().toISOString(),
            source: 'flash_sale',
            productId: product.id,
            sessionId: product.sessionId,
          } as any,
        },
      });

      return order;
    });

    return ok({
      success: true,
      message: '参与成功',
      orderId: result.id,
    });
  }
}
