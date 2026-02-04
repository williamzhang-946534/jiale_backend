import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { PrismaService } from './services/prisma.service';
import { RedisService } from './services/redis.service';
import { AuthService } from './services/auth.service';
import { AliyunStorageService } from './services/aliyun-storage.service';
import { AuditLogger } from './utils/audit-logger';
import { SensitiveDataMasker } from './utils/sensitive-data-masker';
import { DecimalUtils } from './utils/decimal-utils';
import { HttpExceptionFilter } from './filters/http-exception.filter';
import { LoggingInterceptor } from './interceptors/logging.interceptor';
import { AuthController } from './controllers/auth.controller';
import { PublicController } from './controllers/public.controller';
import { UploadController } from './controllers/upload.controller';
import { StorageService } from './interfaces/storage.interface';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'change-me',
    }),
  ],
  controllers: [AuthController, PublicController, UploadController],
  providers: [
    PrismaService,
    RedisService,
    AuthService,
    AliyunStorageService,
    AuditLogger,
    SensitiveDataMasker,
    DecimalUtils,
    HttpExceptionFilter,
    LoggingInterceptor,
    {
      provide: 'StorageService',
      useClass: AliyunStorageService,
    },
  ],
  exports: [
    PrismaService,
    RedisService,
    AuthService,
    AuditLogger,
    SensitiveDataMasker,
    DecimalUtils,
    JwtModule,
    'StorageService',
  ],
})
export class SharedModule {}


