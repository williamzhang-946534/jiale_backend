const { PrismaClient } = require('@prisma/client');

async function checkSpecialOffer() {
  const prisma = new PrismaClient();
  
  try {
    console.log('检查 SpecialOffer 表是否存在...\n');
    
    // 尝试查询 SpecialOffer 表
    try {
      const count = await prisma.specialOffer.count();
      console.log(`✅ SpecialOffer 表存在，当前记录数: ${count}`);
      
      // 查询几条记录
      const offers = await prisma.specialOffer.findMany({
        take: 3,
        orderBy: { createdAt: 'desc' }
      });
      
      console.log('\n示例数据:');
      offers.forEach(offer => {
        console.log(`- ${offer.name} (${offer.category}) - ¥${offer.price}`);
      });
      
    } catch (error) {
      console.log('❌ SpecialOffer 表不存在或无法访问');
      console.log('错误信息:', error.message);
    }
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSpecialOffer();
