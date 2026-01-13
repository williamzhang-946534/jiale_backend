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


