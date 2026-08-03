import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();
(async () => {
  const deletedTracked = await prisma.trackedSignal.deleteMany({ where: { style: 'SWING' } });
  const deletedScans = await prisma.scanResult.deleteMany({ where: { style: 'SWING' } });
  console.log('Deleted TrackedSignal (style=SWING):', deletedTracked.count);
  console.log('Deleted ScanResult (style=SWING):', deletedScans.count);
  await prisma.$disconnect();
})();
