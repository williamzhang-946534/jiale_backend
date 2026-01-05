import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';
import { AuthService } from './services/auth.service';
import { AuditLogger } from './utils/audit-logger';
import { SensitiveDataMasker } from './utils/sensitive-data-masker';
import { DecimalUtils } from './utils/decimal-utils';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuthController } from './controllers/auth.controller';

@Global()
@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me',
    }),
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    RedisService,
    AuthService,
    AuditLogger,
    SensitiveDataMasker,
    DecimalUtils,
    HttpExceptionFilter,
    LoggingInterceptor,
  ],
  exports: [
    PrismaService,
    RedisService,
    AuthService,
    AuditLogger,
    SensitiveDataMasker,
    DecimalUtils,
    JwtModule,
  ],
})
export class SharedModule {}


