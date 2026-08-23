"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  Power,
  Sparkles,
  X,
  Zap,
  Target,
  Clock,
  Shield,
  BarChart3,
  Coins,
  Globe2,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PremiumGlowButton } from "@/components/ui/premium-glow-button";
import { ExternalLink } from "@/components/ui/external-link";
import { useAuth } from "@/context/auth-context";
import {
  useAutoTradeConfig,
  useUpdateAutoTradeConfig,
  useAutoTradeStats,
  useAutoTradePositions,
  useCloseAutoTrade,
  useCloseAllAutoTrades,
  useMarketContext,
  useForexAutoTradeStats,
  useForexAutoTradePositions,
  useCloseForexAutoTrade,
  useCloseAllForexAutoTrades,
  useForexMarketContext,
  type LiveAutoTradePosition,
  type BtcCandle,
  type MarketContext,
  type ForexMarketContext,
} from "@/lib/hooks/use-admin-scanner";

type MMMarket = "CRYPTO" | "FOREX";

// Binance funding'i her 8 saatte bir (00:00/08:00/16:00 UTC) tahakkuk eder -
// bu sabit takvimden hesaplaniyor, API'ye gerek yok. Kullanici istegi
// 2026-08-20: "funding icin kalan surede yazsin belki odemek istemezsem
// kapatırım".
function msUntilNextFunding(): number {
  const now = new Date();
  const boundaries = [0, 8, 16];
  const utcHour = now.getUTCHours();
  const nextBoundary = boundaries.find((h) => h > utcHour) ?? 24;
  const next = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), nextBoundary === 24 ? 0 : nextBoundary, 0, 0, 0),
  );
  if (nextBoundary === 24) next.setUTCDate(next.getUTCDate() + 1);
  return next.getTime() - now.getTime();
}
function useFundingCountdown(): string {
  const [ms, setMs] = useState(msUntilNextFunding());
  useEffect(() => {
    const id = setInterval(() => setMs(msUntilNextFunding()), 1000);
    return () => clearInterval(id);
  }, []);
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2">
        <span className="flex size-6 items-center justify-center rounded-md bg-[#3B5BFF1A] text-[#3B5BFF]">
          {icon}
        </span>
        <h3 className="text-card-title-sm text-[#F5F1EA]">{title}</h3>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}

function AboutMoneyMakerPanel({ onClose }: { onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 backdrop-blur-sm p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="premium-glow-card relative my-4 w-full max-w-3xl space-y-6 bg-card p-5 sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Kapat"
          className="absolute right-4 top-4 rounded-full p-1.5 text-[#A8A6A0] transition-colors hover:bg-white/10 hover:text-[#F5F1EA]"
        >
          <X size={18} />
        </button>

        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2">
            <Sparkles size={20} className="text-[#3B5BFF]" />
            <h2 className="text-h2 text-[#F5F1EA]">Money Maker — Otomatik İşlem Motoru</h2>
          </div>
          <p className="text-body-sm text-[#A8A6A0]">
            Orca ACS'in ürettiği sinyalleri, kullanıcı müdahalesi olmadan gerçek Binance USDT-M Futures
            emirlerine çeviren yürütme (execution) katmanı. Sinyalin yönünü/seviyelerini bu modül{" "}
            <b className="text-[#F5F1EA]">belirlemez</b> — o tamamen Orca ACS'e ait; bu modül sadece Orca ACS
            zaten üretmiş olduğu sinyali borsada gerçek bir pozisyona çevirir ve yönetir.
          </p>
        </div>

        <div className="space-y-5">
          <Section icon={<Zap size={16} />} title="Ne İşe Yarar">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                Orca ACS bir sinyal ürettiğinde (kripto, WATCHING durumuna geçtiğinde) bu modül devreye girer ve
                borsada gerçek bir giriş emri açar. Amaç, sinyali elle takip edip giriş/stop/TP emirlerini tek
                tek açma ve TP1 alınca stop'u başabaşa çekme gibi işlemleri insan gecikmesi olmadan, saniyeler
                içinde otomatik yapmaktır.
              </p>
              <p>
                Forex sinyalleri için çalışmaz — Binance Futures'ta EURUSD/GBPUSD gibi forex kontratları yok,
                sadece kripto paritelerinde (BTCUSDT, ETHUSDT vb.) işlem açılabiliyor.
              </p>
            </div>
          </Section>

          <Section icon={<Target size={16} />} title="Emir Akışı (Baştan Sona)">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                <b className="text-[#F5F1EA]">1) Giriş emri:</b> Orca ACS yeni bir sinyal kaydettiği anda,
                retest bölgesinin sınırında (LONG için üst sınır, SHORT için alt sınır) bekleyen bir{" "}
                <b className="text-[#8FB8FF]">LIMIT</b> emir açılır — piyasa emri değil, fiyatın o bölgeye
                gelmesi beklenir.
              </p>
              <p>
                <b className="text-[#F5F1EA]">2) Doldu bildirimi:</b> Emir dolduğunda Binance'in "User Data
                Stream" websocket kanalından <b className="text-[#8FB8FF]">anlık</b> (saniyeler içinde)
                bildirim gelir — 15 dakikalık tarama döngüsü beklenmez, hiç fiyat "pollanmaz".
              </p>
              <p>
                <b className="text-[#F5F1EA]">3) Koruma emirleri:</b> Giriş doldu bildirimi gelir gelmez, aynı
                anda dört emir birden açılır: stop (tam miktar, <b className="text-[#8FB8FF]">STOP_MARKET</b> —
                hızlı hareketlerde kesin çıkış için piyasa emri), TP1 (%50), TP2 (%25), TP3 (kalan %25) — TP'ler{" "}
                <b className="text-[#8FB8FF]">LIMIT reduceOnly</b>.
              </p>
              <p>
                <b className="text-[#F5F1EA]">4) TP1 doldu:</b> Eski stop iptal edilir, kalan %50 için{" "}
                <b className="text-[#22C55E]">giriş fiyatında (başabaş)</b> yeni bir stop açılır — bu andan
                itibaren pozisyonda kayıp riski kalmaz.
              </p>
              <p>
                <b className="text-[#F5F1EA]">5) TP2 doldu:</b> Kural gereği stop değişmez (zaten başabaşta),
                sadece bilgilendirme bildirimi gönderilir.
              </p>
              <p>
                <b className="text-[#F5F1EA]">6) Kapanış:</b> TP3 ya da stop dolduğunda pozisyon tamamen
                kapanmış sayılır, kalan açık emirler (varsa) iptal edilir.
              </p>
            </div>
          </Section>

          <Section icon={<Coins size={16} />} title="Pozisyon Büyüklüğü ve Kaldıraç">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                <b className="text-[#F5F1EA]">Miktar</b> = İşlem başına risk (USDT) ÷ (giriş-stop mesafesi). Yani
                panelde "10 USDT" yazarsan, pozisyon TP1'e hiç ulaşmadan stop'a çarparsa kaybedilecek tutar tam
                olarak 10 USDT olur — bakiyenin yüzdesi değil, sabit bir dolar tutarı.
              </p>
              <p>
                <b className="text-[#F5F1EA]">Kaldıraç:</b> panelde ayarladığın değer önce Binance'in o sembol
                için izin verdiği tavana göre kontrol edilir (<code>/fapi/v1/leverageBracket</code>) — sembol
                daha düşük bir tavana izin veriyorsa (ör. 100x istendi ama coin'de max 50x varsa) otomatik
                olarak izin verilen değere düşürülür, emir reddedilmez.
              </p>
            </div>
          </Section>

          <Section icon={<Shield size={16} />} title="Güvenlik Mekanizmaları">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                <b className="text-[#F5F1EA]">İki bağımsız kilit:</b> (1) backend <code>.env</code> içinde
                gerçek bir Binance API key/secret tanımlı olmalı, (2) bu paneldeki "Aç" anahtarı ayrıca AÇIK
                olmalı. İkisinden biri eksikse hiçbir gerçek emir gönderilmez.
              </p>
              <p>
                <b className="text-[#F5F1EA]">Mainnet aktif:</b> <code>BINANCE_TESTNET</code> env değişkeni{" "}
                <code>false</code> olarak ayarlı — bu hesap gerçek (mainnet) Binance USDT-M Futures'a bağlı,
                açılan tüm emirler gerçek parayla çalışır.
              </p>
              <p>
                <b className="text-[#F5F1EA]">Kısmi dolum güvenlik ağı:</b> Bir sinyal, giriş emri kısmen dolmuş
                haldeyken geçersizleşirse (Orca ACS setup'ı iptal ederse), önce bekleyen emir iptal edilir,
                sonra borsada gerçekten korumasız (SL'siz) kalmış bir pozisyon varsa piyasa fiyatından hemen
                kapatılır.
              </p>
              <p>
                <b className="text-[#F5F1EA]">API key izinleri:</b> sadece "Futures" işlem izni olmalı,{" "}
                <b className="text-[#EF4444]">"Enable Withdrawals" (para çekme) kesinlikle kapalı</b> tutulmalı
                — bot bu izne asla ihtiyaç duymaz.
              </p>
              <p>
                <b className="text-[#F5F1EA]">Bildirimler:</b> pozisyon açıldığında, TP1/TP2 alındığında,
                pozisyon kapandığında ve herhangi bir hata/kritik durumda (ör. SL emri açılamadı) tüm
                SUPER_ADMIN kullanıcılarına anlık bildirim gönderilir.
              </p>
            </div>
          </Section>

          <Section icon={<BarChart3 size={16} />} title="İstatistik ve Kâr/Zarar">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                Bu sayfadaki kazandı/kayıp/win-rate ve $ rakamları <b className="text-[#F5F1EA]">tahmin
                değil</b> — Binance'in kendi <code>/fapi/v1/income</code> kaydından çekilir (işlem kârı,
                komisyon, funding ayrı ayrı). TP1'den sonra başabaş stop'a çarpma bir kayıp{" "}
                <b className="text-[#F5F1EA]">sayılmaz</b> (o dilimin karı zaten bankaya yatmıştı) — sadece
                TP1'e hiç ulaşmadan stop'a çarpanlar "kayıp" olarak sayılır.
              </p>
              <p>
                Bu istatistik, Orca ACS sayfasındaki simülasyon/win-rate istatiğinden{" "}
                <b className="text-[#F5F1EA]">bağımsızdır</b> — Orca ACS kendi mum-bazlı tahminini kullanır, bu
                sayfa sadece gerçekten açılmış (Money Maker AÇIK'ken tetiklenmiş) sinyalleri sayar.
              </p>
            </div>
          </Section>

          <Section icon={<Target size={16} />} title="Açık Pozisyon Kartları ve Elle Kapatma">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                Açık bir pozisyon varken Orca ACS/Binance ekranına hiç girmeden, sayfanın en üstünde her
                pozisyon için ayrı bir kart görürsün: giriş fiyatı, anlık mark fiyat, miktar, notional ($),
                kaldıraç, likidasyon fiyatı, <b className="text-[#F5F1EA]">anlık açık kâr/zarar</b>, TP1/TP2 ile
                bankaya çoktan yatmış kâr, o ana kadar ödenmiş komisyon/funding ve hepsinin toplamı olan{" "}
                <b className="text-[#F5F1EA]">anlık net</b> — 5 saniyede bir kendiliğinden tazelenir.
              </p>
              <p>
                <b className="text-[#F5F1EA]">Sonraki funding'e kalan süre</b> her kartta sayaç olarak gösterilir
                (Binance'te funding her 8 saatte bir, 00:00/08:00/16:00 UTC'de tahakkuk eder) — ödemeden hemen
                önce pozisyonu kapatmak istersen bu sayede ne zaman olduğunu görürsün.
              </p>
              <p>
                Her kartta bir <b className="text-[#EF4444]">"Kapat"</b> butonu, sayfanın üstünde ise tüm açık
                pozisyonları tek seferde kapatan <b className="text-[#EF4444]">"Tüm İşlemleri Kapat"</b> butonu
                var. İkisi de aynı şekilde çalışır: önce o pozisyona ait kalan tüm emirler (stop/TP1/TP2/TP3)
                iptal edilir, sonra kalan miktar <b className="text-[#8FB8FF]">MARKET</b> emriyle (piyasa
                fiyatından, anında) kapatılır — limit emir beklenmez, amaç kesin ve hızlı çıkıştır. Kapanış
                sonrası gerçek kâr/zarar (Binance'in kendi kaydından) "Son gerçek işlemler" listesine{" "}
                <code>MANUAL_CLOSE</code> etiketiyle düşer.
              </p>
            </div>
          </Section>

          <Section icon={<Clock size={16} />} title="Diğer">
            <ul className="list-inside list-disc space-y-1 text-body-xs text-[#D6D3CB]">
              <li>Sadece kripto sinyallerinde çalışır (Orca ACS forex tarafında bu modül hiç devreye girmez).</li>
              <li>Bir sinyalin girişi hiç dolmadan 3 gün geçerse (Orca ACS'in kendi zaman aşımı kuralı) bekleyen emir otomatik iptal edilir.</li>
              <li>Panel 15-30 saniyede bir kendiliğinden güncellenir; emir doluşları ise anlık (websocket) yansır.</li>
            </ul>
          </Section>
        </div>
      </div>
    </div>
  );
}

function fmtUsd(n: number) {
  return n.toFixed(2);
}

// Coin fiyatlari (giris/mark/stop/TP) DB'de ham float olarak duruyor (orn.
// 573.8596428571427) - normal fiyatli coinlerde bu kadar hane anlamsiz/cirkin
// gorunuyordu, ama meme coin gibi cok kucuk fiyatli (0.00000xxx) coinlerde
// hane kirpilirse fiyat sifira yuvarlanip anlamsizlasirdi (kullanici istegi
// 2026-08-20: "573.85... bu kadar uzanmasın, meme coinlerde gözüksün de
// bunlara gerek yok"). Fiyat buyuklugune gore basamak sayisi kademelendirilip
// sondaki gereksiz sifirlar atiliyor.
function fmtPrice(n: number | null): string {
  if (n == null) return "—";
  const abs = Math.abs(n);
  const decimals = abs >= 100 ? 2 : abs >= 1 ? 4 : abs >= 0.01 ? 6 : 8;
  return parseFloat(n.toFixed(decimals)).toString();
}

// scanner sayfasindaki CoinIcon deseniyle birebir ayni - iki farkli CDN
// denenir, ikisi de basarisiz olursa yerine bir ok ikonu duser (bkz. onError).
function CoinIcon({ symbol }: { symbol: string }) {
  const [level, setLevel] = useState(0);
  const base = symbol.replace(/USDT$/, "").toLowerCase();
  const sources = [
    `https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@master/128/color/${base}.png`,
    `https://assets.coincap.io/assets/icons/${base}@2x.png`,
  ];
  if (level >= sources.length) return null;
  return (
    <img
      key={level}
      src={sources[level]}
      alt={symbol}
      className="h-5 w-5 shrink-0 rounded-full object-contain"
      onError={() => setLevel((l) => l + 1)}
    />
  );
}

// scanner sayfasindaki CoinIcon/Binance-link deseniyle birebir ayni - kullanici
// istegi 2026-08-20: "logo coin adı yanına binance futures linki olsun".
function BinanceFuturesLink({ symbol }: { symbol: string }) {
  return (
    <ExternalLink href={`https://www.binance.com/en/futures/${symbol}`} className="text-[#A8A6A0] hover:text-primary">
      <svg width="12" height="12" viewBox="0 0 24 24" fill="#F0B90B">
        <path d="M12 2 L15.5 5.5 L12 9 L8.5 5.5 Z" />
        <path d="M5.5 8.5 L9 12 L5.5 15.5 L2 12 Z" />
        <path d="M18.5 8.5 L22 12 L18.5 15.5 L15 12 Z" />
        <path d="M12 15 L15.5 18.5 L12 22 L8.5 18.5 Z" />
        <path d="M12 9 L14.5 11.5 L12 14 L9.5 11.5 Z" />
      </svg>
    </ExternalLink>
  );
}

// Mum govdesi/fitili icin basit, kutuphanesiz bir SVG mum grafigi - proje
// genelindeki Sparkline deseniyle ayni ruhta (bkz. components/tools/sparkline.tsx)
// ama OHLC veriden mum ciziyor. viewBox 100 birim genislikte, preserveAspectRatio
// "none" ile karti tam kaplayacak sekilde geriliyor.
function CandleChart({ candles }: { candles: BtcCandle[] }) {
  if (candles.length === 0) return null;
  const min = Math.min(...candles.map((c) => c.low));
  const max = Math.max(...candles.map((c) => c.high));
  const range = max - min || 1;
  const chartH = 40;
  const y = (v: number) => chartH - ((v - min) / range) * (chartH - 6) - 3;
  const n = candles.length;
  const slotW = 100 / n;
  const bodyW = slotW * 0.6;
  return (
    <svg viewBox={`0 0 100 ${chartH}`} preserveAspectRatio="none" className="relative h-24 w-full sm:h-28">
      {candles.map((c, i) => {
        const cx = i * slotW + slotW / 2;
        const up = c.close >= c.open;
        const color = up ? "#22C55E" : "#EF4444";
        const bodyTop = y(Math.max(c.open, c.close));
        const bodyBottom = y(Math.min(c.open, c.close));
        return (
          <g key={c.time}>
            <line x1={cx} x2={cx} y1={y(c.high)} y2={y(c.low)} stroke={color} strokeWidth={1} vectorEffect="non-scaling-stroke" />
            <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={Math.max(bodyBottom - bodyTop, 0.5)} fill={color} />
          </g>
        );
      })}
    </svg>
  );
}

// Sayfanin en ustunde, kaldirac/risk ayarlarinin bile ustunde duran BTC
// referans karti - kullanici istegi 2026-08-20: "mum çubukları olsun, açık
// pozisyon ve bekleyen emirlerdekilerle korelasyonu kıyasla, sembol adı
// korelasyon bilgisi yazsın sırayla". Diger kartlardan (PositionCard) farkli
// olarak standart/sabit kose kullanir - donen premium-glow-card cercevesi
// BİLEREK kullanılmadı (kullanici istegi: "köşesi standart olsun, hoverlı
// animasyonlu olmasın açık pozisyonlar gibi").
// BTC (kripto) ve DXY (forex - kullanici istegi 2026-08-22: "dxy koy xbt
// gibi") korelasyon kartlari ayni gorsel/veri sekline sahip - tek bir genel
// bilesen olarak tutuluyor, sadece etiket/ikon/veri kaynagi farkli.
function MarketRefChartCard({
  label,
  icon,
  price,
  changePercent,
  candles,
  correlations,
  positions,
}: {
  label: string;
  icon: React.ReactNode;
  price: number | null | undefined;
  changePercent: number | null | undefined;
  candles: BtcCandle[];
  correlations: Record<string, number | null> | undefined;
  positions: LiveAutoTradePosition[] | undefined;
}) {
  const positive = (changePercent ?? 0) >= 0;
  const color = positive ? "#22C55E" : "#EF4444";
  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-border p-4 sm:p-5 space-y-2"
      style={{ background: "radial-gradient(120% 140% at 0% 0%, #1B1F3B 0%, #11142A 45%, #0A0C1B 100%)" }}
    >
      <div className="relative flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-body-md font-bold tracking-tight text-[#F5F1EA]">{label}</span>
          <span className="rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#A8A6A0]" style={{ backgroundColor: "#A8A6A022" }}>
            Korelasyon
          </span>
        </div>
        {price != null ? (
          <div className="text-right">
            <div className="text-body-md font-bold text-[#F5F1EA]">${fmtPrice(price)}</div>
            {changePercent != null && (
              <div className="text-badge font-semibold" style={{ color }}>
                {positive ? "+" : ""}{changePercent.toFixed(2)}%
              </div>
            )}
          </div>
        ) : (
          <span className="text-body-xs text-[#A8A6A0]">Yükleniyor...</span>
        )}
      </div>
      <CandleChart candles={candles} />
      {(() => {
        const openPositions = (positions ?? []).filter((p) => p.status !== "CLOSED");
        if (openPositions.length === 0) return null;
        return (
          <div className="relative space-y-1 border-t border-white/10 pt-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-[#A8A6A0]">{label} korelasyonu (açık/bekleyen işlemler)</p>
            {openPositions.map((p) => {
              const corr = correlations?.[p.symbol];
              const corrColor = corr == null ? "#605D57" : corr >= 0.5 ? "#22C55E" : corr <= -0.5 ? "#EF4444" : "#F5A623";
              const corrLabel = corr == null ? "veri yetersiz" : corr >= 0.5 ? "güçlü aynı yönlü" : corr <= -0.5 ? "güçlü ters yönlü" : "zayıf/nötr";
              return (
                <div key={p.id} className="flex items-center justify-between text-body-xs">
                  <span className="text-[#F5F1EA] font-semibold">{p.symbol}</span>
                  <span style={{ color: corrColor }}>
                    {corr != null ? `${corr >= 0 ? "+" : ""}${(corr * 100).toFixed(0)}%` : "—"} <span className="text-[#605D57]">({corrLabel})</span>
                  </span>
                </div>
              );
            })}
          </div>
        );
      })()}
    </div>
  );
}

function PositionCard({
  position,
  onClose,
  isClosing,
  riskPerTradeUsdt,
  market,
}: {
  position: LiveAutoTradePosition;
  onClose: () => void;
  isClosing: boolean;
  riskPerTradeUsdt: number | null;
  market: MMMarket;
}) {
  const fundingCountdown = useFundingCountdown();
  const isPending = position.status === "PENDING_ENTRY";
  const isClosed = position.status === "CLOSED";
  const isLong = position.direction === "LONG";
  const unrealized = position.unrealizedProfit ?? 0;
  // Su ana kadar bankaya yatmis (TP1/TP2 kismi kapanislari) kar + acik kalan
  // dilimin anlik kari + o ana kadar odenen komisyon/funding - toplam "su an
  // elde cepte ne var" gorunumu.
  const liveNet = unrealized + position.realizedSoFar + position.commissionSoFar + position.fundingSoFar;
  // Kart kenar rengi: bekleyen turuncu, acik pozisyon mavi, TP ile kapanan
  // yesil, stop ile kapanan (basabas dahil - HANGI EMIR TIPININ kapattigina
  // bakilir, kar/zarar yonune degil) kirmizi - kullanici istegi 2026-08-20:
  // "bekleyen emirlerin kart kenarları turuncu olsun işlemdekiler mavi olsun
  // tp ile kapananlar yeşil ... stop olanlar kırmızı kenar olsun".
  const borderColor = isPending
    ? "#F5A623"
    : isClosed
      ? position.closeReason === "TP3"
        ? "#22C55E"
        : position.closeReason === "STOP_BREAKEVEN" || position.closeReason === "STOP_FULL_LOSS"
          ? "#EF4444"
          : "#605D57"
      : "#3B5BFF";
  // "AÇIK" etiketi TP1/breakeven sonrasi da SABIT kalir - TP1 dolunca ozel
  // bir "TP1 ALINDI — BAŞABAŞ" metnine gecmiyoruz artik, o bilgi zaten TP1
  // kutusunda (dolu/yesil) ayrica gosteriliyor, ustte tekrar yazmak kafa
  // karistiriyordu (kullanici geri bildirimi 2026-08-20: "açık etiketi
  // kalkmış o kalkmasın... TP1 ALINDI BAŞABAŞ hiç yazmasın").
  const statusColor = isClosed ? borderColor : isPending ? "#F5A623" : "#3B5BFF";
  // Kapanis sebebi (TP3/stop/basabas) artik ustteki etikette degil, alttaki
  // Not kutusunda yaziyor - kullanici istegi 2026-08-22: "kısmı etiket olarak
  // yazmasın hepsi Not kısmında yazsın". Etiket kapanmis islemler icin sadece
  // "KAPANDI" der, renk (kenar/statusColor) zaten TP/stop ayrimini tasir.
  const statusLabel = isClosed
    ? "KAPANDI"
    : isPending
      ? "BEKLİYOR — LİMİT EMİR DOLMADI"
      : "AÇIK";

  // R-multiple: risk mesafesi. Kripto'da sabit dolar riski/miktardan turetilir
  // (config.riskPerTradeUsdt / qty) - TP1 sonrasi stop basabasa cekilse bile
  // ORIJINAL risk sabit kalir. Forex'te sabit dolar riski yok (bkz. backend
  // ForexAutoTradeService - marj x kaldirac modeli), ama TP1 tanim geregi HER
  // ZAMAN girisin tam 1R uzaginda oldugu icin |TP1-giris| direkt 1R mesafesidir -
  // "1R" her iki markette de ayni anlama gelir (kullanici istegi 2026-08-20:
  // "yüzdelik ve RR'ları da parantez içinde yaz").
  const riskDistance =
    market === "FOREX"
      ? position.tp1Price != null && position.entryPrice != null
        ? Math.abs(position.tp1Price - position.entryPrice)
        : null
      : riskPerTradeUsdt && position.qty
        ? riskPerTradeUsdt / position.qty
        : null;
  const levelMeta = (level: number | null) => {
    if (level == null || position.entryPrice == null) return null;
    const signedMove = isLong ? level - position.entryPrice : position.entryPrice - level;
    const pct = (signedMove / position.entryPrice) * 100;
    const r = riskDistance ? signedMove / riskDistance : null;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(2)}%${r != null ? ` · ${r >= 0 ? "+" : ""}${r.toFixed(2)}R` : ""}`;
  };
  const stopMeta = levelMeta(position.stopPrice);
  const tp1Meta = position.tp1Price != null ? levelMeta(position.tp1Price) : null;
  const tp2Meta = position.tp2Price != null ? levelMeta(position.tp2Price) : null;
  const tp3Meta = position.tp3Price != null ? levelMeta(position.tp3Price) : null;
  // Backend'den gelen dolu bayraklari - fiyat artik dolduktan sonra da sabit
  // kaliyor (bkz. getLivePositions yorumu), sadece bu bayraklar "doldu mu"yu
  // gosteriyor (kullanici istegi 2026-08-20: "tp1 tp2 dolmuş diyor ya rr ve
  // yüzdeliği silme").
  const tp1Filled = position.tp1Filled;
  const tp2Filled = position.tp2Filled;
  const tp3Filled = position.tp3Filled;
  // Alt bildirim notu - en ileri asamayi gosterir (stop > TP2 > TP1). Kapanmis
  // islemlerde kapanis sebebi (TP3/stop/basabas) burada yaziyor - ustteki
  // etiket artik sadece "KAPANDI" diyor (kullanici istegi 2026-08-22).
  const noteText = isClosed
    ? position.closeReason === "TP3"
      ? "NOT: TP3 ile kapandı."
      : position.closeReason === "STOP_BREAKEVEN"
        ? "NOT: Başabaş stop ile kapandı."
        : position.closeReason === "STOP_FULL_LOSS"
          ? "NOT: Stop ile kapandı."
          : "NOT: Elle kapatıldı."
    : position.stopTriggered
      ? "NOT: İşlem Stop Oldu."
      : tp2Filled
        ? "NOT: TP2 Alındı. Stop zaten girişte (değişmedi)."
        : tp1Filled
          ? "NOT: TP1 Alındı, Giriş Stopa Çekildi."
          : null;
  // Not kutusu rengi: stop'a bagli (acik pozisyonda stopTriggered, kapanmis
  // pozisyonda STOP_BREAKEVEN/STOP_FULL_LOSS) durumlarda kirmizi, digerlerinde
  // (TP3, TP1/TP2, elle kapatma) pembe - kullanici istegi 2026-08-22: "notun
  // rengi pembe olsun yeşil değil".
  const noteIsStop = isClosed
    ? position.closeReason === "STOP_BREAKEVEN" || position.closeReason === "STOP_FULL_LOSS"
    : position.stopTriggered;
  // "Şeker pembesi" - kullanici istegi 2026-08-22: "premium dizayn" (diger
  // kartlardaki glow/boxShadow desenine uygun canli pembe, soluk degil).
  const noteColor = noteIsStop ? "#EF4444" : "#FF4FA3";

  return (
    <div
      className="relative overflow-hidden rounded-2xl p-4 sm:p-5 space-y-3"
      style={{
        background: "radial-gradient(120% 140% at 0% 0%, #1B1F3B 0%, #11142A 45%, #0A0C1B 100%)",
        border: `1.5px solid ${borderColor}`,
      }}
    >
      <div
        className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full blur-3xl opacity-25"
        style={{ background: isLong ? "#22C55E" : "#EF4444" }}
      />
      <div className="relative flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          {market === "CRYPTO" ? <CoinIcon symbol={position.symbol} /> : <Globe2 size={18} className="shrink-0 text-[#A8A6A0]" />}
          <span className="text-body-md font-bold tracking-tight text-[#F5F1EA]">{position.symbol}</span>
          {market === "CRYPTO" && <BinanceFuturesLink symbol={position.symbol} />}
          <span
            className="rounded-full px-2.5 py-1 text-badge font-semibold uppercase"
            style={{
              backgroundColor: isLong ? "#22C55E22" : "#EF444422",
              color: isLong ? "#22C55E" : "#EF4444",
              boxShadow: `0 0 12px -2px ${isLong ? "#22C55E66" : "#EF444466"}`,
            }}
          >
            {position.direction}
          </span>
          <span
            className="rounded-full px-2.5 py-1 text-badge font-semibold uppercase"
            style={{ backgroundColor: `${statusColor}22`, color: statusColor, boxShadow: `0 0 12px -2px ${statusColor}66` }}
          >
            {statusLabel}
          </span>
        </div>
        {!isClosed && (
          <Button
            onClick={onClose}
            disabled={isClosing}
            className="h-8 gap-1.5 text-badge"
            style={{ backgroundColor: "#EF4444" }}
          >
            <XCircle size={13} />
            {isPending ? "Emri İptal Et" : "Kapat"}
          </Button>
        )}
      </div>

      <div className="relative grid grid-cols-2 gap-x-4 gap-y-1.5 text-body-xs text-[#A8A6A0] sm:grid-cols-4">
        <span>
          Giriş: <b className="text-[#F5F1EA]">{fmtPrice(position.entryPrice)}</b>
          {isPending && <span className="ml-1" style={{ color: "#F5A623" }}>(bekleniyor)</span>}
        </span>
        <span>Mark: <b className="text-[#F5F1EA]">{fmtPrice(position.markPrice)}</b></span>
        <span>Miktar: <b className="text-[#F5F1EA]">{position.qty ?? "—"}</b></span>
        {!isPending && !isClosed && (
          <>
            <span>Notional: <b className="text-[#F5F1EA]">${position.notional != null ? fmtUsd(position.notional) : "—"}</b></span>
            <span>Kaldıraç: <b className="text-[#F5F1EA]">{position.leverage ?? "—"}x</b></span>
            <span>
              Likidasyon: <b className="text-[#F5F1EA]">{fmtPrice(position.liquidationPrice)}</b>
              {market === "FOREX" && <span className="text-[#605D57]"> (tahmini)</span>}
            </span>
            {market === "CRYPTO" && (
            <span className="col-span-2 sm:col-span-4 whitespace-nowrap">
              Sonraki funding: <b className="text-[#F5A623]">{fundingCountdown}</b>
              {position.fundingRate != null && (() => {
                // Binance'in ham funding rate'i "LONG'lar oduyor mu" isaretini
                // tasir (rate>0 => longlar SHORT'lara oder) - bu bizim
                // pozisyonumuza etkisiyle ayni degil (SHORT'ta ters doner).
                // Kullanicinin gorecegi yuzde/isaret dogrudan "biz ne kadar
                // kazaniyoruz/kaybediyoruz" olmali (kullanici istegi
                // 2026-08-20: "-0.0089% alacağız" yazdiginda + isareti yok,
                // bu yanlis - kazaniyorsak isaret + olmali).
                const effect = isLong ? -position.fundingRate : position.fundingRate;
                const costsUs = effect < 0;
                const benefitsUs = effect > 0;
                const color = costsUs ? "#EF4444" : benefitsUs ? "#22C55E" : "#A8A6A0";
                const pct = (effect * 100).toFixed(4);
                return (
                  <b className="ml-1" style={{ color }}>
                    ({effect >= 0 ? "+" : ""}{pct}% {costsUs ? "ödeyeceğiz" : benefitsUs ? "alacağız" : ""})
                  </b>
                );
              })()}
            </span>
            )}
          </>
        )}
      </div>

      {!isClosed && (
      <div className="relative grid grid-cols-2 gap-2 text-body-xs sm:grid-cols-4 border-t border-white/10 pt-2.5">
        <div
          className="rounded-lg px-2.5 py-1.5"
          style={
            position.stopTriggered
              ? { backgroundColor: "#EF44441A", border: "1px solid #EF444488", boxShadow: "0 0 10px -4px #EF444480" }
              : { backgroundColor: "transparent", border: "1px solid #EF444455" }
          }
        >
          <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#EF4444" }}>
            Stop{position.stopTriggered ? " ✓" : ""}
          </div>
          <div className="font-semibold" style={{ color: "#F5F1EA" }}>{fmtPrice(position.stopPrice)}</div>
          {stopMeta && <div style={{ color: "#EF444499" }}>{stopMeta}</div>}
        </div>
        {([
          { label: "TP1", price: position.tp1Price, meta: tp1Meta, filled: tp1Filled },
          { label: "TP2", price: position.tp2Price, meta: tp2Meta, filled: tp2Filled },
          { label: "TP3", price: position.tp3Price, meta: tp3Meta, filled: tp3Filled },
        ] as const).map((tp) => (
          <div
            key={tp.label}
            className="rounded-lg px-2.5 py-1.5"
            style={
              tp.filled
                ? { backgroundColor: "#22C55E1A", border: "1px solid #22C55E88", boxShadow: "0 0 10px -4px #22C55E80" }
                : { backgroundColor: "transparent", border: "1px solid #22C55E55" }
            }
          >
            <div className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "#22C55E" }}>
              {tp.label}{tp.filled ? " ✓" : ""}
            </div>
            <div className="font-semibold" style={{ color: "#F5F1EA" }}>{fmtPrice(tp.price)}</div>
            {tp.meta && <div style={{ color: "#22C55E99" }}>{tp.meta}</div>}
          </div>
        ))}
      </div>
      )}

      {noteText && (
        <div
          className="relative rounded-lg px-3 py-2 text-body-xs font-semibold"
          style={{
            backgroundColor: `${noteColor}1F`,
            color: noteColor,
            border: `1px solid ${noteColor}55`,
            boxShadow: `0 0 14px -4px ${noteColor}80`,
          }}
        >
          {noteText}
        </div>
      )}

      {!isPending && (
        <div className="relative flex items-center gap-3 text-body-xs flex-wrap border-t border-white/10 pt-2.5">
          <span className="text-[#A8A6A0]">
            Açık kısım (anlık): <b style={{ color: unrealized >= 0 ? "#22C55E" : "#EF4444" }}>{unrealized >= 0 ? "+" : ""}${fmtUsd(unrealized)}</b>
          </span>
          <span className="text-[#A8A6A0]">
            Bankaya yatan (TP1/TP2): <b style={{ color: position.realizedSoFar >= 0 ? "#22C55E" : "#EF4444" }}>{position.realizedSoFar >= 0 ? "+" : ""}${fmtUsd(position.realizedSoFar)}</b>
          </span>
          <span className="text-[#A8A6A0]">
            Komisyon: <b style={{ color: position.commissionSoFar >= 0 ? "#22C55E" : "#EF4444" }}>{position.commissionSoFar >= 0 ? "+" : "-"}${fmtUsd(Math.abs(position.commissionSoFar))}</b>
          </span>
          <span className="text-[#A8A6A0]">
            Funding: <b style={{ color: position.fundingSoFar >= 0 ? "#22C55E" : "#EF4444" }}>{position.fundingSoFar >= 0 ? "+" : "-"}${fmtUsd(Math.abs(position.fundingSoFar))}</b>
          </span>
          <span className="font-semibold" style={{ color: liveNet >= 0 ? "#22C55E" : "#EF4444" }}>
            Toplam (anlık net): {liveNet >= 0 ? "+" : ""}${fmtUsd(liveNet)}
          </span>
        </div>
      )}
    </div>
  );
}

// Orca ACS (sinyal tarayıcı) ayrı bir modül - bu sayfa SADECE gerçek Binance
// hesabına bağlı otomatik işlem (execution) katmanını kontrol eder. Kullanıcı
// isteği 2026-08-20: "Orca ACS içine gözükmesi kafa karıştırıcak" - bilerek
// ayrı bir sayfa/modül olarak tutuluyor, Orca ACS sayfasına gömülü değil.
export default function MoneyMakerPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [showAbout, setShowAbout] = useState(false);
  // Kripto/Forex ayrimi - Orca ACS'teki (scanner sayfasi) Piyasa toggle'iyla
  // birebir ayni gorsel dil (kullanici istegi 2026-08-22: "toggle ile
  // ayrılsın... tıpkı orca acs ekranındaki gibi").
  const [market, setMarket] = useState<MMMarket>("CRYPTO");
  const { data: config, isLoading } = useAutoTradeConfig();
  const { data: stats } = useAutoTradeStats();
  const { data: positions } = useAutoTradePositions();
  const { data: marketContext } = useMarketContext(positions?.map((p) => p.symbol) ?? []);
  const updateConfig = useUpdateAutoTradeConfig();
  const closeOne = useCloseAutoTrade();
  const closeAll = useCloseAllAutoTrades();
  const [riskUsdt, setRiskUsdt] = useState<string>("");
  const [leverage, setLeverage] = useState<string>("");

  // Forex - bkz. backend ForexAutoTradeService basindaki aciklama: gercek
  // broker emri YOK, henuz sadece TrackedSignal'i izleyen bir simulasyon.
  const { data: forexStats } = useForexAutoTradeStats();
  const { data: forexPositions } = useForexAutoTradePositions();
  const { data: forexMarketContext } = useForexMarketContext(forexPositions?.map((p) => p.symbol) ?? []);
  const closeOneForex = useCloseForexAutoTrade();
  const closeAllForex = useCloseAllForexAutoTrades();

  if (authLoading) {
    return <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-body-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  const riskValue = riskUsdt === "" ? config?.riskPerTradeUsdt ?? 10 : Number(riskUsdt);
  const leverageValue = leverage === "" ? config?.leverage ?? 10 : Number(leverage);

  async function handleToggle() {
    if (!config) return;
    try {
      // Aç/Kapat, kutucuklarda o an yazan risk/kaldıraç değerlerini de birlikte
      // kaydeder - önceden "Aç" ile "Kaydet" ayrıydı, kullanıcı sadece "Aç"a
      // basınca kutudaki değerler sessizce kaydedilmeden kalıyordu (bkz.
      // kullanıcı geri bildirimi 2026-08-20: 100$/100x yazıp Aç'a bastı, DB'de
      // hâlâ eski 10/10 kalmıştı).
      await updateConfig.mutateAsync({ enabled: !config.enabled, riskPerTradeUsdt: riskValue, leverage: leverageValue });
      toast.success(!config.enabled ? "Money Maker AÇILDI — gerçek emirler açılabilir" : "Money Maker kapatıldı");
    } catch (err: any) {
      toast.error(err?.message ?? "Ayar güncellenemedi");
    }
  }

  async function handleSaveRisk() {
    try {
      await updateConfig.mutateAsync({ riskPerTradeUsdt: riskValue, leverage: leverageValue });
      toast.success("Risk ayarları kaydedildi");
    } catch (err: any) {
      toast.error(err?.message ?? "Ayar güncellenemedi");
    }
  }

  async function handleCloseOne(id: string, symbol: string) {
    try {
      await closeOne.mutateAsync(id);
      toast.success(`${symbol} piyasa fiyatından kapatıldı`);
    } catch (err: any) {
      toast.error(err?.message ?? "Pozisyon kapatılamadı");
    }
  }

  async function handleCloseAll() {
    try {
      const res = await closeAll.mutateAsync();
      toast.success(`${res.closed} işlem piyasa fiyatından kapatıldı`);
    } catch (err: any) {
      toast.error(err?.message ?? "İşlemler kapatılamadı");
    }
  }

  async function handleForexToggle() {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({ forexEnabled: !config.forexEnabled });
      toast.success(!config.forexEnabled ? "Money Maker (Forex) AÇILDI — simülasyon başlıyor" : "Money Maker (Forex) kapatıldı");
    } catch (err: any) {
      toast.error(err?.message ?? "Ayar güncellenemedi");
    }
  }

  async function handleCloseOneForex(id: string, symbol: string) {
    try {
      await closeOneForex.mutateAsync(id);
      toast.success(`${symbol} anlık fiyattan kapatıldı (simülasyon)`);
    } catch (err: any) {
      toast.error(err?.message ?? "Pozisyon kapatılamadı");
    }
  }

  async function handleCloseAllForex() {
    try {
      const res = await closeAllForex.mutateAsync();
      toast.success(`${res.closed} işlem kapatıldı (simülasyon)`);
    } catch (err: any) {
      toast.error(err?.message ?? "İşlemler kapatılamadı");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 text-[#F5F1EA]">Money Maker</h1>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span
              className="rounded-full px-2.5 py-1 text-badge uppercase tracking-wider"
              style={{ backgroundColor: "#3B5BFF22", color: "#3B5BFF" }}
            >
              Kullanım durumu: Yalnızca yönetici
            </span>
            <PremiumGlowButton
              type="button"
              size="sm"
              onClick={() => setShowAbout(true)}
              className="gap-1.5 text-badge"
            >
              <Sparkles size={13} />
              Modül Hakkında
            </PremiumGlowButton>
          </div>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>
      {showAbout && <AboutMoneyMakerPanel onClose={() => setShowAbout(false)} />}

      <div>
        <p className="mb-2 text-badge uppercase tracking-wider text-[#A8A6A0]">Piyasa</p>
        <div className="grid grid-cols-2 gap-1.5 rounded-2xl border border-border bg-card-inner p-1.5 sm:max-w-md">
          <button
            type="button"
            onClick={() => setMarket("CRYPTO")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-body-sm transition-all duration-200 ${
              market === "CRYPTO"
                ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(59,91,255,0.4),0_4px_16px_-4px_rgba(59,91,255,0.6)]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <Coins size={16} />
            Kripto
          </button>
          <button
            type="button"
            onClick={() => setMarket("FOREX")}
            className={`flex items-center justify-center gap-2 rounded-xl py-3 text-body-sm transition-all duration-200 ${
              market === "FOREX"
                ? "bg-primary text-primary-foreground shadow-[0_0_0_1px_rgba(59,91,255,0.4),0_4px_16px_-4px_rgba(59,91,255,0.6)]"
                : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
            }`}
          >
            <Globe2 size={16} />
            Forex
          </button>
        </div>
      </div>

      {market === "CRYPTO" ? (
        <MarketRefChartCard
          label="XBT/USDT"
          icon={<CoinIcon symbol="BTCUSDT" />}
          price={marketContext?.btcPrice}
          changePercent={marketContext?.btcChangePercent}
          candles={marketContext?.btcCandles ?? []}
          correlations={marketContext?.correlations}
          positions={positions}
        />
      ) : (
        <MarketRefChartCard
          label="DXY"
          icon={<Globe2 size={18} className="text-[#A8A6A0]" />}
          price={forexMarketContext?.dxyPrice}
          changePercent={forexMarketContext?.dxyChangePercent}
          candles={forexMarketContext?.dxyCandles ?? []}
          correlations={forexMarketContext?.correlations}
          positions={forexPositions}
        />
      )}

      {isLoading || !config ? (
        <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : market === "CRYPTO" ? (
        <div className="relative rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="money-rain-wrap" aria-hidden="true">
            <span className="money-rain-dollar">$</span>
            <span className="money-rain-dollar">$</span>
            <span className="money-rain-dollar">$</span>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Power size={16} color={config.enabled ? "#22C55E" : "#A8A6A0"} />
              <span className="text-body-sm font-semibold text-[#F5F1EA]">Durum</span>
              <span
                className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider"
                style={{
                  backgroundColor: config.enabled ? "#22C55E22" : "#A8A6A022",
                  color: config.enabled ? "#22C55E" : "#A8A6A0",
                }}
              >
                {config.enabled ? "AÇIK" : "KAPALI"}
              </span>
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-badge font-semibold uppercase tracking-wider"
                style={{ backgroundColor: "#F0B90B14", border: "1px solid #F0B90B55", color: "#F0B90B" }}
              >
                <Coins size={12} style={{ color: "#F0B90B" }} />
                Binance Futures
              </span>
              {!config.apiKeyConfigured && (
                <span className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider" style={{ backgroundColor: "#EF444422", color: "#EF4444" }}>
                  API key tanımlı değil
                </span>
              )}
            </div>
            <Button
              onClick={handleToggle}
              disabled={!config.apiKeyConfigured || updateConfig.isPending}
              className="h-9"
              style={{ backgroundColor: config.enabled ? "#EF4444" : undefined }}
            >
              {config.enabled ? "Kapat" : "Aç"}
            </Button>
          </div>

          {!config.apiKeyConfigured && (
            <p className="text-body-xs text-[#A8A6A0]">
              Açmak için backend `.env` içinde BINANCE_API_KEY / BINANCE_API_SECRET tanımlı olmalı (sadece futures izinli, para çekme izni kapalı).
              {config.testnetActive ? " Şu an testnet'e yönlendirilecek şekilde ayarlı." : ""}
            </p>
          )}

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <label className="flex flex-col gap-1 text-body-xs text-[#A8A6A0]">
              Risk (USDT)
              <input
                type="number"
                step="1"
                min="1"
                value={riskUsdt === "" ? config.riskPerTradeUsdt : riskUsdt}
                onChange={(e) => setRiskUsdt(e.target.value)}
                className="w-24 rounded-lg border border-border bg-card-inner px-2 py-1.5 text-body-sm text-[#F5F1EA]"
              />
            </label>
            <label className="flex flex-col gap-1 text-body-xs text-[#A8A6A0]">
              Kaldıraç
              <input
                type="number"
                step="1"
                min="1"
                value={leverage === "" ? config.leverage : leverage}
                onChange={(e) => setLeverage(e.target.value)}
                className="w-24 rounded-lg border border-border bg-card-inner px-2 py-1.5 text-body-sm text-[#F5F1EA]"
              />
            </label>
            <Button onClick={handleSaveRisk} disabled={updateConfig.isPending} className="h-9">
              Başla
            </Button>
            <span className="text-body-xs text-[#605D57]">
              Giriş-stop arası kırılırsa (TP1'e hiç ulaşmadan) kaybedilecek sabit dolar tutarı. Kaldıraç, Binance'in o sembol için izin verdiği tavanı aşarsa otomatik kırpılır (ör. 100x istenip sembol 50x'e izinliyse 50x uygulanır).
            </span>
          </div>

          {stats && stats.totalClosed > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              <p className="text-badge uppercase tracking-wider text-[#A8A6A0]">Futures İstatistiği</p>
              <div className="flex items-center gap-3 text-body-xs text-[#A8A6A0] flex-wrap">
                <span>Kapanan: {stats.totalClosed}</span>
                <span className="text-[#22C55E]">Kazandı: {stats.wins}</span>
                <span className="text-[#EF4444]">Stop (tam kayıp): {stats.losses}</span>
                <span className="font-semibold text-[#F5F1EA]">
                  Başarı: {stats.winRate !== null ? `%${stats.winRate}` : "Yetersiz veri"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-body-xs text-[#A8A6A0] flex-wrap">
                <span>İşlem kârı/zararı: ${stats.totalRealizedPnl.toFixed(2)}</span>
                <span>Komisyon: ${stats.totalCommission.toFixed(2)}</span>
                <span>Funding: ${stats.totalFunding.toFixed(2)}</span>
                <span className="font-semibold" style={{ color: stats.totalNetPnl >= 0 ? "#22C55E" : "#EF4444" }}>
                  Net kâr: {stats.totalNetPnl >= 0 ? "+" : ""}${stats.totalNetPnl.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2 flex-wrap">
              <Power size={16} color={config.forexEnabled ? "#22C55E" : "#A8A6A0"} />
              <span className="text-body-sm font-semibold text-[#F5F1EA]">Durum</span>
              <span
                className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider"
                style={{
                  backgroundColor: config.forexEnabled ? "#22C55E22" : "#A8A6A022",
                  color: config.forexEnabled ? "#22C55E" : "#A8A6A0",
                }}
              >
                {config.forexEnabled ? "AÇIK" : "KAPALI"}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider"
                style={{ backgroundColor: "#F5A62322", color: "#F5A623" }}
              >
                SİMÜLASYON — BROKER BAĞLI DEĞİL
              </span>
            </div>
            <Button onClick={handleForexToggle} disabled={updateConfig.isPending} className="h-9" style={{ backgroundColor: config.forexEnabled ? "#EF4444" : undefined }}>
              {config.forexEnabled ? "Kapat" : "Aç"}
            </Button>
          </div>

          <p className="text-body-xs text-[#A8A6A0]">
            Forex için henüz gerçek bir broker bağlantısı yok — Orca ACS'in ürettiği forex sinyallerini gerçek zamanlı fiyatla izleyip{" "}
            <b className="text-[#F5F1EA]">simüle edilmiş</b> bir pozisyon (giriş/TP/stop, anlık kâr/zarar) olarak gösterir, borsada/broker'da hiçbir emir açılmaz. Broker bağlanınca bu anahtar gerçek emirlere geçecek.
          </p>

          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <span className="text-body-xs text-[#A8A6A0]">
              İşlem başına: <b className="text-[#F5F1EA]">{config.forexMarginUsdt} USD marj × 1:{config.forexLeverage} kaldıraç</b> <span className="text-[#605D57]">(şu an sabit, panelden değiştirilemez)</span>
            </span>
          </div>

          {forexStats && forexStats.totalClosed > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              <p className="text-badge uppercase tracking-wider text-[#A8A6A0]">Simülasyon işlem istatistiği (gerçek fiyat, gerçek emir değil)</p>
              <div className="flex items-center gap-3 text-body-xs text-[#A8A6A0] flex-wrap">
                <span>Kapanan: {forexStats.totalClosed}</span>
                <span className="text-[#22C55E]">Kazandı: {forexStats.wins}</span>
                <span className="text-[#EF4444]">Stop (tam kayıp): {forexStats.losses}</span>
                <span className="font-semibold text-[#F5F1EA]">
                  Başarı: {forexStats.winRate !== null ? `%${forexStats.winRate}` : "Yetersiz veri"}
                </span>
              </div>
              <div className="flex items-center gap-3 text-body-xs text-[#A8A6A0] flex-wrap">
                <span>İşlem kârı/zararı: ${forexStats.totalRealizedPnl.toFixed(2)}</span>
                <span>Komisyon (tahmini spread): ${forexStats.totalCommission.toFixed(2)}</span>
                <span className="font-semibold" style={{ color: forexStats.totalNetPnl >= 0 ? "#22C55E" : "#EF4444" }}>
                  Net kâr: {forexStats.totalNetPnl >= 0 ? "+" : ""}${forexStats.totalNetPnl.toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {market === "CRYPTO" && positions && positions.length > 0 && (() => {
        const openOnly = positions.filter((p) => p.status !== "CLOSED");
        const closedOnly = positions.filter((p) => p.status === "CLOSED");
        return (
          <>
            {openOnly.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <p className="text-body-sm font-semibold text-[#F5F1EA]">
                    Açık Pozisyonlar ({openOnly.length})
                  </p>
                  <Button onClick={handleCloseAll} disabled={closeAll.isPending} className="h-8 gap-1.5 text-badge" style={{ backgroundColor: "#EF4444" }}>
                    <XCircle size={13} />
                    Tüm İşlemleri Kapat
                  </Button>
                </div>
                <div className="-mx-8 grid grid-cols-1 gap-3 px-3 sm:mx-0 sm:px-0 md:grid-cols-2">
                  {openOnly.map((p) => (
                    <PositionCard
                      key={p.id}
                      position={p}
                      onClose={() => handleCloseOne(p.id, p.symbol)}
                      isClosing={closeOne.isPending}
                      riskPerTradeUsdt={config?.riskPerTradeUsdt ?? null}
                      market="CRYPTO"
                    />
                  ))}
                </div>
              </div>
            )}

            {closedOnly.length > 0 && (
              <div className="space-y-3">
                <p className="text-body-sm font-semibold text-[#F5F1EA]">
                  Kapanan Pozisyonlar ({closedOnly.length})
                </p>
                <div className="-mx-8 grid grid-cols-1 gap-3 px-3 sm:mx-0 sm:px-0 md:grid-cols-2">
                  {closedOnly.map((p) => (
                    <PositionCard
                      key={p.id}
                      position={p}
                      onClose={() => handleCloseOne(p.id, p.symbol)}
                      isClosing={closeOne.isPending}
                      riskPerTradeUsdt={config?.riskPerTradeUsdt ?? null}
                      market="CRYPTO"
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {market === "FOREX" && forexPositions && forexPositions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-body-sm font-semibold text-[#F5F1EA]">
              Açık Pozisyonlar ({forexPositions.length})
            </p>
            <Button onClick={handleCloseAllForex} disabled={closeAllForex.isPending} className="h-8 gap-1.5 text-badge" style={{ backgroundColor: "#EF4444" }}>
              <XCircle size={13} />
              Tüm İşlemleri Kapat
            </Button>
          </div>
          <div className="-mx-8 grid grid-cols-1 gap-3 px-3 sm:mx-0 sm:px-0 md:grid-cols-2">
            {forexPositions.map((p) => (
              <PositionCard
                key={p.id}
                position={p}
                onClose={() => handleCloseOneForex(p.id, p.symbol)}
                isClosing={closeOneForex.isPending}
                riskPerTradeUsdt={null}
                market="FOREX"
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
