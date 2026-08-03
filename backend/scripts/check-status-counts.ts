import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();
(async () => {
  const groups = await prisma.trackedSignal.groupBy({
    by: ['status'],
    where: { style: 'DAY' },
    _count: true,
  });
  console.log(groups);
  const total = await prisma.trackedSignal.count({ where: { style: 'DAY' } });
  console.log('total DAY signals:', total);
  const closed = await prisma.trackedSignal.count({ where: { style: 'DAY', closedAt: { not: null } } });
  console.log('closed DAY signals:', closed);
  await prisma.$disconnect();
})();
