const { PrismaClient } = require('@prisma/client');

async function checkCertFiles() {
  const prisma = new PrismaClient();
  
  try {
    console.log('检查服务者的 certFiles 数据结构...\n');
    
    // 查询所有服务者的 certFiles
    const providers = await prisma.provider.findMany({
      select: {
        id: true,
        name: true,
        certFiles: true,
      }
    });
    
    providers.forEach(provider => {
      console.log(`服务者: ${provider.name} (${provider.id})`);
      console.log('certFiles 类型:', typeof provider.certFiles);
      console.log('certFiles 内容:', JSON.stringify(provider.certFiles, null, 2));
      console.log('---');
    });
    
  } catch (error) {
    console.error('❌ 检查失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCertFiles();
