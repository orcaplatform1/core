import { PrismaService } from '../src/prisma/prisma.service';
import { ScannerService } from '../src/scanner/scanner.service';

(async () => {
  const prisma = new PrismaService();
  await prisma.onModuleInit();
  const notificationsServiceStub = {} as any;
  const autoTradeServiceStub = {} as any;
  const scanner = new ScannerService(prisma, notificationsServiceStub, autoTradeServiceStub);

  console.log('scanDayTrade basliyor...');
  const results = await scanner.scanDayTrade();
  console.log(`scanDayTrade bitti. Bulunan sinyal sayisi: ${results.length}`);
  for (const s of results) {
    console.log(`- ${s.symbol} ${s.direction} pattern=${s.patternType} rr=${s.rr} strength=${s.strength}`);
  }

  await prisma.onModuleDestroy();
})();
