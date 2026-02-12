const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function initBasicData() {
  try {
    console.log('🔄 开始初始化基础数据...');
    
    // 1. 创建管理员账户
    const now = new Date();
    const admin = await prisma.adminUser.create({
      data: {
        id: 'admin_001',
        username: 'admin',
        password: 'admin123',
        name: '超级管理员',
        createdAt: now,
        updatedAt: now,
      },
    });
    console.log('✅ 管理员账户创建成功');

    // 2. 创建基础服务分类
    const categories = [
      { name: '保洁服务', sortOrder: 1 },
      { name: '月嫂服务', sortOrder: 2 },
      { name: '育儿服务', sortOrder: 3 },
      { name: '养老护理', sortOrder: 4 },
      { name: '家电维修', sortOrder: 5 },
    ];

    for (const cat of categories) {
      await prisma.serviceCategory.create({
        data: {
          name: cat.name,
          sortOrder: cat.sortOrder,
          status: 'active',
        },
      });
    }
    console.log('✅ 服务分类创建成功');

    // 3. 创建测试服务
    const testServices = [
      {
        name: '基础保洁服务',
        categoryId: (await prisma.serviceCategory.findFirst({ where: { name: '保洁服务' } })).id,
        price: 99.00,
        unit: '次',
        images: ['https://example.com/cleaning.jpg'],
        description: '专业家庭保洁服务',
        tags: ['保洁', '日常'],
        status: 'active',
      },
      {
        name: '金牌月嫂服务',
        categoryId: (await prisma.serviceCategory.findFirst({ where: { name: '月嫂服务' } })).id,
        price: 299.00,
        unit: '月',
        images: ['https://example.com/nanny.jpg'],
        description: '经验丰富金牌月嫂',
        tags: ['月嫂', '护理'],
        status: 'active',
      },
    ];

    for (const service of testServices) {
      await prisma.service.create({
        data: service,
      });
    }
    console.log('✅ 测试服务创建成功');

    console.log('🎉 基础数据初始化完成！');
    
  } catch (error) {
    console.error('❌ 初始化失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

initBasicData();
