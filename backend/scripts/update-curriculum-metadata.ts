import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const updates: { title: string; level: 'BASLANGIC' | 'ORTA' | 'ILERI'; durationHours: number; description: string }[] = [
  {
    title: 'Finans Okuryazarlığı ve Para Yönetimi',
    level: 'BASLANGIC',
    durationHours: 10,
    description: 'Paranızı bilinçli yönetmeyi, yatırım alışkanlıkları oluşturmayı ve uzun vadeli finansal planlama yapmayı öğrenin.',
  },
  {
    title: 'Kripto Para ve Blockchain Uzmanlığı',
    level: 'BASLANGIC',
    durationHours: 8,
    description: 'Kripto ekosistemini, blockchain teknolojisini ve dijital varlıkların çalışma mantığını temelden ileri seviyeye keşfedin.',
  },
  {
    title: 'Borsa İstanbul Uzmanlık Programı',
    level: 'BASLANGIC',
    durationHours: 10,
    description: 'BIST piyasasını, hisse analizi yöntemlerini ve yerel piyasalara yönelik yatırım stratejilerini kapsamlı şekilde öğrenin.',
  },
  {
    title: 'Forex Uzmanlık Programı',
    level: 'BASLANGIC',
    durationHours: 10,
    description: 'Döviz piyasalarının dinamiklerini anlayın, küresel ekonomik gelişmeleri yorumlayın ve profesyonel işlem stratejileri geliştirin.',
  },
  {
    title: 'Risk Yönetimi ve Trading Psikolojisi',
    level: 'BASLANGIC',
    durationHours: 8,
    description: 'Sermayenizi korumayı, duygularınızı kontrol etmeyi ve sürdürülebilir işlem disiplini oluşturmayı öğrenin.',
  },
  {
    title: 'Teknik Analiz',
    level: 'ORTA',
    durationHours: 14,
    description: 'Grafikleri doğru okumayı, trendleri analiz etmeyi ve teknik göstergelerle güçlü işlem kararları almayı öğrenin.',
  },
  {
    title: 'Price Action',
    level: 'ORTA',
    durationHours: 12,
    description: 'Göstergelere bağlı kalmadan yalnızca fiyat hareketlerini okuyarak piyasayı analiz etmeyi öğrenin.',
  },
  {
    title: 'Wyckoff Metodu',
    level: 'ILERI',
    durationHours: 10,
    description: 'Arz-talep dengesi, akümülasyon ve dağıtım süreçlerini analiz ederek profesyonel piyasa döngülerini yorumlayın.',
  },
  {
    title: 'ICT 2022 - Temel Modeller',
    level: 'ILERI',
    durationHours: 6,
    description:
      'Piyasa yapısını, likiditeyi ve Fair Value Gap ile Order Block gibi PD Array kavramlarını öğrenerek kurumsal fiyat hareketini okumayı öğrenin.',
  },
  {
    title: 'ICT 2023 - Narrative Modelleri',
    level: 'ILERI',
    durationHours: 3,
    description: 'Market Maker modellerini ve haftalık narrative (senaryo) kurgusunu öğrenerek piyasanın büyük resmini önceden okumayı öğrenin.',
  },
  {
    title: 'ICT 2024 - Açılış Modelleri',
    level: 'ILERI',
    durationHours: 3,
    description: 'Opening gap, opening range ve zaman bazlı açılış modellerini kullanarak seans açılışlarındaki yüksek olasılıklı fırsatları yakalamayı öğrenin.',
  },
  {
    title: 'ICT 2025 - İleri Seviye Execution',
    level: 'ILERI',
    durationHours: 2,
    description: 'Pozisyon ölçeklendirme, çoklu zaman dilimi execution ve risk optimizasyonu gibi ileri seviye trade yönetimi tekniklerini uygulamayı öğrenin.',
  },
  {
    title: 'ICT 2026 - Uzman Seviye Execution',
    level: 'ILERI',
    durationHours: 2,
    description: 'Algoritmik fiyat dağıtımını, hassas giriş rafinasyonunu ve likidite haritalamayı uzman seviyede uygulamayı öğrenin.',
  },
];

async function main() {
  // Dizideki sıra, landing page'de gösterilecek `order` değerini de belirler
  // (1'den başlar) - genel programlar seviyeye göre, ICT serisi kendi içinde
  // 2022'den 2026'ya doğru en sonda.
  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    const program = await prisma.program.findFirst({ where: { title: u.title } });
    if (!program) {
      console.log(`! Program bulunamadı, atlanıyor: ${u.title}`);
      continue;
    }
    await prisma.program.update({
      where: { id: program.id },
      data: { level: u.level, durationHours: u.durationHours, description: u.description, order: i + 1 },
    });
    console.log(`= ${u.title} -> #${i + 1}, ${u.level}, ${u.durationHours} saat`);
  }
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
