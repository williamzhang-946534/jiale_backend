import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './modules/shared/filters/http-exception.filter';
import { LoggingInterceptor } from './modules/shared/interceptors/logging.interceptor';
import { ZodValidationPipe } from './modules/shared/pipes/zod-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // /api/v1, /api/admin/v1
  app.setGlobalPrefix('api');

  app.useGlobalFilters(app.get(HttpExceptionFilter));
  app.useGlobalInterceptors(app.get(LoggingInterceptor));
  app.useGlobalPipes(new ZodValidationPipe());

  await app.listen(process.env.PORT || 3000);
}

bootstrap();


