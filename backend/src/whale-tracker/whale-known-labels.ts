export type WhaleCategory = 'EXCHANGE' | 'INSTITUTION' | 'WHALE' | 'UNKNOWN';

// Elle guncellenebilir adres -> etiket eslemesi. Gunluk bitinfocharts rich-list
// taramasi (bkz. whale-tracker.service.ts resolveLabel()) bir adresi burada
// bulursa BU etiket/kategori kullanilir - bitinfocharts'in kendi "wallet"
// ipucundan (varsa) daha guvenilir kabul edilir. Yeni bilinen bir adres tespit
// edilirse buraya elle eklenebilir; kaynak kodu disinda ayri bir admin ekrani YOK.
export const KNOWN_WHALE_LABELS: Record<string, { label: string; category: WhaleCategory }> = {
  '34xp4vRoCGJym3xR7yCVPFHoCNxv4Twseo': { label: 'Binance Soğuk Cüzdanı #1', category: 'EXCHANGE' },
  '3M219KR5vEneNb47ewrPfWyb5jQ2DjxRP6': { label: 'Binance Soğuk Cüzdanı #2', category: 'EXCHANGE' },
  'bc1ql49ydapnjafl5t2cp9zqpjwe6pdgmxy98859v2': { label: 'Robinhood Soğuk Cüzdanı', category: 'EXCHANGE' },
  'bc1qgdjqv0av3q56jvd82tkdjpy7gdp9ut8tlqmgrpmv24sq90ecnvqqjwvw97': { label: 'Bitfinex Soğuk Cüzdanı', category: 'EXCHANGE' },
  'bc1qazcm763858nkj2dj986etajv6wquslv8uxwczt': { label: 'ABD Hükümeti (Bitfinex Hack Kurtarma)', category: 'INSTITUTION' },
  '1FeexV6bAHb8ybZjqQMjJrcCrHGW9sb6uF': { label: 'Mt. Gox Hack Cüzdanı (2011, hareketsiz)', category: 'WHALE' },
};

// KNOWN_WHALE_LABELS'ta bulunmayan bir adres icin bitinfocharts kendi "wallet"
// ipucunu (orn. "Binance-coldwallet", "UK-Gov-Confiscated") veriyorsa, bu ipucu
// okunabilir bir etikete ve kaba bir kategoriye cevrilir - hicbir ipucu yoksa
// (ne KNOWN_WHALE_LABELS'ta ne bitinfocharts'ta) "Bilinmeyen" gosterilir.
export function labelFromBitinfochartsHint(walletName: string): { label: string; category: WhaleCategory } {
  const label = walletName
    .replace(/-?coldwallet$/i, ' Soğuk Cüzdanı')
    .replace(/-/g, ' ')
    .trim();

  const lower = walletName.toLowerCase();
  let category: WhaleCategory = 'WHALE';
  if (/hack|confiscated|seiz|fbi|\bgov\b/.test(lower)) category = 'INSTITUTION';
  else if (/coldwallet|exchange|-pool|reserve/.test(lower)) category = 'EXCHANGE';

  return { label, category };
}
