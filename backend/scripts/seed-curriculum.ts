import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

type LessonSeed = string;
type ModuleSeed = { title: string; lessons: LessonSeed[] };
type ProgramSeed = { title: string; level?: 'BASLANGIC' | 'ORTA' | 'ILERI'; modules: ModuleSeed[] };

const programs: ProgramSeed[] = [
  {
    title: 'Finans Okuryazarlığı ve Servet Yönetimi',
    modules: [
      {
        title: 'Modül 1 - Finansal Okuryazarlık',
        lessons: [
          'Para Nedir?',
          'Para Tarihi',
          'Finansal Okuryazarlık Nedir?',
          'Enflasyon',
          'Deflasyon',
          'Resesyon',
          'Stagflasyon',
          'Faiz Nedir?',
          'Faiz Türleri',
          'Merkez Bankası',
          'Para Politikası',
          'Maliye Politikası',
        ],
      },
      {
        title: 'Modül 2 - Yatırım Araçları',
        lessons: [
          'Yatırım Nedir?',
          'Risk ve Getiri',
          'Altın',
          'Ons Altın',
          'Gram Altın',
          'Döviz',
          'Eurobond',
          'Tahvil',
          'Bono',
          'Mevduat',
          'Yatırım Fonları',
          'BES',
        ],
      },
      {
        title: 'Modül 3 - Gayrimenkul',
        lessons: [
          'Konut Yatırımı',
          'Arsa Yatırımı',
          'Ticari Gayrimenkul',
          'Kira Çarpanı',
          'Amortisman',
          'Bölge Analizi',
          'Tapu Türleri',
          'İmar Bilgisi',
        ],
      },
      {
        title: 'Modül 4 - Makroekonomi',
        lessons: [
          'TÜFE',
          'ÜFE',
          'PMI',
          'İşsizlik Verisi',
          'Tarım Dışı İstihdam',
          'Faiz Kararları',
          'Dolar Endeksi (DXY)',
          'CDS',
          'Cari Açık',
          'Büyüme Verileri',
        ],
      },
      {
        title: 'Modül 5 - Kişisel Finans',
        lessons: ['Bütçe Yönetimi', 'Tasarruf', 'Borç Yönetimi', 'Kredi Notu', 'Acil Durum Fonu', 'Servet Planlaması'],
      },
    ],
  },
  {
    title: 'Kripto Para ve Blockchain Uzmanlığı',
    modules: [
      {
        title: 'Modül 1 - Kripto Temelleri',
        lessons: ['Blockchain', 'Bitcoin', 'Ethereum', 'Stablecoin', 'Altcoin', 'Layer 1', 'Layer 2', 'Token Türleri'],
      },
      {
        title: 'Modül 2 - Cüzdanlar',
        lessons: ['Hot Wallet', 'Cold Wallet', 'Seed Phrase', 'Güvenlik', 'Transfer İşlemleri'],
      },
      {
        title: 'Modül 3 - DeFi',
        lessons: ['DEX', 'CEX', 'Staking', 'Lending', 'Yield Farming', 'Liquidity Pool'],
      },
      {
        title: 'Modül 4 - Onchain',
        lessons: ['Wallet Analizi', 'Exchange Flow', 'SOPR', 'MVRV', 'Open Interest', 'Funding Rate'],
      },
    ],
  },
  {
    title: 'Borsa İstanbul Uzmanlık Programı',
    modules: [
      { title: 'Modül 1', lessons: ['BIST Yapısı', 'Endeksler', 'Hisse Türleri', 'Emir Tipleri'] },
      { title: 'Modül 2', lessons: ['Bilanço', 'Gelir Tablosu', 'Nakit Akışı', 'Özsermaye'] },
      { title: 'Modül 3', lessons: ['FK', 'PD/DD', 'FD/FAVÖK', 'ROE', 'ROA'] },
      { title: 'Modül 4', lessons: ['Temettü', 'Bedelli', 'Bedelsiz', 'Geri Alım'] },
    ],
  },
  {
    title: 'Forex Uzmanlık Programı',
    modules: [
      { title: 'Modül 1', lessons: ['Forex', 'Pariteler', 'Pip', 'Lot', 'Spread', 'Swap', 'Margin'] },
      { title: 'Modül 2', lessons: ['Kaldıraç', 'Risk', 'Haber Trading', 'Ekonomik Takvim'] },
    ],
  },
  {
    title: 'Teknik Analiz',
    modules: [
      {
        title: 'Modül 1 - Grafikler',
        lessons: ['Grafik Türleri', 'Candlestick', 'OHLC', 'Timeframe', 'Logaritmik Grafik'],
      },
      { title: 'Modül 2 - Trend', lessons: ['Trend', 'HH HL', 'LH LL', 'Trend Çizimi', 'Kanal'] },
      { title: 'Modül 3 - Destek Direnç', lessons: ['Yatay Seviye', 'Dinamik Destek', 'Pivot'] },
      {
        title: 'Modül 4 - Formasyonlar',
        lessons: ['Çift Tepe', 'Çift Dip', 'Omuz Baş Omuz', 'Bayrak', 'Flama', 'Üçgen'],
      },
      {
        title: 'Modül 5 - İndikatörler',
        lessons: ['RSI', 'MACD', 'EMA', 'SMA', 'Bollinger', 'ATR', 'Stochastic'],
      },
      { title: 'Modül 6 - Hacim', lessons: ['Volume', 'OBV', 'Volume Profile'] },
    ],
  },
  {
    title: 'Price Action',
    modules: [
      {
        title: 'Modül 1',
        lessons: ['Market Structure', 'Swing High', 'Swing Low', 'Breakout', 'Pullback'],
      },
      { title: 'Modül 2', lessons: ['Supply', 'Demand', 'Liquidity', 'Fake Breakout'] },
      { title: 'Modül 3', lessons: ['Entry', 'Stop', 'TP', 'RR'] },
    ],
  },
  {
    title: 'ICT Foundations',
    modules: [
      {
        title: 'Modül 1',
        lessons: [
          'ICT Terminolojisi',
          'Dealing Range',
          'Premium Discount',
          'Liquidity',
          'Market Structure',
          'BOS',
          'MSS',
          'CHOCH',
          'PD Arrays',
        ],
      },
    ],
  },
  {
    title: 'ICT Institutional Concepts',
    modules: [
      {
        title: 'Modül 1',
        lessons: ['Order Block', 'Refined Order Block', 'Breaker Block', 'Mitigation Block', 'Rejection Block'],
      },
      {
        title: 'Modül 2',
        lessons: [
          'Fair Value Gap',
          'Inverse FVG',
          'Balanced Price Range',
          'Liquidity Void',
          'Volume Imbalance',
          'Consequent Encroachment',
        ],
      },
      {
        title: 'Modül 3',
        lessons: [
          'Buy Side Liquidity',
          'Sell Side Liquidity',
          'Internal Liquidity',
          'External Liquidity',
          'Equal High',
          'Equal Low',
        ],
      },
    ],
  },
  {
    title: 'ICT Advanced Models',
    modules: [
      { title: 'Modül 1', lessons: ['AMD', 'Power of Three', 'OTE', 'SMT', 'CISD'] },
      {
        title: 'Modül 2',
        lessons: ['Killzone', 'Judas Swing', 'Silver Bullet', 'Turtle Soup', 'Unicorn', 'MMXM', 'Venom Model'],
      },
      {
        title: 'Modül 3',
        lessons: [
          'Multi Timeframe',
          'Daily Bias',
          'Weekly Bias',
          'Monthly Bias',
          'Execution Model',
          'Trade Management',
        ],
      },
    ],
  },
  {
    title: 'Wyckoff Metodu',
    modules: [
      {
        title: 'Modül 1',
        lessons: [
          'Composite Man',
          'Accumulation',
          'Distribution',
          'Spring',
          'Upthrust',
          'SOS',
          'SOW',
          'Wyckoff Schematics',
        ],
      },
    ],
  },
  {
    title: 'Risk Yönetimi ve Trading Psikolojisi',
    modules: [
      { title: 'Modül 1', lessons: ['Risk Yönetimi', 'Sermaye Yönetimi', 'Pozisyon Boyutu', 'Risk/Ödül'] },
      { title: 'Modül 2', lessons: ['Psikoloji', 'Disiplin', 'FOMO', 'Overtrading', 'Revenge Trade', 'Trading Planı'] },
    ],
  },
];

async function main() {
  for (const programSeed of programs) {
    let program = await prisma.program.findFirst({ where: { title: programSeed.title } });
    if (!program) {
      program = await prisma.program.create({ data: { title: programSeed.title } });
      console.log(`+ Program: ${program.title}`);
    } else {
      console.log(`= Program zaten var, atlanıyor: ${program.title}`);
    }

    for (let mi = 0; mi < programSeed.modules.length; mi++) {
      const moduleSeed = programSeed.modules[mi];
      let mod = await prisma.module.findFirst({ where: { programId: program.id, title: moduleSeed.title } });
      if (!mod) {
        mod = await prisma.module.create({
          data: { title: moduleSeed.title, programId: program.id, order: mi + 1 },
        });
        console.log(`  + Modül: ${mod.title}`);
      } else {
        console.log(`  = Modül zaten var, atlanıyor: ${mod.title}`);
      }

      for (let li = 0; li < moduleSeed.lessons.length; li++) {
        const lessonTitle = moduleSeed.lessons[li];
        const existingLesson = await prisma.lesson.findFirst({ where: { moduleId: mod.id, title: lessonTitle } });
        if (!existingLesson) {
          await prisma.lesson.create({
            data: { title: lessonTitle, moduleId: mod.id, order: li + 1 },
          });
          console.log(`    + Ders: ${lessonTitle}`);
        } else {
          console.log(`    = Ders zaten var, atlanıyor: ${lessonTitle}`);
        }
      }
    }
  }

  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
