import { Injectable, Logger } from '@nestjs/common';

export type ClassifiedNews = {
  category: string;
  direction: 'LONG' | 'SHORT' | 'NEUTRAL';
  symbol: string | null;
  confidenceScore: number;
  tradable: boolean;
  verified: boolean;
  verificationNotes: string;
  aiSummary: string;
};

// Kategori Filtresi (2026-08-20 arastirmasi + kullanici karari 2026-08-20):
// arastirma SADECE 4 kategorinin (hack/iflas, M&A, makro surpriz, dogrulanmis
// etkili kisi) surdurulebilir hareket gosterdigini bulmustu; kullanici
// bildirim gelince kendi kontrol edip gerekirse elle kapatabilecegini
// belirterek listeleme/ortaklik/mainnet/ETF'i de BILEREK riskli kabul edip
// ekledi. REGULATORY (eski haberin tekrar servisi riski yuksek) ve
// TOKEN_UNLOCK (ani surpriz yok, takvim onceden belli - kullanici bilerek
// eklemedi) HALA disarida. Bu liste bilerek kodda (DB'de degil) sabit -
// degistirmek icin bilincli bir kod degisikligi yapilmasi gerekir.
const TRADABLE_CATEGORIES = new Set([
  'EXCHANGE_HACK_OR_INSOLVENCY',
  'OFFICIAL_MA_ACQUISITION',
  'MACRO_SURPRISE',
  'VERIFIED_INFLUENCER',
  'PARTNERSHIP_INTEGRATION',
  'EXCHANGE_LISTING',
  'MAINNET_UPGRADE',
  'ETF_DECISION',
]);
const MIN_CONFIDENCE_TO_TRADE = 0.7;

// Metinde acik hack/exploit ifadesi varsa kategori zaten net, nuans gerekmiyor
// - hizli (Haiku) yol. Digerlerinde (M&A onemi, makro surpriz buyuklugu,
// kaynak guvenilirligi degerlendirmesi) Sonnet kullanilir - bu kategorilerde
// hareket zaten dakikalar surdugu icin 1-2 saniye ekstra gecikme onemsiz,
// dogruluk daha kritik (bkz. plan: "Sınıflandırıcı" bolumu).
const FAST_PATH_KEYWORDS = /\b(hack|hacked|exploit|drained|insolven|bankrupt|halts? withdrawals?)\b/i;

@Injectable()
export class NewsClassifierService {
  private readonly logger = new Logger(NewsClassifierService.name);

  get isConfigured(): boolean {
    return !!process.env.ANTHROPIC_API_KEY;
  }

  async classify(input: { rawText: string; sourceAccount: string; publishedAt: Date }): Promise<ClassifiedNews | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;

    const model = FAST_PATH_KEYWORDS.test(input.rawText) ? 'claude-haiku-4-5-20251001' : 'claude-sonnet-5';

    const prompt = `Sen "Orca AI" adında bir kripto haber-işlem sınıflandırıcısısın. Aşağıdaki X (Twitter) paylaşımını değerlendir ve SADECE aşağıdaki JSON şemasıyla cevap ver, başka hiçbir metin ekleme.

Kaynak hesap: @${input.sourceAccount}
Yayın zamanı: ${input.publishedAt.toISOString()}
Metin: "${input.rawText}"

Kategoriler (SADECE birini seç):
- EXCHANGE_HACK_OR_INSOLVENCY: büyük ölçekli/sistemik borsa hack'i veya iflası (izole/küçük hackler değil)
- OFFICIAL_MA_ACQUISITION: resmi şirket satın alma/birleşme duyurusu
- MACRO_SURPRISE: planlı makro veri (Fed/CPI) ve beklenti-gerçekleşen sapması
- VERIFIED_INFLUENCER: doğrulanmış hesaptan gelen, piyasayı etkileyebilecek kişisel paylaşım
- PARTNERSHIP_INTEGRATION: resmi ortaklık/entegrasyon duyurusu
- EXCHANGE_LISTING: borsa listeleme duyurusu
- MAINNET_UPGRADE: mainnet lansmanı/önemli protokol güncellemesi
- ETF_DECISION: ETF onay/red kararı
- REGULATORY, TOKEN_UNLOCK: bunlar tarihsel olarak whipsaw/sürpriz-yok riskli, işlem açılmaz
- UNVERIFIED_OTHER: yukarıdakilerin hiçbirine net uymuyor veya kaynak/doğrulama yetersiz

Kurallar:
- "verified": kaynağın resmi/doğrulanmış bir hesap olduğuna VE haberin gerçekten yeni olduğuna (eski haberin tekrar servisi olmadığına) inanıyor musun?
- "confidenceScore": 0-1 arası, yönün ve kategorinin doğruluğuna olan güvenin.
- "symbol": ilgili coin'in Binance Futures sembolü (ör. "BTCUSDT"), emin değilsen null.
- "aiSummary": 1-2 cümlelik Türkçe özet.
- "verificationNotes": doğrulama/doğrulamama gerekçen, 1 cümle Türkçe.

JSON şeması:
{"category": "...", "direction": "LONG"|"SHORT"|"NEUTRAL", "symbol": "..."|null, "confidenceScore": 0.0, "verified": true|false, "aiSummary": "...", "verificationNotes": "..."}`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({ model, max_tokens: 500, messages: [{ role: 'user', content: prompt }] }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      const text: string = data.content?.[0]?.text ?? '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      const parsed = JSON.parse(jsonMatch[0]);

      const category = String(parsed.category ?? 'UNVERIFIED_OTHER');
      const tradable =
        TRADABLE_CATEGORIES.has(category) && !!parsed.verified && (parsed.confidenceScore ?? 0) >= MIN_CONFIDENCE_TO_TRADE;

      return {
        category,
        direction: parsed.direction === 'LONG' || parsed.direction === 'SHORT' ? parsed.direction : 'NEUTRAL',
        symbol: parsed.symbol ?? null,
        confidenceScore: parsed.confidenceScore ?? 0,
        tradable,
        verified: !!parsed.verified,
        verificationNotes: parsed.verificationNotes ?? '',
        aiSummary: parsed.aiSummary ?? '',
      };
    } catch (err: any) {
      this.logger.error(`Siniflandirma hatasi: ${err.message}`);
      return null;
    }
  }

  // Haber yayin zamani ile emrin (gercek veya golge) girildigi an arasindaki
  // gecikmeyi kisa bir Turkce cumleyle aciklar - kullanici istegi 2026-08-20:
  // "haberden ne kadar zaman sonra işleme girildiği de yazılsın, yapay zeka
  // tarafından yazılsın". Ayri, ucuz bir Haiku cagrisi (tek cumle, dusuk token).
  async explainLatency(input: { latencyMs: number; shadow: boolean; symbol: string }): Promise<string | null> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return null;
    const seconds = (input.latencyMs / 1000).toFixed(1);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 120,
          messages: [
            {
              role: 'user',
              content: `Sen Orca AI'sın. ${input.symbol} için haber tespitinden ${input.shadow ? 'hayali' : 'gerçek'} emre kadar geçen süre ${seconds} saniye oldu. Bunu tek, kısa, profesyonel bir Türkçe cümleyle özetle (rakamı cümlede kullan). Sadece cümleyi yaz, başka hiçbir şey ekleme.`,
            },
          ],
        }),
      });
      if (!response.ok) return null;
      const data = await response.json();
      return data.content?.[0]?.text?.trim() ?? null;
    } catch {
      return null;
    }
  }
}
