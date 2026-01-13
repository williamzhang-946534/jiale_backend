import { DocumentBuilder, SwaggerCustomOptions } from '@nestjs/swagger';

export const swaggerConfig = new DocumentBuilder()
  .setTitle('家乐家政 API')
  .setDescription('家乐家政后端接口文档 - 提供用户端、服务端和后台管理功能')
  .setVersion('1.2.0')
  .setContact('家乐家政技术团队', 'support@jiale.com', 'https://jiale.com')
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .addBearerAuth({
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'JWT认证令牌',
    name: 'Authorization',
    in: 'header',
  })
  .addTag('用户端', '面向普通用户的接口')
  .addTag('服务端', '面向服务提供者的接口')
  .addTag('后台管理', '面向管理员的接口')
  .addTag('统一接口', '新增的统一接口')
  .addServer('http://localhost:3000', '开发环境')
  .addServer('https://api.jiale.com', '生产环境')
  .build();

export const swaggerCustomOptions: SwaggerCustomOptions = {
  customSiteTitle: '家乐家政 API 文档',
  customCss: `
    .swagger-ui .topbar { display: none }
    .swagger-ui .info { margin: 20px 0; }
    .swagger-ui .info .title { color: #3b82f6; }
    .swagger-ui .scheme-container { background: #f8f9fa; padding: 10px; border-radius: 5px; }
    .swagger-ui .opblock .opblock-summary { color: #3b82f6; }
  `,
  customfavIcon: '/favicon.ico',
  customJs: `
    console.log('欢迎使用家乐家政 API 文档');
  `,
};
