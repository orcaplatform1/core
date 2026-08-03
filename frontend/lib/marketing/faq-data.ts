export type FaqItem = {
  id: string;
  question: string;
  answer: string;
};

export type FaqCategory = {
  id: string;
  label: string;
  items: FaqItem[];
};

export const FAQ_CATEGORIES: FaqCategory[] = [
  {
    id: "genel",
    label: "Genel",
    items: [
      {
        id: "orca-nedir",
        question: "ORCA nedir?",
        answer:
          "ORCA, finansal piyasaları sıfırdan öğrenmek isteyenlerden ileri seviye teknik analiz ve ICT metodolojisine geçmek isteyen yatırımcılara kadar geniş bir kitleye hitap eden, yapay zeka destekli bir finans eğitim platformudur. Video dersler, PDF kaynaklar, quizler, simülasyon ve backtest araçlarını tek bir çatı altında birleştirir.",
      },
      {
        id: "orca-farki",
        question: "ORCA'yı diğer eğitim platformlarından ayıran nedir?",
        answer:
          "ORCA'da eğitim tek yönlü bir video izleme deneyimi değildir. Yapay Zeka Mentor, izlediğiniz dersi ve quiz sonuçlarınızı takip ederek size özel çalışma planı, eksik konu analizi ve motivasyon desteği sunar. Ayrıca gerçek piyasa verileriyle çalışan simülasyon ve backtest modülleri sayesinde öğrendiğinizi risksiz ortamda uygulayabilirsiniz.",
      },
      {
        id: "kimler-katilabilir",
        question: "Kimler katılabilir?",
        answer:
          "Finansal piyasalara hiç adım atmamış yeni başlayanlardan, teknik analiz ve ICT (Institutional Concepts) konusunda derinleşmek isteyen deneyimli takipçilere kadar herkes ORCA'ya katılabilir. Programlarımız seviyeye göre yapılandırılmıştır.",
      },
      {
        id: "trading-deneyimi",
        question: "Daha önce hiç trading yapmadım, uygun mu?",
        answer:
          "Evet. \"Finansal Piyasaların Temelleri\" programı, finansal okuryazarlıktan işlem temellerine, risk yönetiminden ekonomiye kadar hiçbir ön bilgi gerektirmeyen bir başlangıç noktasıdır.",
      },
      {
        id: "egitim-seviyeleri",
        question: "Eğitimler hangi seviyeye uygun?",
        answer:
          "Programlarımız kademeli olarak ilerler: Finansal Piyasaların Temelleri (başlangıç), Teknik Analiz (orta), ICT Metodu ve İleri Piyasa Analizi (ileri seviye). Kayıt öncesi kısa bir finansal profil testiyle size uygun başlangıç noktası önerilir.",
      },
      {
        id: "mobil-kullanim",
        question: "Telefon ve tabletten kullanılabilir mi?",
        answer:
          "Evet, ORCA platformu mobil ve tablet tarayıcılarında sorunsuz çalışacak şekilde tasarlanmıştır. Ayrı bir uygulama indirmenize gerek yoktur.",
      },
    ],
  },
  {
    id: "egitimler",
    label: "Eğitimler",
    items: [
      {
        id: "omur-boyu-erisim",
        question: "Eğitimler ömür boyu erişimli mi?",
        answer:
          "Evet. Satın aldığınız programa ömür boyu ve sınırsız erişim hakkına sahip olursunuz; tekrar ücret ödemeniz gerekmez.",
      },
      {
        id: "yeni-dersler-ucretsiz",
        question: "Yeni dersler ücretsiz ekleniyor mu?",
        answer:
          "Sahip olduğunuz programa zaman içinde eklenen yeni içerikler, erişiminiz ömür boyu geçerli olduğu için ayrıca ücret talep edilmeden hesabınıza yansır.",
      },
      {
        id: "ders-sirasi",
        question: "Dersler hangi sırayla izlenmeli?",
        answer:
          "Her program modüllere, her modül derslere ayrılmıştır ve önerilen sıra takip edilerek ilerlenmesi tavsiye edilir. Bir sonraki modülün açılabilmesi için mevcut modülün quizini geçmeniz gerekir; bu sayede konular sağlam bir temel üzerine inşa edilir.",
      },
      {
        id: "sertifika",
        question: "Eğitim sonunda sertifika veriliyor mu?",
        answer:
          "Evet. Bir programdaki tüm dersleri, modülleri ve final quizini tamamladığınızda, sıra numaralı ve QR kod ile doğrulanabilir bir sertifika kazanırsınız. Sertifikanız profilinizde görüntülenir.",
      },
      {
        id: "canli-dersler",
        question: "Canlı dersler olacak mı?",
        answer:
          "Evet, canlı dersler Discord üzerinden gerçekleştirilir. Yaklaşan canlı dersler platformda geri sayım olarak gösterilir ve yayın başladığında \"Katıl\" butonu aktif hale gelir.",
      },
      {
        id: "istedigim-zaman-izleme",
        question: "Dersleri istediğim zaman izleyebilir miyim?",
        answer:
          "Evet, video dersler kayıtlıdır ve size uygun olan her an, istediğiniz kadar tekrar izleyebilirsiniz.",
      },
      {
        id: "program-modul-sayisi",
        question: "Kaç program ve kaç modül bulunuyor?",
        answer:
          "Platformumuzda Finansal Piyasaların Temelleri, Teknik Analiz, ICT Metodu ve İleri Piyasa Analizi olmak üzere 4 farklı program bulunur; toplamda çok sayıda modül ve dersten oluşur. Tek bir satın alma ile tüm programlara erişim sağlarsınız.",
      },
      {
        id: "ict-egitimi",
        question: "ICT (Institutional Concepts) eğitimi veriyor musunuz?",
        answer:
          "Evet. ICT Metodu programımız Market Structure, Institutional Concepts, Time & Liquidity, Trading Setupları ve Advanced ICT gibi konuları kapsamlı şekilde ele alır.",
      },
      {
        id: "quiz-sistemi",
        question: "Quiz sistemi nasıl işliyor?",
        answer:
          "Her modül sonunda çoktan seçmeli, karışık sıralı sorulardan oluşan ve süre sınırlı bir quiz bulunur. Geçme notu 70'tir; başarısız olursanız quizi tekrar çözebilirsiniz.",
      },
      {
        id: "sertifika-dogrulama",
        question: "Sertifikamı nasıl doğrulatabilirim?",
        answer:
          "Her sertifikada bulunan benzersiz seri numarası ve QR kod ile sertifikanızın gerçekliğini herkese açık doğrulama sayfamızdan kontrol ettirebilirsiniz.",
      },
    ],
  },
  {
    id: "yapay-zeka-mentor",
    label: "Yapay Zeka Mentor",
    items: [
      {
        id: "mentor-nasil-calisir",
        question: "Yapay Zeka Mentor nasıl çalışıyor?",
        answer:
          "Yapay Zeka Mentor, izlediğiniz ders ve modülle bağlantılı olarak sorularınızı yanıtlar, kavramları açıklar, quiz sonuçlarınızı analiz ederek eksik konularınızı tespit eder ve size özel bir çalışma planı sunar.",
      },
      {
        id: "islem-sinyali",
        question: "Mentor bana işlem sinyali verir mi?",
        answer:
          "Hayır. Yapay Zeka Mentor hiçbir şekilde yatırım tavsiyesi veya işlem sinyali vermez; amacı yalnızca eğitim içeriğini pekiştirmek, konu anlatmak ve öğrenme sürecinizi desteklemektir.",
      },
      {
        id: "gunluk-soru-hakki",
        question: "Günlük soru hakkı nedir?",
        answer:
          "Her kullanıcının günlük 10 mesajlık ücretsiz kullanım hakkı bulunur. Bu limitin üzerinde kullanmak isterseniz Mentor Kredisi satın alabilirsiniz.",
      },
      {
        id: "mentor-kredisi",
        question: "Mentor kredisi nedir?",
        answer:
          "Günlük ücretsiz mesaj hakkınızı aştığınızda kullanabileceğiniz ek kredi paketleridir. Farklı paket seçenekleriyle satın alınabilir ve ödeme kart, kripto veya banka havalesi ile yapılabilir.",
      },
      {
        id: "mentor-konulari",
        question: "Mentor hangi konularda yardımcı olur?",
        answer:
          "Konu anlatımı, terim açıklama, ders ve PDF özetleme, quiz analizi, yanlış cevapların nedenini açıklama, eksik konu tespiti, kişisel çalışma planı oluşturma ve motivasyon desteği sağlar.",
      },
      {
        id: "mentor-yanlis-cevap",
        question: "Yanlış cevap verebilir mi?",
        answer:
          "Yapay zeka teknolojileri zaman zaman hatalı veya eksik bilgi üretebilir. Mentor'un yanıtları eğitim materyalinizi tamamlayıcı niteliktedir; kritik konularda platform içeriğini ve eğitmen kaynaklarını referans almanızı öneririz.",
      },
      {
        id: "mentor-kredi-biterse",
        question: "Mentor kredim biterse ne olur?",
        answer:
          "Günlük ücretsiz mesaj hakkınız yenilenene kadar veya ek Mentor Kredisi satın alana kadar sohbete devam edemezsiniz; mevcut ders içerikleri ve diğer platform özellikleri kullanılmaya devam edilebilir.",
      },
    ],
  },
  {
    id: "uyelik-odeme",
    label: "Üyelik & Ödeme",
    items: [
      {
        id: "kayit-nasil",
        question: "Nasıl kayıt olabilirim?",
        answer:
          "Ad-soyad, kullanıcı adı ve e-posta ya da telefon numaranızla birkaç adımda hızlıca kayıt olabilirsiniz.",
      },
      {
        id: "odeme-yontemleri",
        question: "Hangi ödeme yöntemleri mevcut?",
        answer:
          "Kredi/banka kartı, Binance Pay, Bybit Pay, OKX (cüzdan adresi ile) ve banka havalesi/EFT seçenekleriyle ödeme yapabilirsiniz.",
      },
      {
        id: "kripto-odeme",
        question: "Kripto ile ödeme yapabilir miyim?",
        answer:
          "Evet, Binance Pay ve Bybit Pay üzerinden anlık kripto ödeme yapabilirsiniz. OKX üzerinden ödemeler ise cüzdan adresine transfer sonrası manuel onay ile işleme alınır.",
      },
      {
        id: "iade-politikasi",
        question: "İade politikası nedir?",
        answer:
          "Dijital eğitim içeriğine erişiminiz satın alma anında hemen başladığından, mevzuat gereği dijital ürün ve hizmetlerde cayma hakkı bulunmamaktadır. Satın almadan önce program içeriğini incelemenizi öneririz.",
      },
      {
        id: "fatura",
        question: "Fatura kesiliyor mu?",
        answer:
          "Evet, her ödeme onaylandığında sıra numaralı olarak otomatik fatura kaydınız oluşturulur.",
      },
      {
        id: "abonelik-mi",
        question: "Abonelik mi yoksa tek seferlik ödeme mi?",
        answer:
          "Program erişimi tek seferlik ödeme ile alınır ve ömür boyu geçerlidir; abonelik değildir. Yapay Zeka Mentor kredileri ise ihtiyaç halinde ayrıca satın alınan ek paketlerdir.",
      },
      {
        id: "odeme-bilgisi-saklama",
        question: "Ödeme bilgilerim saklanıyor mu?",
        answer:
          "Kart bilgileriniz ORCA sunucularında saklanmaz; ödemeler güvenli ödeme altyapıları üzerinden gerçekleştirilir.",
      },
    ],
  },
  {
    id: "simulasyon-backtest",
    label: "Simülasyon & Backtest",
    items: [
      {
        id: "backtest-nasil-calisir",
        question: "Backtest sistemi nasıl çalışıyor?",
        answer:
          "Backtest modülü, geçmiş piyasa verileri üzerinden strateji ve analiz denemelerinizi test etmenizi sağlar. Kripto verileri piyasa değerine göre ilk 50 coin için, forex ve emtia verileri ise güvenilir finansal veri kaynaklarından günlük (1 günlük) mum periyodunda sağlanır.",
      },
      {
        id: "gercek-piyasa-verisi",
        question: "Gerçek piyasa verileri kullanılıyor mu?",
        answer:
          "Evet. Simülasyon modülü gerçek zamanlı forex ve kripto fiyat verileriyle çalışır; Backtest modülü ise geçmişe dönük gerçek piyasa verilerini kullanır.",
      },
      {
        id: "performans-takibi",
        question: "Performansımı takip edebilir miyim?",
        answer:
          "Evet, Yapay Zeka Mentor'un performans sekmesinden geçmiş çalışmalarınızı ve gelişiminizi takip edebilirsiniz.",
      },
      {
        id: "islem-analizi",
        question: "Yapay Zeka işlemlerimi analiz ediyor mu?",
        answer:
          "Yapay Zeka Mentor, quiz sonuçlarınızı ve öğrenme sürecinizi analiz ederek güçlü/zayıf yönlerinizi ortaya koyar; bu analiz eğitim amaçlıdır, yatırım tavsiyesi niteliği taşımaz.",
      },
      {
        id: "simulasyon-yakinligi",
        question: "Simülasyon gerçek piyasaya ne kadar yakın?",
        answer:
          "Simülasyon, gerçek zamanlı fiyat akışı ve TradingView benzeri grafik çizim araçlarıyla gerçek piyasa deneyimine yakın bir ortam sunar. Ancak gerçek para kullanılmaz; amaç risksiz pratik yapmanızdır.",
      },
      {
        id: "backtest-piyasalari",
        question: "Backtest hangi piyasalarda yapılabilir?",
        answer:
          "Kripto paralarda (piyasa değerine göre ilk 50 coin) ve forex/emtia paritelerinde backtest yapabilirsiniz.",
      },
    ],
  },
  {
    id: "teknik",
    label: "Teknik",
    items: [
      {
        id: "sifremi-unuttum",
        question: "Şifremi unuttum.",
        answer:
          "Giriş ekranındaki \"Şifremi Unuttum\" bağlantısını kullanarak kayıtlı e-posta adresinize gönderilecek link ile şifrenizi kolayca sıfırlayabilirsiniz.",
      },
      {
        id: "video-acilmiyor",
        question: "Video açılmıyor.",
        answer:
          "Öncelikle internet bağlantınızı ve tarayıcınızı güncel tutmanızı öneririz. Sorun devam ederse destek ekibimizle iletişime geçebilirsiniz.",
      },
      {
        id: "mobil-uygulama",
        question: "Mobil uygulama olacak mı?",
        answer:
          "Evet. Platformumuz şu an mobil ve tablet tarayıcılarda tam uyumlu çalışmaktadır; App Store ve Google Play üzerinde yer alacak native mobil uygulamamız da en kısa zamanda kullanıcılarımızla buluşacak.",
      },
      {
        id: "cihaz-sayisi",
        question: "Hesabımı kaç cihazda kullanabilirim?",
        answer:
          "Hesap paylaşımını önlemek amacıyla aynı anda tek bir cihazdan aktif oturum açılabilir; yeni bir cihazdan giriş yapıldığında önceki oturum sonlanır. Aynı gün içinde farklı cihazlardan tekrarlanan girişler hesabınızın geçici olarak kısıtlanmasına yol açabilir.",
      },
      {
        id: "cevrimdisi-kullanim",
        question: "İnternet olmadan kullanılabilir mi?",
        answer:
          "Hayır, video ve materyallere erişim güvenlik amacıyla çevrimiçi ortamda sağlanır; içerikler indirilemez veya çevrimdışı izlenemez.",
      },
    ],
  },
  {
    id: "topluluk",
    label: "Topluluk",
    items: [
      {
        id: "discord-telegram",
        question: "Discord ve Telegram topluluğu var mı?",
        answer:
          "Evet, canlı derslerimiz ve topluluk etkileşimi Discord üzerinden yürütülür. Ayrıca üyelerimizin bir araya gelebileceği bir Telegram grubumuz da açılacaktır.",
      },
      {
        id: "kurucu-uye",
        question: "Kurucu Üye avantajları nelerdir?",
        answer:
          "Kurucu Üye statüsü yalnızca ilk 500 üyemizle sınırlıdır. Kurucu Üye olarak, ileride eklenecek ücretli V2 araçlarına (Araçlar/Tools bölümü, abonelik gerektiren gelişmiş özellikler) ücretsiz erişim hakkı kazanırsınız.",
      },
      {
        id: "rozet-sistemi",
        question: "Rozet sistemi nasıl çalışıyor?",
        answer:
          "Düzenli çalışma (günlük seri), tamamlanan modül ve programlar gibi başarılarınız doğrultusunda profilinizde rozetler kazanırsınız; bu rozetler gelişiminizi görsel olarak takip etmenizi sağlar.",
      },
      {
        id: "destek-ekibi",
        question: "Destek ekibine nasıl ulaşırım?",
        answer:
          "Platform içindeki destek/iletişim kanalları veya Discord topluluğumuz üzerinden ekibimize ulaşabilirsiniz.",
      },
    ],
  },
  {
    id: "guven",
    label: "Güven",
    items: [
      {
        id: "veri-guvenligi",
        question: "Verilerim güvende mi?",
        answer:
          "Evet. Platformumuz KVKK'ya uyumlu şekilde geliştirilmiştir; verileriniz güvenlik önlemleriyle (yetkilendirme, hız sınırlama, güvenlik günlükleri vb.) korunur ve hesabınızı istediğiniz zaman silme veya verilerinizi dışa aktarma hakkına sahipsiniz.",
      },
      {
        id: "ucuncu-kisi-paylasimi",
        question: "Bilgilerim üçüncü kişilerle paylaşılır mı?",
        answer:
          "Hayır, kişisel bilgileriniz yalnızca hizmetin sunulması için gerekli olan (ör. ödeme işlemcileri) durumlar dışında üçüncü kişilerle paylaşılmaz.",
      },
      {
        id: "yatirim-danismanligi",
        question: "ORCA yatırım danışmanlığı veriyor mu?",
        answer:
          "Hayır. ORCA yalnızca eğitim amaçlı bir platformdur; hiçbir şekilde yatırım danışmanlığı, al-sat sinyali veya finansal tavsiye sunmaz.",
      },
      {
        id: "basari-garantisi",
        question: "Başarı garantisi sunuyor musunuz?",
        answer:
          "Hayır. Finansal piyasalarda işlem yapmak risk içerir ve hiçbir eğitim kâr garantisi veremez. ORCA'nın amacı sizi bilinçli ve donanımlı hale getirmektir, sonuç garantisi vermek değildir.",
      },
      {
        id: "risk-bildirimi",
        question: "Risk bildirimi nedir?",
        answer:
          "Finansal piyasalarda (forex, kripto, hisse senedi vb.) işlem yapmak yüksek risk içerir ve sermaye kaybına yol açabilir. ORCA'daki tüm içerik, simülasyon ve backtest araçları yalnızca eğitim amaçlıdır; gerçek yatırım kararlarınızdan yalnızca siz sorumlusunuz.",
      },
    ],
  },
];
