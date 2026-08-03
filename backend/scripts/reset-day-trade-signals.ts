import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();
(async () => {
  const deletedTracked = await prisma.trackedSignal.deleteMany({ where: { style: 'DAY' } });
  const deletedScans = await prisma.scanResult.deleteMany({ where: { style: 'DAY' } });
  console.log('Deleted TrackedSignal (style=DAY):', deletedTracked.count);
  console.log('Deleted ScanResult (style=DAY):', deletedScans.count);
  await prisma.$disconnect();
})();
