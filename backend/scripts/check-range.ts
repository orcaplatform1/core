import { PrismaClient } from '../generated/prisma/client';
const prisma = new PrismaClient();
(async () => {
  const symbols = ['ETHUSDT', 'BTCUSDT'];
  for (const s of symbols) {
    const count = await prisma.historicalCandle.count({ where: { symbol: s } });
    const oldest = await prisma.historicalCandle.findFirst({ where: { symbol: s }, orderBy: { timestamp: 'asc' } });
    const newest = await prisma.historicalCandle.findFirst({ where: { symbol: s }, orderBy: { timestamp: 'desc' } });
    console.log(s, '| adet:', count, '| en eski:', oldest?.timestamp, '| en yeni:', newest?.timestamp);
  }
  await prisma.$disconnect();
})();
