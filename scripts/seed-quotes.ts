import { PrismaClient } from '../generated/prisma/client';

const prisma = new PrismaClient();

const quotes = [
  { order: 1, text: 'Risk, ne yaptığını bilmediğinde ortaya çıkar.', author: 'Warren Buffett', profession: 'Yatırımcı' },
  { order: 2, text: 'Kural 1: Asla para kaybetme. Kural 2: Birinci kuralı asla unutma.', author: 'Warren Buffett', profession: 'Yatırımcı' },
  { order: 3, text: 'Fiyat ödediğindir, değer aldığındır.', author: 'Warren Buffett', profession: 'Yatırımcı' },
  { order: 4, text: 'Başkaları korkarken açgözlü ol, başkaları açgözlüyken kork.', author: 'Warren Buffett', profession: 'Yatırımcı' },
  { order: 5, text: 'En iyi yatırım kendine yaptığın yatırımdır.', author: 'Warren Buffett', profession: 'Yatırımcı' },
  { order: 6, text: 'Piyasa sabırsızdan sabırlıya para transfer eder.', author: 'Warren Buffett', profession: 'Yatırımcı' },
  { order: 7, text: 'Piyasalar asla yanlış değildir; yanlış olan çoğu zaman fikirlerimizdir.', author: 'Jesse Livermore', profession: 'Trader' },
  { order: 8, text: 'Büyük para alıp satmakta değil, beklemektedir.', author: 'Jesse Livermore', profession: 'Trader' },
  { order: 9, text: 'En zor şey hiçbir şey yapmamaktır.', author: 'Jesse Livermore', profession: 'Trader' },
  { order: 10, text: 'Trend senin dostundur.', author: 'Ed Seykota', profession: 'Trader' },
  { order: 11, text: 'Kayıplarını kısa kes.', author: 'Ed Seykota', profession: 'Trader' },
  { order: 12, text: 'Herkes istediğini değil, hak ettiğini piyasadan alır.', author: 'Ed Seykota', profession: 'Trader' },
  { order: 13, text: 'Her zaman stop kullan.', author: 'Paul Tudor Jones', profession: 'Hedge Fon Yöneticisi' },
  { order: 14, text: 'En iyi savunma iyi risk yönetimidir.', author: 'Paul Tudor Jones', profession: 'Hedge Fon Yöneticisi' },
  { order: 15, text: 'Gerçeklikle yüzleş.', author: 'Ray Dalio', profession: 'Yatırımcı' },
  { order: 16, text: 'Acıyı ilerleme için kullan.', author: 'Ray Dalio', profession: 'Yatırımcı' },
  { order: 17, text: 'Çeşitlendirme riski azaltır.', author: 'Ray Dalio', profession: 'Yatırımcı' },
  { order: 18, text: 'Volatilite risk değildir.', author: 'Howard Marks', profession: 'Yatırımcı' },
  { order: 19, text: 'İkinci seviye düşünmek avantaj sağlar.', author: 'Howard Marks', profession: 'Yatırımcı' },
  { order: 20, text: 'Başarının anahtarı risk kontrolüdür.', author: 'Howard Marks', profession: 'Yatırımcı' },
  { order: 21, text: 'Bildiğin şeye yatırım yap.', author: 'Peter Lynch', profession: 'Yatırımcı' },
  { order: 22, text: 'Fırsatlar her zaman vardır.', author: 'Peter Lynch', profession: 'Yatırımcı' },
  { order: 23, text: 'En iyi hisseler sabır ister.', author: 'Peter Lynch', profession: 'Yatırımcı' },
  { order: 24, text: 'Risk yönetimi her şeydir.', author: 'Larry Hite', profession: 'Trader' },
  { order: 25, text: 'Önce hayatta kal.', author: 'Larry Hite', profession: 'Trader' },
  { order: 26, text: 'Sermayeni koru.', author: 'Bruce Kovner', profession: 'Trader' },
  { order: 27, text: 'Piyasaya değil riske odaklan.', author: 'Bruce Kovner', profession: 'Trader' },
  { order: 28, text: 'Büyük kazançlar birkaç doğru karardan gelir.', author: 'Stan Druckenmiller', profession: 'Yatırımcı' },
  { order: 29, text: 'Fikrini değiştirmekten korkma.', author: 'Stan Druckenmiller', profession: 'Yatırımcı' },
  { order: 30, text: 'Disiplin her şeydir.', author: 'Mark Douglas', profession: 'Trading Psikolojisi Yazarı' },
  { order: 31, text: 'Her işlem bağımsız bir olasılıktır.', author: 'Mark Douglas', profession: 'Trading Psikolojisi Yazarı' },
  { order: 32, text: 'Piyasa sana hiçbir şey borçlu değildir.', author: 'Mark Douglas', profession: 'Trading Psikolojisi Yazarı' },
  { order: 33, text: 'Kurallar duygulardan üstündür.', author: 'Richard Dennis', profession: 'Trader' },
  { order: 34, text: 'Sistemine güven.', author: 'Richard Dennis', profession: 'Trader' },
  { order: 35, text: 'Kayıplar oyunun parçasıdır.', author: 'Jack Schwager', profession: 'Yazar / Analist' },
  { order: 36, text: 'Yanlış olmak sorun değildir.', author: 'George Soros', profession: 'Yatırımcı' },
  { order: 37, text: 'Önemli olan haklı olduğunda ne kadar kazandığındır.', author: 'George Soros', profession: 'Yatırımcı' },
  { order: 38, text: 'Kazanan pozisyonları büyüt.', author: 'Nicolas Darvas', profession: 'Trader' },
  { order: 39, text: 'Kayıpları büyütme.', author: 'Nicolas Darvas', profession: 'Trader' },
  { order: 40, text: 'Grafikler her şeyi fiyatlar.', author: 'John Murphy', profession: 'Teknik Analist' },
  { order: 41, text: 'Trendleri takip et.', author: 'John Murphy', profession: 'Teknik Analist' },
  { order: 42, text: 'Duygular yatırımcının düşmanıdır.', author: 'Benjamin Graham', profession: 'Yatırımcı' },
  { order: 43, text: 'Güvenlik marjı şarttır.', author: 'Benjamin Graham', profession: 'Yatırımcı' },
  { order: 44, text: 'Piyasa kısa vadede oylama, uzun vadede tartı makinesidir.', author: 'Benjamin Graham', profession: 'Yatırımcı' },
  { order: 45, text: 'Kazananlar riski yönetir.', author: 'Tom Basso', profession: 'Trader' },
  { order: 46, text: 'Sürekli öğrenmek başarının anahtarıdır.', author: 'Charlie Munger', profession: 'Yatırımcı' },
  { order: 47, text: 'Basitlik büyük avantajdır.', author: 'Charlie Munger', profession: 'Yatırımcı' },
  { order: 48, text: 'İşlem yapmamak da bir karardır.', author: 'Jim Rogers', profession: 'Yatırımcı' },
  { order: 49, text: 'Kalabalığı takip ederek zengin olunmaz.', author: 'Jim Rogers', profession: 'Yatırımcı' },
  { order: 50, text: 'Trend değişene kadar trend devam eder.', author: 'Martin Zweig', profession: 'Yatırımcı' },
  { order: 51, text: 'Trendle savaşma.', author: 'Martin Zweig', profession: 'Yatırımcı' },
  { order: 52, text: 'Plan yap, plana sadık kal.', author: 'Alexander Elder', profession: 'Trader ve Psikiyatrist' },
  { order: 53, text: 'Duygularını değil sistemini takip et.', author: 'Alexander Elder', profession: 'Trader ve Psikiyatrist' },
  { order: 54, text: 'Başarı sabır ve disiplin ister.', author: "William O'Neil", profession: 'Yatırımcı' },
  { order: 55, text: 'Lider hisseleri takip et.', author: "William O'Neil", profession: 'Yatırımcı' },
  { order: 56, text: 'Piyasaya saygı duy.', author: 'Richard Dennis', profession: 'Trader' },
  { order: 57, text: 'Öğrenmeyi bırakan gelişmeyi bırakır.', author: 'Warren Buffett', profession: 'Yatırımcı' },
  { order: 58, text: 'Sabır en büyük avantajdır.', author: 'Charlie Munger', profession: 'Yatırımcı' },
  { order: 59, text: 'Küçük kayıplar büyük felaketleri önler.', author: 'Larry Hite', profession: 'Trader' },
  { order: 60, text: 'Risk almadan getiri olmaz.', author: 'George Soros', profession: 'Yatırımcı' },
];

async function main() {
  for (const q of quotes) {
    await prisma.quote.upsert({
      where: { order: q.order },
      update: q,
      create: q,
    });
  }
  console.log(`${quotes.length} söz yüklendi.`);
  await prisma.$disconnect();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
