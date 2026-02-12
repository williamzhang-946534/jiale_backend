const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function findCategory() {
  try {
    const category = await prisma.serviceCategory.findFirst({
      where: { name: '保洁清洗' }
    });
    console.log('Category ID:', category?.id || 'Not found');
    console.log('Category Name:', category?.name);
  } catch (error) {
    console.log('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findCategory();
