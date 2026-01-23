import { Controller, Get } from '@nestjs/common';
import { ok } from '../../shared/types/api-response';

@Controller('v1/public')
export class PublicController {
  @Get('health')
  async health() {
    return ok({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'jiale-backend',
      version: '1.0.0',
    });
  }

  @Get('providers/sample')
  async getSampleProviders() {
    // 返回示例服务者数据，无需权限
    const sampleProviders = [
      {
        id: "provider_1",
        name: "王阿姨",
        avatar: "https://example.com/avatar1.jpg",
        rating: 4.9,
        experience: 8,
        intro: "专业月嫂，有丰富的新生儿护理经验",
        expectedSalary: 10000,
        serviceTypes: ["MATERNITY_NURSE"],
        hometown: "河南郑州",
        isOnline: true,
      },
      {
        id: "provider_2", 
        name: "李阿姨",
        avatar: "https://example.com/avatar2.jpg",
        rating: 4.8,
        experience: 6,
        intro: "专业保姆，擅长家务和老人护理",
        expectedSalary: 8000,
        serviceTypes: ["NANNY", "ELDERLY_CARE"],
        hometown: "四川成都",
        isOnline: false,
      }
    ];

    return ok(sampleProviders);
  }
}
