// Zaman dilimi ve ICT etiketi secenekleri kapali bir liste olarak tutulur -
// hem DTO validasyonunda hem frontend'deki secim kutularinda ayni degerler
// kullanilir, boylece filtreleme/etiketleme tutarli kalir.
export const COMMUNITY_TIMEFRAMES = ['1m', '5m', '15m', '30m', '1h', '4h', '1d', '1w'] as const;
export type CommunityTimeframe = (typeof COMMUNITY_TIMEFRAMES)[number];

export const COMMUNITY_ICT_TAGS = ['Order Block', 'FVG', 'BOS/CHOCH', 'Fibonacci'] as const;
export type CommunityIctTag = (typeof COMMUNITY_ICT_TAGS)[number];

export const COMMUNITY_POST_DISCLAIMER =
  'Bu paylaşım yatırım tavsiyesi değildir, yalnızca eğitim amaçlıdır.';

// Bir paylasim bu sayida farkli kullanicidan sikayet alinca otomatik gizlenir
// ve manage/community moderasyon kuyruguna duser.
export const COMMUNITY_REPORT_THRESHOLD = 5;
