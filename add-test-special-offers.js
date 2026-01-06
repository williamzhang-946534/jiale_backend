const { PrismaClient } = require('@prisma/client');

async function addTestSpecialOffers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('添加测试特惠数据...\n');
    
    const testOffers = [
      {
        name: '金牌月嫂套餐',
        category: '月嫂服务',
        price: 8888.00,
        unit: '月',
        rating: 4.9,
        image: 'https://example.com/maternity.jpg',
        description: '专业月嫂服务，包含新生儿护理、产妇照料、月子餐制作',
        providerCount: 25,
        tags: ['金牌月嫂', '新生儿护理', '月子餐'],
        status: 'active',
        sortOrder: 1,
      },
      {
        name: '日常保洁套餐',
        category: '保洁服务',
        price: 128.00,
        unit: '次',
        rating: 4.7,
        image: 'https://example.com/cleaning.jpg',
        description: '家庭日常保洁，包含厨房、卫生间、客厅清洁',
        providerCount: 50,
        tags: ['日常保洁', '家庭清洁', '深度清洁'],
        status: 'active',
        sortOrder: 2,
      },
      {
        name: '育儿嫂服务',
        category: '育儿服务',
        price: 6666.00,
        unit: '月',
        rating: 4.8,
        image: 'https://example.com/childcare.jpg',
        description: '专业育儿嫂，负责婴幼儿日常照料、早教启蒙',
        providerCount: 18,
        tags: ['育儿嫂', '婴幼儿照料', '早教'],
        status: 'active',
        sortOrder: 3,
      },
    ];
    
    for (const offer of testOffers) {
      const created = await prisma.specialOffer.create({
        data: offer,
      });
      console.log(`✅ 创建特惠: ${created.name}`);
    }
    
    console.log('\n🎉 测试数据添加完成！');
    
  } catch (error) {
    console.error('❌ 添加失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addTestSpecialOffers();
