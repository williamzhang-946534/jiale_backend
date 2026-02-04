const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function checkBanners() {
  try {
    console.log('检查8080端口服务的数据库连接...');
    
    // 查询所有轮播图
    const allBanners = await prisma.banner.findMany();
    console.log('数据库中轮播图总数:', allBanners.length);
    
    if (allBanners.length > 0) {
      console.log('轮播图状态统计:');
      const statusCount = {};
      allBanners.forEach(banner => {
        statusCount[banner.status] = (statusCount[banner.status] || 0) + 1;
      });
      console.log(statusCount);
      
      console.log('\n轮播图详情:');
      allBanners.forEach(banner => {
        console.log(`ID: ${banner.id}, Status: ${banner.status}, Image: ${banner.imageUrl}`);
      });
    } else {
      console.log('数据库中没有轮播图数据！');
    }
    
  } catch (error) {
    console.error('数据库连接错误:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBanners();
