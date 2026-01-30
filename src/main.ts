import { NestFactory } from '@nestjs/core';
import { SwaggerModule, SwaggerCustomOptions } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './modules/shared/filters/http-exception.filter';
import { LoggingInterceptor } from './modules/shared/interceptors/logging.interceptor';
import { ZodValidationPipe } from './modules/shared/pipes/zod-validation.pipe';
import { swaggerConfig, swaggerCustomOptions } from './modules/shared/config/swagger.config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // /api/v1, /api/admin/v1
  app.setGlobalPrefix('api');

  // CORS配置 - 生产环境安全的Capacitor WebView策略
  const isProduction = process.env.NODE_ENV === 'production';
  
  app.enableCors({
    origin: (origin, callback) => {
      // 允许的Origin列表
      const allowedOrigins = [
        'https://localhost',
        'capacitor://localhost',
        'http://localhost'
      ];
      
      // 开发环境允许本地调试
      if (!isProduction) {
        allowedOrigins.push('http://localhost:3000', 'http://localhost:8080');
      }
      
      // 生产环境安全检查：如果origin为undefined（某些移动端请求）或在白名单中，则允许
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        // 静默拒绝，不抛出错误避免日志污染
        callback(null, false);
      }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
    credentials: true,
    preflightContinue: false,
    optionsSuccessStatus: 204,
    maxAge: 86400 // 24小时缓存预检请求结果
  });

  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(app.get(LoggingInterceptor));
  app.useGlobalPipes(new ZodValidationPipe());

  // Swagger配置
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, swaggerCustomOptions);

  await app.listen(process.env.PORT || 3000);
  console.log(`🚀 Application is running on: http://localhost:${process.env.PORT || 3000}`);
  console.log(`📚 API Documentation: http://localhost:${process.env.PORT || 3000}/api/docs`);
}

bootstrap();


