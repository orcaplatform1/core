export type Legend = {
  slug: string;
  name: string;
  photoUrl: string | null;
  photoLicense: string | null;
  bio: string;
};

// Fotoğraflar yalnızca Wikimedia Commons'tan (kamu malı / CC BY-SA gibi serbest
// lisanslı) alınmıştır - ticari kullanımda güvenli. Lisans bilgisi her kayıtta
// tutulur. Fotoğrafı Commons'ta bulunamayan kişiler için photoUrl null bırakılır,
// UI baş harf rozetine düşer (bkz. success-stories-content.tsx'teki aynı desen).
export const LEGENDS: Legend[] = [
  {
    slug: "warren-buffett",
    name: "Warren Buffett",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/d/d4/Warren_Buffett_at_the_2015_SelectUSA_Investment_Summit_%28cropped%29.jpg",
    photoLicense: "Kamu malı (ABD federal hükümeti çalışması)",
    bio: "Omaha'da doğdu, 11 yaşında ilk hissesini aldı ve Columbia'da Benjamin Graham'ın öğrencisi olarak \"değer yatırımı\" felsefesini öğrendi; kısa süre Graham-Newman'da çalıştıktan sonra 1956'da kendi yatırım ortaklığını kurdu. 1965'te kontrolünü ele geçirdiği Berkshire Hathaway'i küçük bir tekstil şirketinden dünyanın en büyük holdinglerinden birine dönüştürdü. Munger ile birlikte stratejisini \"ucuz şirket\" avcılığından \"kaliteli şirketi makul fiyata alma\" anlayışına evirdi. Berkshire'ın hisse başına defter değeri 1965'ten 2024 sonuna kadar yıllık ortalama %19,9 bileşik büyüdü (S&P 500'ün %10,4'üne karşı) ve \"Omaha Kahini\" lakabını kazandı.",
  },
  {
    slug: "george-soros",
    name: "George Soros",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d4/George_Soros_-_Festival_Economia_2018_1.jpg",
    photoLicense: "CC BY-SA 4.0",
    bio: "Macar Yahudisi olarak Nazi işgalinden kaçarak Londra'ya yerleşti, LSE'de felsefeci Karl Popper'dan etkilenerek \"refleksivite\" teorisini geliştirdi. 1970'lerin başında Jim Rogers ile birlikte kurduğu Quantum Fund'ı küresel makro spekülasyonun öncüsü haline getirdi. En ünlü hamlesi, 16 Eylül 1992'deki \"Kara Çarşamba\"da İngiliz sterlinine karşı milyarlarca dolarlık açığa satış pozisyonu kurup İngiltere'yi Avrupa Döviz Kuru Mekanizması'ndan çıkmaya zorlamasıydı; bu işlemden Quantum Fund'a yaklaşık 1 milyar dolar kâr getirdiği ve kendisine \"İngiltere Merkez Bankası'nı batıran adam\" lakabını kazandırdığı bilinir.",
  },
  {
    slug: "benjamin-graham",
    name: "Benjamin Graham",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/2/2a/Benjamin_Graham_%281894-1976%29_portrait_on_23_March_1950.jpg",
    photoLicense: "Kamu malı (1931-1963 arası yayımlandı, telif yenilenmedi)",
    bio: "Londra doğumlu, ailesi maddi sıkıntı yaşadı; Columbia Üniversitesi'ni üstün başarıyla bitirip 1914'te Wall Street'te kariyerine başladı. Ortağı Jerome Newman ile kurduğu Graham-Newman Corp, 1936-1956 arası piyasa ortalamasının belirgin üzerinde getiri sağladı. \"Değer yatırımının babası\" olarak anılır; David Dodd ile yazdığı \"Security Analysis\" (1934) ve \"The Intelligent Investor\" (1949) bugün hâlâ referans kitaplardır. Columbia'da hocalık yaptığı yıllarda öğrencisi olan genç Warren Buffett'ı derinden etkiledi ve kısa süre yanında çalıştırdı.",
  },
  {
    slug: "peter-lynch",
    name: "Peter Lynch",
    photoUrl: null,
    photoLicense: null,
    bio: "Genç yaşta golf sahasında caddy'lik yaparak kazandığı parayla ilk hissesini (Flying Tiger Airlines) aldı; 1966'da staj yaptığı Fidelity'de kariyerine başladı ve 1977'de Magellan Fonu'nun başına geçti. 1990'a kadarki 13 yıllık yönetiminde fonu yıllık ortalama %29,2 getiriyle S&P 500'ün açık ara üzerinde büyüttü, yönetilen varlığı 18 milyon dolardan 14 milyar dolara taşıdı. \"Bildiğin şeye yatırım yap\" felsefesiyle tanınır; \"One Up on Wall Street\" kitabı milyonlarca satarak sıradan yatırımcılar için klasikleşti.",
  },
  {
    slug: "jim-simons",
    name: "Jim Simons",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/b/b4/James_Simons_2007.jpg",
    photoLicense: "CC BY-SA 2.0 (Almanya)",
    bio: "Matematikçi olarak Berkeley'de doktora yaptı, Stony Brook Üniversitesi'nde matematik bölümü başkanlığı yaptı ve bir dönem NSA için şifre çözme çalıştı. 1978-1982 civarında kurduğu Renaissance Technologies ile finans piyasalarına tamamen matematiksel/istatistiksel modellerle yaklaşan \"nicel (kantitatif) yatırımın\" öncüsü oldu. Yalnızca şirket çalışanlarına açık olan Medallion Fonu, onlarca yıl boyunca yıllık brüt ortalama %60'ların üzerinde getiri sağladı ve tarihin en başarılı hedge fonu olarak kabul edilir; \"Piyasayı Çözen Adam\" olarak anılır.",
  },
  {
    slug: "stanley-druckenmiller",
    name: "Stanley Druckenmiller",
    photoUrl: null,
    photoLicense: null,
    bio: "Bowdoin College'da ekonomi okudu, Michigan'daki doktora programını yarıda bırakıp Pittsburgh National Bank'ta analist olarak işe başladı; kendi fonu Duquesne Capital'i kurduktan sonra 1988-2000 arasında George Soros'un Quantum Fund'ında baş portföy yöneticisi oldu. Soros ile birlikte 1992'deki \"Kara Çarşamba\"da sterline karşı kurduğu pozisyonla İngiltere Merkez Bankası'nı zorlayan ekibin beyni olarak tanınır. Kariyeri boyunca (yaklaşık 30 yıl) hiç zarar yazmadığı iddia edilen nadir yatırımcılardan biridir; makro yatırımda yoğunlaşma ve zamanlama konusundaki ustalığıyla bilinir.",
  },
  {
    slug: "paul-tudor-jones",
    name: "Paul Tudor Jones",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/1/1d/Paul_Tudor_Jones_2006.jpg",
    photoLicense: "Kamu malı (ABD federal hükümeti çalışması)",
    bio: "Memphis'te pamuk borsasında katip olarak başladı, Virginia Üniversitesi'nde ekonomi okuduktan sonra 1980'de kendi firması Tudor Investment Corporation'ı kurdu. 1987'deki \"Kara Pazartesi\" çöküşünü 1929 krizine benzeterek önceden öngördü ve piyasa endekslerine karşı put opsiyonlarıyla pozisyon kurarak o yıl fonuna yaklaşık %200 getiri sağladı. Teknik analiz ile makro/temel analizi birleştiren yaklaşımıyla, riski sıkı yöneten global makro trading'in öncülerinden sayılır.",
  },
  {
    slug: "jesse-livermore",
    name: "Jesse Livermore",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/3c/Press_photo_of_Jesse_Livermore_in_1940.jpg",
    photoLicense: "Kamu malı (1931-1977 arası telif bildirimi olmadan yayımlandı)",
    bio: "14 yaşında evden 5 dolarla ayrılıp Boston'da bir borsa şirketinde \"board boy\" olarak işe başladı, kısa sürede küçük bahis dükkânlarında sürekli kazandığı için işlem yapması yasaklandı ve New York'a taşındı. Piyasa psikolojisini ve fiyat hareketlerini okumadaki ustalığıyla hem 1907 hem de 1929 çöküşlerini önceden görüp açığa satış yaparak 1929'da yaklaşık 100 milyon dolar kazandı. Kariyeri boyunca birkaç kez servet yapıp kaybetti; hikâyesi \"Bir Spekülatörün Anıları\" kitabına ilham verdi — risk yönetiminin önemine dair klasik bir ibret hikâyesi olarak anlatılır.",
  },
  {
    slug: "ray-dalio",
    name: "Ray Dalio",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/1/1f/Web_Summit_2018_-_Forum_-_Day_2%2C_November_7_HM1_7481_%2844858045925%29.jpg",
    photoLicense: "CC BY 2.0",
    bio: "12 yaşında caddy'lik parasıyla ilk hissesini aldı, Long Island Üniversitesi ve Harvard Business School'da eğitim gördükten sonra 1975'te, 26 yaşındayken iki odalı New York dairesinde Bridgewater Associates'i kurdu. Firmayı zamanla dünyanın en büyük hedge fonu haline getirdi; farklı varlık sınıflarını dengeleyen \"All Weather\" (Her Hava Koşulu) risk-paritesi stratejisini geliştirdi. Yönetim ve yatırım felsefesini anlattığı \"Principles\" (İlkeler) kitabı New York Times çoksatanlar listesinde bir numaraya yükseldi.",
  },
  {
    slug: "john-templeton",
    name: "John Templeton",
    photoUrl: null,
    photoLicense: null,
    bio: "Yale'den mezun olduktan sonra Rhodes Bursu ile Oxford'da okudu ve Büyük Buhran'ın ortasında Wall Street kariyerine başladı; 1939'da borç para ile New York Borsası'nda fiyatı 1 doların altına düşen (iflas etmiş şirketler dahil) hemen her hisseden 100'er adet alarak adından söz ettirdi. 1954'te kurduğu Templeton Growth Fund, 38 yıl boyunca yıllık ortalama %15'in üzerinde getiri sağladı. Küresel yatırımın öncülerinden biri olarak \"kötümserliğin doruğunda al\" felsefesiyle tanındı; Money dergisi onu \"yüzyılın belki de en büyük küresel hisse seçicisi\" ilan etti.",
  },
  {
    slug: "charlie-munger",
    name: "Charlie Munger",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/c/ca/Charlie_Munger.jpg",
    photoLicense: "CC BY 2.0",
    bio: "Harvard Hukuk Fakültesi'nden mezun oldu ve önce emlak avukatı olarak çalıştı; 1959'da bir yemekte Warren Buffett ile tanıştı. Kendi yatırım ortaklığını 1962-1975 arasında yıllık ortalama %19,8 getiriyle yönetti, 1978'de Berkshire Hathaway'in yönetim kurulu başkan yardımcısı oldu. Buffett'ı \"ucuz ama vasat şirket al\" yaklaşımından \"kaliteli şirketi makul fiyata al\" felsefesine yönlendirerek Berkshire'ın dönüşümünde belirleyici rol oynadı. Farklı disiplinlerden \"zihinsel modeller\" biriktirme yaklaşımıyla tanınır ve 2023'te 99 yaşında hayatını kaybetti.",
  },
  {
    slug: "carl-icahn",
    name: "Carl Icahn",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/a/ad/Carl_Icahn%2C_1980s.jpg",
    photoLicense: "CC0 1.0 (Kamu Malı)",
    bio: "Queens'te doğdu, Princeton'da felsefe okudu ve New York Borsası'nda koltuk almak için dayısından borç alarak 1968'de Icahn & Co.'yu kurdu. TWA havayolunu 1985'te ele geçirmesi ve 1988'de RJR Nabisco'ya yönelik agresif kampanyasıyla 1980'lerin \"kurumsal işgalci\" hareketinin öncülerinden biri oldu. Şirketlerde büyük pay alıp yönetimi değişikliğe zorlayarak değer açığa çıkarma stratejisiyle aktivist yatırımcılığı hedge fon dünyasında ana akım haline getirdi.",
  },
  {
    slug: "john-bogle",
    name: "John Bogle",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/0/09/Photo_of_a_John_C._Bogle_By_Bill_Cramer.jpg",
    photoLicense: "CC BY-SA 4.0",
    bio: "Princeton'daki bitirme tezini yatırım şirketleri üzerine yazdı, 1951'de Wellington Management'ta kariyerine başlayıp şirketin başkanlığına kadar yükseldi, ancak talihsiz bir birleşme kararı sonrası görevden alındı. 1974'te kurduğu Vanguard Group ile 1976'da bireysel yatırımcılara yönelik ilk endeks fonunu (S&P 500'ü izleyen Vanguard 500) piyasaya sürdü. Fonları düşük maliyetli ve yatırımcı-sahipli bir yapıda kurgulayarak \"endeks yatırımının babası\" unvanını kazandı ve on yıllar boyunca yatırımcılara trilyonlarca dolarlık ücret tasarrufu sağladığı kabul edilir.",
  },
  {
    slug: "bill-ackman",
    name: "Bill Ackman",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/d/d8/Bill_Ackman_%2826410186110%29_%28cropped%29.jpg",
    photoLicense: "CC BY 2.0",
    bio: "Harvard MBA'sinin ardından 1992'de 3 milyon dolarlık sermayeyle Gotham Partners'ı kurdu; firma 2000'lerin başında gayrimenkul anlaşmazlıkları yüzünden kapandı. 2004'te kurduğu Pershing Square Capital Management ile yüksek inançlı, kamuya açık aktivist ve karşıt pozisyonlarıyla tanındı; en çok konuşulan hamlesi Herbalife'ı \"piramit şema\" ilan edip 1 milyar doları aşan açığa satış pozisyonu açmasıydı. 2020'de Covid-19 çöküşüne karşı aldığı kredi riski koruması ile kısa sürede yaklaşık 2,6 milyar dolar kazanarak adından yeniden söz ettirdi.",
  },
  {
    slug: "philip-fisher",
    name: "Philip Fisher",
    photoUrl: null,
    photoLicense: null,
    bio: "1928'de Stanford İşletme Yüksek Lisansı'nı yarıda bırakıp menkul kıymet analisti olarak çalışmaya başladı, 1931'de kendi yatırım şirketi Fisher & Co.'yu kurdu. \"Common Stocks and Uncommon Profits\" (1958) kitabıyla büyüme yatırımının temellerini attı; şirketin müşterileri, tedarikçileri ve rakipleriyle görüşerek bilgi toplama yöntemi olan \"scuttlebutt\" tekniğini geliştirdi. 1955'te aldığı Motorola hissesini ölümüne kadar elinde tutarak büyüme hisselerini \"sonsuza kadar tutma\" felsefesini somutlaştırdı ve Warren Buffett'ın yatırım anlayışını da etkiledi.",
  },
  {
    slug: "jim-rogers",
    name: "Jim Rogers",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/3/37/Jim_Rogers.jpg",
    photoLicense: "CC BY-SA 4.0",
    bio: "Yale ve Oxford'da eğitim aldıktan sonra 1970'lerin başında George Soros ile birlikte Quantum Fund'ı kurdu. Fon, 1973-1980 arasında S&P 500'ün sadece %47 getiri sağladığı dönemde yaklaşık %4200 getiri elde etti. 37 yaşında \"emekli\" olup motosikletle altı kıtada 160 bin kilometreyi aşan bir dünya turuna çıkarak Guinness rekoru kırdı ve bu deneyimini \"Investment Biker\" kitabında anlattı; emtia ve küresel makro yatırımın en tanınmış isimlerinden biri olarak kariyerine yazar ve yorumcu olarak devam etti.",
  },
  {
    slug: "john-w-henry",
    name: "John W. Henry",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/4/4b/John_W._Henry.jpg",
    photoLicense: "CC BY 2.0",
    bio: "Arkansas'ta ailesinin soya, mısır ve buğday çiftliğini fiyat risklerine karşı korumak için 20'li yaşlarının ortasında vadeli işlemler ticaretine başladı. Yıllarca geliştirdiği matematiksel trend-takip modeliyle 1981'de sadece 16 bin dolarlık bir hesapla John W. Henry & Company'yi kurdu. Kararları duygudan arındırılmış, kural bazlı bir sisteme bırakan \"mekanik trend-takip\" yaklaşımının öncülerinden oldu ve bu sistemi 18 yıl boyunca neredeyse hiç değiştirmeden çalıştırdı; kazandığı servetle daha sonra Boston Red Sox ve Liverpool FC'yi satın aldı.",
  },
  {
    slug: "t-boone-pickens",
    name: "T. Boone Pickens",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/8/86/T_Boone_Pickels_2011_Shankbone.JPG",
    photoLicense: "CC BY 3.0",
    bio: "Oklahoma State Üniversitesi'nde jeoloji okudu, kariyerine Phillips Petroleum'da başladı ve 1954'te kurduğu kendi petrol arama şirketini Mesa Petroleum'a dönüştürdü. 1980'lerde Gulf Oil ve Unocal gibi dev petrol şirketlerine yönelik düşmanca devralma girişimleriyle \"kurumsal işgalci\" döneminin en tanınmış isimlerinden biri oldu; hissedar çıkarlarını savunarak United Shareholders Association'ı kurdu. 68 yaşında Mesa'yı sattıktan sonra emekli olmak yerine enerji odaklı BP Capital hedge fonunu kurarak emtia piyasalarında ticarete devam etti.",
  },
  {
    slug: "ken-griffin",
    name: "Ken Griffin",
    photoUrl: "https://upload.wikimedia.org/wikipedia/commons/5/5d/Kenneth_C._Griffin.jpg",
    photoLicense: "CC BY-SA 4.0",
    bio: "1987'de Harvard'da henüz ikinci sınıf öğrencisiyken yurt odasına kurduğu bir faks makinesi ve çatıya yerleştirdiği uydu antenle gerçek zamanlı fiyatları takip ederek dönüştürülebilir tahvil ticaretine başladı. Mezuniyetinin ardından 1990'da Citadel'i kurdu ve firmayı ileri düzey nicel analiz ve yazılım altyapısına dayanan, dünyanın en kârlı çok-stratejili hedge fonlarından biri haline getirdi. Kurduğu Citadel Securities aynı zamanda dünyanın en büyük piyasa yapıcılarından biri oldu; teknoloji-yoğun, veri odaklı yatırımın günümüzdeki en önemli temsilcilerinden sayılır.",
  },
  {
    slug: "nassim-nicholas-taleb",
    name: "Nassim Nicholas Taleb",
    photoUrl:
      "https://upload.wikimedia.org/wikipedia/commons/0/0e/Nassim_Nicholas_Taleb_DLD_2009-012_%28cropped%29.jpg",
    photoLicense: "CC BY-SA 2.0",
    bio: "Lübnan'da doğdu, iç savaştan kaçarak Fransa ve ABD'ye yerleşti; 1984'te First Boston'da opsiyon tüccarı olarak kariyerine başladı ve Ekim 1987 çöküşünde büyük kâr elde etti. 1999'da kurduğu Empirica Capital'de, çoğu zaman küçük kayıplar verip nadir ama şiddetli piyasa çöküşlerinde devasa kazanç sağlayan ucuz \"para dışı\" opsiyonlar alma stratejisini geliştirdi — 2000'deki Nasdaq çöküşünde bu yaklaşımla büyük kâr elde etti. 2005'te fonunu kapatıp tam zamanlı yazarlığa yöneldi; \"The Black Swan\" ve \"Antifragile\" gibi kitaplarıyla \"kara kuğu\" ve kuyruk riski kavramlarını popülerleştirerek modern risk yönetimi düşüncesini derinden etkiledi.",
  },
];

export function getLegend(slug: string): Legend | undefined {
  return LEGENDS.find((l) => l.slug === slug);
}
