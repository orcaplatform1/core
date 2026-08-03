import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();
(async () => {
  const total = await prisma.trackedSignal.count();
  const byStyle = await prisma.trackedSignal.groupBy({ by: ['style'], _count: true });
  console.log('total all styles:', total);
  console.log(byStyle);
  const swingStatus = await prisma.trackedSignal.groupBy({ by: ['status'], where: { style: 'SWING' }, _count: true });
  console.log('SWING status breakdown:', swingStatus);
  await prisma.$disconnect();
})();
