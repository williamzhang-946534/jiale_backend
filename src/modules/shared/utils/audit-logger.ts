import { Injectable } from '@nestjs/common';
import { PrismaService } from '../services/prisma.service';
import { UserRole } from '@prisma/client';

@Injectable()
export class AuditLogger {
  constructor(private readonly prisma: PrismaService) {}

  async log(params: {
    module: string;
    action: string;
    operatorId: string;
    operatorRole: UserRole;
    entityId?: string;
    detail?: any;
  }) {
    await this.prisma.auditLog.create({
      data: {
        module: params.module,
        action: params.action,
        operatorId: params.operatorId,
        operatorRole: params.operatorRole,
        entityId: params.entityId,
        detail: params.detail ?? {},
      },
    });
  }
}


