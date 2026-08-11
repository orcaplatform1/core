import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

type LessonSeed = string;
type ModuleSeed = { title: string; lessons: LessonSeed[] };
type ProgramSeed = { title: string; level?: 'BASLANGIC' | 'ORTA' | 'ILERI'; modules: ModuleSeed[] };

const programs: ProgramSeed[] = [
  {
    title: 'Finans Okuryazarlığı ve Para Yönetimi',
    modules: [
      // Jump$tart/CEE Ulusal Kişisel Finans Standartları'nın 5 sütunu
      // (Harcama-Tasarruf, Kredi-Borç, Gelir-Kariyer, Yatırım, Risk-Sigorta)
      // temel alınarak Türkiye'ye özgü araçlarla (Findeks, BES, DASK) uyarlanmıştır.
      {
        title: 'Modül 1 - Para Yönetimi ve Bütçeleme',
        lessons: [
          'Finansal Okuryazarlık Nedir?',
          'Gelir-Gider Analizi',
          'Bütçe Oluşturma (50/30/20 Kuralı)',
          'Tasarruf Alışkanlığı Oluşturma',
          'Acil Durum Fonu',
          'Finansal Hedef Belirleme',
          'Enflasyon ve Alım Gücü',
        ],
      },
      {
        title: 'Modül 2 - Borç ve Kredi Yönetimi',
        lessons: [
          'Kredi Nedir, Nasıl Çalışır?',
          'Kredi Notu ve Findeks',
          'Kredi Kartı Kullanımı ve Riskleri',
          'İhtiyaç Kredisi ve Taksitli Alışveriş',
          'Borç Kapatma Stratejileri',
          'Basit ve Bileşik Faiz Hesabı',
        ],
      },
      {
        title: 'Modül 3 - Gelir ve Kariyer Planlaması',
        lessons: [
          'Brüt/Net Maaş ve Vergi Dilimleri',
          'Ek Gelir Kaynakları',
          'Kariyer Planlama ve Gelir Artırma',
          'Serbest Meslek ve Girişimcilik Geliri',
          'Emeklilik Planlaması ve BES',
        ],
      },
      {
        title: 'Modül 4 - Yatırım ve Servet Oluşturma',
        lessons: [
          'Yatırımın Temel İlkeleri',
          'Bileşik Getirinin Gücü',
          'Risk ve Getiri Dengesi',
          'Temel Yatırım Araçlarına Giriş',
          'Portföy Çeşitlendirmesi',
          'Enflasyona Karşı Yatırım Stratejileri',
        ],
      },
      {
        title: 'Modül 5 - Risk Yönetimi ve Sigorta',
        lessons: [
          'Sigorta Mantığı: Prim, Poliçe, Teminat',
          'Hayat ve Sağlık Sigortası',
          'Kasko ve Trafik Sigortası',
          'Konut Sigortası (DASK)',
          'Finansal Dolandırıcılıktan Korunma',
          'Miras ve Servet Planlaması',
        ],
      },
    ],
  },
  {
    title: 'Kripto Para ve Blockchain Uzmanlığı',
    modules: [
      // Binance Academy / University of Nicosia Blockchain & Digital Assets track ve
      // standart üniversite blockchain müfredatları (Stanford CS251, Columbia B8462)
      // temel alınarak tasarlanmıştır. Genel teknik analiz, price action ve risk
      // yönetimi zaten ayrı programlarda işlendiği için burada tekrar edilmiyor;
      // bu program kriptoya özgü bilgiye odaklanıyor.
      {
        title: 'Modül 1 - Blockchain ve Kripto Temelleri',
        lessons: ['Blockchain Nedir?', 'Bitcoin ve Ethereum', 'Konsensüs Mekanizmaları (PoW/PoS)', 'Layer 1 ve Layer 2', 'Altcoin ve Token Türleri'],
      },
      {
        title: 'Modül 2 - Cüzdanlar ve Güvenlik',
        lessons: [
          'Hot Wallet ve Cold Wallet',
          'Seed Phrase ve Private Key Güvenliği',
          'Kripto Dolandırıcılık Türleri (Rug Pull, Phishing)',
          'Borsa (CEX) Güvenliği',
        ],
      },
      {
        title: 'Modül 3 - DeFi ve Token Ekonomisi',
        lessons: ['DEX ve CEX Farkı', 'Staking, Lending ve Yield Farming', 'Stablecoin Türleri', 'Tokenomics', 'NFT ve Kullanım Alanları'],
      },
      {
        title: 'Modül 4 - Kripto Piyasalarında Alım Satım',
        lessons: [
          'Spot ve Vadeli İşlem Farkı',
          'Kaldıraç ve Funding Rate',
          'Emir Tipleri (Limit/Market/Stop)',
          'Likidite ve Slippage',
          'Piyasa Manipülasyonu (Pump & Dump, Wash Trading)',
        ],
      },
      {
        title: 'Modül 5 - Onchain Analiz',
        lessons: ['Wallet Analizi ve Exchange Flow', 'SOPR ve MVRV', 'Open Interest', 'Whale Takibi'],
      },
    ],
  },
  {
    title: 'Borsa İstanbul Uzmanlık Programı',
    modules: [
      // SPK Sermaye Piyasası Faaliyetleri Düzey 1 lisans müfredatı ve piyasa temel
      // analiz eğitimlerinin (finansal tablo analizi, temettü, sektörel analiz,
      // portföy oluşturma) standart konu başlıkları temel alınmıştır. Grafik/
      // indikatör konuları zaten ayrı "Teknik Analiz" programında olduğu için
      // burada tekrar edilmiyor.
      {
        title: 'Modül 1 - BIST Piyasa Yapısı',
        lessons: ['BIST Yapısı ve Pazarlar', 'Endeksler (BIST100, BIST30)', 'Hisse Türleri', 'Emir Tipleri ve Seans Yapısı', 'Halka Arz (IPO) Süreci'],
      },
      {
        title: 'Modül 2 - Finansal Tablo Okuma',
        lessons: ['Bilanço', 'Gelir Tablosu', 'Nakit Akış Tablosu', 'Özsermaye ve Sermaye Yapısı'],
      },
      {
        title: 'Modül 3 - Değerleme ve Rasyo Analizi',
        lessons: ['F/K (Fiyat/Kazanç) Oranı', 'PD/DD (Piyasa Değeri/Defter Değeri)', 'FD/FAVÖK', 'ROE ve ROA', 'Sektörel Karşılaştırma'],
      },
      {
        title: 'Modül 4 - Kurumsal Aksiyonlar',
        lessons: ['Temettü ve Temettü Verimi', 'Bedelli Sermaye Artırımı', 'Bedelsiz Sermaye Artırımı', 'Hisse Geri Alım Programları'],
      },
      {
        title: 'Modül 5 - Portföy Oluşturma ve Yatırımcı Hakları',
        lessons: ['Sektör Analizi ve Çeşitlendirme', 'Portföy Oluşturma Stratejileri', 'Genel Kurul ve Oy Hakkı', 'Yatırımcı Koruma ve KAP Bildirimleri'],
      },
    ],
  },
  {
    title: 'Forex Uzmanlık Programı',
    modules: [
      // BabyPips School of Pipsology ve güncel forex eğitim programlarının standart
      // akışı (terminoloji -> pariteler/seanslar -> forex'e özgü temel analiz) temel
      // alınmıştır. Genel risk yönetimi/psikoloji "Risk Yönetimi ve Trading
      // Psikolojisi" programında, genel teknik analiz "Teknik Analiz" programında
      // olduğu için burada tekrar edilmiyor.
      {
        title: 'Modül 1 - Forex Piyasası ve Terminoloji',
        lessons: ['Forex Piyasası Nedir?', 'Pip ve Lot', 'Spread, Swap ve Komisyon', 'Kaldıraç ve Margin'],
      },
      {
        title: 'Modül 2 - Pariteler ve Seans Yapısı',
        lessons: ['Majör, Minör ve Egzotik Pariteler', 'Parite Korelasyonu', 'İşlem Seansları (Asya/Londra/New York)', 'Volatilite ve Likidite Saatleri'],
      },
      {
        title: "Modül 3 - Forex'te Temel Analiz",
        lessons: ['Ekonomik Takvim Okuma', 'Merkez Bankası Faiz Kararları ve Piyasa Etkisi', 'Haber Trading Stratejileri', 'Carry Trade'],
      },
    ],
  },
  {
    title: 'Risk Yönetimi ve Trading Psikolojisi',
    level: 'BASLANGIC',
    modules: [
      // Güncel risk yönetimi (pozisyon boyutlama, %1-2 kuralı, expectancy/R
      // çarpanı, drawdown limitleri) ve trading psikolojisi (bilişsel önyargılar,
      // FOMO, revenge trade, journaling, duygusal kontrol) eğitim müfredatları
      // temel alınmıştır. Kelly Kriteri BASLANGIC seviyesi için fazla
      // matematiksel bulunduğundan dışarıda bırakıldı. Trade bazlı RR oranı
      // yerleştirmesi zaten "Price Action" programının Pozisyon Yönetimi
      // modülünde var, burada tekrar edilmiyor.
      {
        title: 'Modül 1 - Risk ve Sermaye Yönetimi',
        lessons: [
          'Risk Yönetimi Nedir?',
          'Sermaye Yönetimi ve İşlem Başına Risk (%1-2 Kuralı)',
          'Pozisyon Boyutu Hesaplama',
          'Beklenti (Expectancy) ve R Çarpanı',
          'Drawdown Yönetimi',
        ],
      },
      {
        title: 'Modül 2 - Trading Psikolojisi Temelleri',
        lessons: [
          'Trading Psikolojisi Nedir?',
          'Bilişsel Önyargılar (Kayıptan Kaçınma, Doğrulama Yanlılığı, Aşırı Güven)',
          'FOMO (Kaçırma Korkusu)',
          'Revenge Trade (İntikam İşlemi)',
          'Overtrading (Aşırı İşlem)',
        ],
      },
      {
        title: 'Modül 3 - Disiplin ve Performans Yönetimi',
        lessons: ['Trading Planı Oluşturma', 'İşlem Günlüğü (Trading Journal) Tutma', 'Disiplin ve Kural Takibi', 'Duygusal Kontrol Teknikleri'],
      },
    ],
  },
  {
    title: 'Teknik Analiz',
    modules: [
      // CMT (Chartered Market Technician) Level I "Body of Knowledge" klasik teknik
      // analiz konu başlıkları temel alınmıştır. Örtüşen alt başlıklar (SMA/EMA,
      // HH-HL/LH-LL, Bayrak/Flama) tek derste birleştirilerek sadeleştirildi.
      {
        title: 'Modül 1 - Grafikler',
        lessons: ['Grafik Türleri (Çizgi, Bar, Candlestick)', 'Candlestick Anatomisi (OHLC)', 'Zaman Dilimi (Timeframe) Seçimi', 'Logaritmik vs Doğrusal Grafik'],
      },
      {
        title: 'Modül 2 - Trend',
        lessons: ['Trend Nedir? (Yükselen/Düşen/Yatay)', 'Trend Yapısı (HH-HL / LH-LL)', 'Trend Çizgisi ve Kanal Çizimi'],
      },
      {
        title: 'Modül 3 - Destek ve Direnç',
        lessons: ['Yatay Destek/Direnç Seviyeleri', 'Dinamik Destek/Direnç (Hareketli Ortalamalar)', 'Pivot Noktaları'],
      },
      {
        title: 'Modül 4 - Formasyonlar',
        lessons: ['Çift Tepe ve Çift Dip', 'Omuz Baş Omuz', 'Bayrak ve Flama (Devam Formasyonları)', 'Üçgen Formasyonları'],
      },
      {
        title: 'Modül 5 - İndikatörler',
        lessons: ['Hareketli Ortalamalar (SMA/EMA)', 'RSI', 'MACD', 'Bollinger Bantları', 'ATR ve Volatilite Ölçümü'],
      },
      {
        title: 'Modül 6 - Hacim',
        lessons: ['Hacim (Volume) Analizi', 'OBV (On Balance Volume)', 'Volume Profile'],
      },
    ],
  },
  {
    title: 'Price Action',
    modules: [
      // Güncel price-action/market-structure eğitimlerinin standart akışı temel
      // alınmıştır: piyasa yapısı -> arz-talep/likidite -> giriş & teyit ->
      // price action'a özgü stop/TP yerleşimi. Genel risk yönetimi/psikoloji
      // "Risk Yönetimi ve Trading Psikolojisi" programında olduğu için tekrar
      // edilmiyor. Order Block, OTE ve BOS eklenmedi: bunlar zaten "ICT 2022 -
      // Temel Modeller" programında birebir aynı isimle ayrı dersler olarak var,
      // aynı öğrenci iki programı da alacağı için burada tekrar öğretilmiyor.
      // SFP (Swing Failure Pattern) ICT programında yok ve "Likidite Avı" ile
      // pratikte aynı kavram olduğu için o derste birleştirildi.
      {
        title: 'Modül 1 - Piyasa Yapısı',
        lessons: ['Market Structure Nedir?', 'Swing High ve Swing Low', 'Breakout ve Pullback'],
      },
      {
        title: 'Modül 2 - Arz-Talep ve Likidite',
        lessons: ['Supply ve Demand Bölgeleri', 'Likidite (Liquidity) Kavramı', 'Fake Breakout (Sahte Kırılım)', 'Likidite Avı ve Swing Failure Pattern (SFP)'],
      },
      {
        title: 'Modül 3 - Giriş ve Onay Teknikleri',
        lessons: ['Entry (Giriş) Teknikleri', 'Confluence (Teyit Noktaları Çakışması)', 'Çoklu Zaman Dilimi Analizi'],
      },
      {
        title: 'Modül 4 - Pozisyon Yönetimi',
        lessons: ['Stop Loss Yerleştirme', 'Take Profit (TP) Belirleme', 'RR (Risk/Ödül) Oranı'],
      },
    ],
  },
  {
    title: 'Wyckoff Metodu',
    modules: [
      // Klasik Wyckoff müfredatının 3 Yasası (Arz-Talep, Neden-Sonuç, Çaba-Sonuç)
      // ve Volume Spread Analysis (VSA) eksikti, eklendi. Gerçek Wyckoff akışına
      // (temeller -> fiyat döngüsü/akümülasyon -> dağıtım -> uygulama) göre
      // tek modülden 4 modüle ayrıldı.
      {
        title: 'Modül 1 - Wyckoff Temelleri',
        lessons: ['Composite Man (Kompozit Operatör)', 'Arz-Talep Yasası', 'Neden-Sonuç Yasası', 'Çaba-Sonuç Yasası (Effort vs Result)'],
      },
      {
        title: 'Modül 2 - Fiyat Döngüsü ve Akümülasyon',
        lessons: ['Wyckoff Fiyat Döngüsü (Accumulation-Markup-Distribution-Markdown)', 'Accumulation (Toplama) Fazı', 'Spring', 'SOS (Sign of Strength)'],
      },
      {
        title: 'Modül 3 - Dağıtım (Distribution)',
        lessons: ['Distribution (Dağıtım) Fazı', 'Upthrust', 'SOW (Sign of Weakness)'],
      },
      {
        title: 'Modül 4 - Uygulama',
        lessons: ['Wyckoff Schematics (Şema 1 ve 2)', 'Volume Spread Analysis (VSA)'],
      },
    ],
  },
  {
    title: 'ICT 2022 - Temel Modeller',
    level: 'ILERI',
    modules: [
      // Araştırmaya göre "dört temel" (PD Array, Order Block, FVG, Kill Zone)
      // arasından Kill Zones eksikti; Judas Swing de dokümante edilmiş, çok
      // bilinen bir 2022 model kavramı olup eksikti - ikisi de eklendi.
      {
        title: 'Modül 1',
        lessons: ['ICT Terminolojisi', 'Market Structure', 'BOS & CHOCH (MSS)', 'Premium & Discount', 'Dealing Range', 'Kill Zones'],
      },
      {
        title: 'Modül 2',
        lessons: ['Buy Side Liquidity', 'Sell Side Liquidity', 'Internal Range Liquidity (IRL)', 'External Range Liquidity (ERL)', 'Judas Swing'],
      },
      {
        title: 'Modül 3',
        lessons: [
          'Fair Value Gap (FVG)',
          'Order Block',
          'Breaker Block',
          'Mitigation Block',
          'Rejection Block',
          'Inversion FVG',
          'Balanced Price Range (BPR)',
        ],
      },
      {
        title: 'Modül 4',
        lessons: [
          'Power of Three (PO3)',
          'Market Efficiency Paradigm (MEP)',
          'Institutional Order Flow',
          'Daily Range Delivery',
        ],
      },
      {
        title: 'Modül 5',
        lessons: ['Optimal Trade Entry (OTE)', 'Precision Technician Model (PAM)', 'Elements of a Trade Setup'],
      },
    ],
  },
  {
    title: 'ICT 2023 - Narrative Modelleri',
    level: 'ILERI',
    modules: [
      // "ICT Mentorship 2023 - Market Maker Models" doğrulanan gerçek başlık;
      // Market Maker Buy/Sell Model eklendi, geri kalanı tematik gruplandırıldı.
      {
        title: 'Modül 1 - Market Maker Modelleri',
        lessons: ['Market Maker Buy Model', 'Market Maker Sell Model', 'Reaper Model', 'Reaper PD Array'],
      },
      {
        title: 'Modül 2 - Haftalık Narrative Oluşturma',
        lessons: ['Weekly Narrative', 'Weekly Bias', 'Narrative Building', 'Higher Timeframe Forecasting', 'Weekly Templates'],
      },
      {
        title: 'Modül 3 - Zaman Bazlı ve Algoritmik Modeller',
        lessons: ['Time Based Trading Model', 'Algorithmic Narrative'],
      },
    ],
  },
  {
    title: 'ICT 2024 - Açılış Modelleri',
    level: 'ILERI',
    modules: [
      // Doğrulanmış gerçek ders başlıkları eklendi (08:30 AM Model, 07:00 AM
      // IFVG Model, News-Day Model).
      {
        title: 'Modül 1 - Açılış Gap ve Menzil Kavramları',
        lessons: ['New Day Opening Gap (NDOG)', 'First Presented Fair Value Gap', 'Opening Range', 'Opening Price Manipulation'],
      },
      {
        title: 'Modül 2 - Zaman Bazlı Açılış Modelleri',
        lessons: ['08:30 AM Model', '07:00 AM IFVG Model', 'News-Day Model (Haber Günü Modeli)', 'Opening Kill Zone Model'],
      },
      {
        title: 'Modül 3 - İleri Açılış Uygulamaları',
        lessons: ['Daily Open Framework', 'Advanced PD Array Combinations'],
      },
    ],
  },
  {
    title: 'ICT 2025 - İleri Seviye Execution',
    level: 'ILERI',
    modules: [
      // Yıla özgü ders başlıkları kamuya açık kaynaklarda tek tek doğrulanamadı,
      // içerik değiştirilmedi - sadece tematik olarak modüllere ayrıldı.
      {
        title: 'Modül 1 - Pozisyon ve İşlem Yönetimi',
        lessons: ['Advanced Trade Management', 'Position Scaling', 'Partial Exit Management'],
      },
      {
        title: 'Modül 2 - Çoklu Zaman Dilimi ve Narrative Rafine Etme',
        lessons: ['Multi Timeframe Execution', 'Advanced Narrative Refinement', 'High Probability Execution'],
      },
      {
        title: 'Modül 3 - Risk ve Seans Optimizasyonu',
        lessons: ['Risk Optimization', 'Session Combination Models'],
      },
    ],
  },
  {
    title: 'ICT 2026 - Uzman Seviye Execution',
    level: 'ILERI',
    modules: [
      // Yıla özgü ders başlıkları kamuya açık kaynaklarda tek tek doğrulanamadı,
      // içerik değiştirilmedi - sadece tematik olarak modüllere ayrıldı.
      {
        title: 'Modül 1 - Algoritmik Fiyat Dağıtımı',
        lessons: ['Advanced Algorithmic Delivery', 'Model Refinement', 'Institutional Timing Models'],
      },
      {
        title: 'Modül 2 - Hassas Giriş ve Likidite Haritalama',
        lessons: ['Precision Entry Refinement', 'Advanced Liquidity Mapping'],
      },
      {
        title: 'Modül 3 - İleri Narrative ve Execution',
        lessons: ['Complex Narrative Construction', 'Execution Optimization'],
      },
    ],
  },
];

async function main() {
  for (const programSeed of programs) {
    let program = await prisma.program.findFirst({ where: { title: programSeed.title } });
    if (!program) {
      program = await prisma.program.create({ data: { title: programSeed.title, level: programSeed.level } });
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
