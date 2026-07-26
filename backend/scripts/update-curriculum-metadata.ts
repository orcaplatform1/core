import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const updates: { title: string; level: 'BASLANGIC' | 'ORTA' | 'ILERI'; durationHours: number }[] = [
  { title: 'Finans Okuryazarlığı ve Servet Yönetimi', level: 'BASLANGIC', durationHours: 10 },
  { title: 'Kripto Para ve Blockchain Uzmanlığı', level: 'BASLANGIC', durationHours: 8 },
  { title: 'Borsa İstanbul Uzmanlık Programı', level: 'BASLANGIC', durationHours: 10 },
  { title: 'Forex Uzmanlık Programı', level: 'BASLANGIC', durationHours: 10 },
  { title: 'Teknik Analiz', level: 'ORTA', durationHours: 14 },
  { title: 'Price Action', level: 'ORTA', durationHours: 12 },
  { title: 'ICT Foundations', level: 'ILERI', durationHours: 10 },
  { title: 'ICT Institutional Concepts', level: 'ILERI', durationHours: 14 },
  { title: 'ICT Advanced Models', level: 'ILERI', durationHours: 12 },
  { title: 'Wyckoff Metodu', level: 'ILERI', durationHours: 10 },
  { title: 'Risk Yönetimi ve Trading Psikolojisi', level: 'ILERI', durationHours: 8 },
];

async function main() {
  for (const u of updates) {
    const program = await prisma.program.findFirst({ where: { title: u.title } });
    if (!program) {
      console.log(`! Program bulunamadı, atlanıyor: ${u.title}`);
      continue;
    }
    await prisma.program.update({
      where: { id: program.id },
      data: { level: u.level, durationHours: u.durationHours },
    });
    console.log(`= ${u.title} -> ${u.level}, ${u.durationHours} saat`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
