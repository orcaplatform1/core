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
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PremiumGlowButton } from "@/components/ui/premium-glow-button";
import { useAuth } from "@/context/auth-context";
import {
  useAutoTradeConfig,
  useUpdateAutoTradeConfig,
  useAutoTrades,
  useAutoTradeStats,
  useAutoTradePositions,
  useCloseAutoTrade,
  useCloseAllAutoTrades,
  type LiveAutoTradePosition,
} from "@/lib/hooks/use-admin-scanner";

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
                <b className="text-[#F5F1EA]">Testnet varsayılan:</b> <code>BINANCE_TESTNET</code> env değişkeni
                elle <code>false</code> yapılmadığı sürece tüm emirler Binance'in test ortamına gider, gerçek
                para riski olmaz.
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

function PositionCard({ position, onClose, isClosing }: { position: LiveAutoTradePosition; onClose: () => void; isClosing: boolean }) {
  const fundingCountdown = useFundingCountdown();
  const unrealized = position.unrealizedProfit ?? 0;
  // Su ana kadar bankaya yatmis (TP1/TP2 kismi kapanislari) kar + acik kalan
  // dilimin anlik kari + o ana kadar odenen komisyon/funding - toplam "su an
  // elde cepte ne var" gorunumu.
  const liveNet = unrealized + position.realizedSoFar + position.commissionSoFar + position.fundingSoFar;
  return (
    <div className="rounded-xl border border-border bg-card-inner p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-body-sm font-semibold text-[#F5F1EA]">{position.symbol}</span>
          <span
            className="rounded-full px-2 py-0.5 text-badge uppercase"
            style={{ backgroundColor: position.direction === "LONG" ? "#22C55E22" : "#EF444422", color: position.direction === "LONG" ? "#22C55E" : "#EF4444" }}
          >
            {position.direction}
          </span>
          <span
            className="rounded-full px-2 py-0.5 text-badge uppercase"
            style={{ backgroundColor: position.status === "BREAKEVEN_SET" ? "#22C55E22" : "#3B5BFF22", color: position.status === "BREAKEVEN_SET" ? "#22C55E" : "#3B5BFF" }}
          >
            {position.status === "BREAKEVEN_SET" ? "TP1 ALINDI — BAŞABAŞ" : "AÇIK"}
          </span>
        </div>
        <Button
          onClick={onClose}
          disabled={isClosing}
          className="h-8 gap-1.5 text-badge"
          style={{ backgroundColor: "#EF4444" }}
        >
          <XCircle size={13} />
          Kapat
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-body-xs text-[#A8A6A0] sm:grid-cols-4">
        <span>Giriş: <b className="text-[#F5F1EA]">{position.entryPrice ?? "—"}</b></span>
        <span>Mark: <b className="text-[#F5F1EA]">{position.markPrice ?? "—"}</b></span>
        <span>Miktar: <b className="text-[#F5F1EA]">{position.qty ?? "—"}</b></span>
        <span>Notional: <b className="text-[#F5F1EA]">${position.notional != null ? fmtUsd(position.notional) : "—"}</b></span>
        <span>Kaldıraç: <b className="text-[#F5F1EA]">{position.leverage ?? "—"}x</b></span>
        <span>Likidasyon: <b className="text-[#F5F1EA]">{position.liquidationPrice ?? "—"}</b></span>
        <span>Sonraki funding: <b className="text-[#F5A623]">{fundingCountdown}</b></span>
      </div>

      <div className="flex items-center gap-3 text-body-xs flex-wrap border-t border-border pt-2">
        <span className="text-[#A8A6A0]">
          Açık kısım (anlık): <b style={{ color: unrealized >= 0 ? "#22C55E" : "#EF4444" }}>{unrealized >= 0 ? "+" : ""}${fmtUsd(unrealized)}</b>
        </span>
        <span className="text-[#A8A6A0]">
          Bankaya yatan (TP1/TP2): <b style={{ color: position.realizedSoFar >= 0 ? "#22C55E" : "#EF4444" }}>{position.realizedSoFar >= 0 ? "+" : ""}${fmtUsd(position.realizedSoFar)}</b>
        </span>
        <span className="text-[#605D57]">Komisyon: -${fmtUsd(Math.abs(position.commissionSoFar))}</span>
        <span className="text-[#605D57]">Funding: {position.fundingSoFar >= 0 ? "-" : "+"}${fmtUsd(Math.abs(position.fundingSoFar))}</span>
        <span className="font-semibold" style={{ color: liveNet >= 0 ? "#22C55E" : "#EF4444" }}>
          Toplam (anlık net): {liveNet >= 0 ? "+" : ""}${fmtUsd(liveNet)}
        </span>
      </div>
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
  const { data: config, isLoading } = useAutoTradeConfig();
  const { data: trades } = useAutoTrades();
  const { data: stats } = useAutoTradeStats();
  const { data: positions } = useAutoTradePositions();
  const updateConfig = useUpdateAutoTradeConfig();
  const closeOne = useCloseAutoTrade();
  const closeAll = useCloseAllAutoTrades();
  const [riskUsdt, setRiskUsdt] = useState<string>("");
  const [leverage, setLeverage] = useState<string>("");

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

      {positions && positions.length > 0 && (
        <div className="rounded-2xl border border-[#EF444433] bg-[#EF44440D] p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-body-sm font-semibold text-[#F5F1EA]">
              Açık Pozisyonlar ({positions.length})
            </p>
            <Button onClick={handleCloseAll} disabled={closeAll.isPending} className="h-9 gap-1.5" style={{ backgroundColor: "#EF4444" }}>
              <XCircle size={15} />
              Tüm İşlemleri Kapat (piyasa fiyatından)
            </Button>
          </div>
          <div className="space-y-2">
            {positions.map((p) => (
              <PositionCard
                key={p.id}
                position={p}
                onClose={() => handleCloseOne(p.id, p.symbol)}
                isClosing={closeOne.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {isLoading || !config ? (
        <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-4 space-y-3">
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
                className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider"
                style={{ backgroundColor: config.testnetActive ? "#F5A62322" : "#EF444422", color: config.testnetActive ? "#F5A623" : "#EF4444" }}
              >
                {config.testnetActive ? "TESTNET" : "GERÇEK PARA"}
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
              İşlem başına risk (USDT)
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
              Kaldıraç (istenen)
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
              Kaydet
            </Button>
            <span className="text-body-xs text-[#605D57]">
              Giriş-stop arası kırılırsa (TP1'e hiç ulaşmadan) kaybedilecek sabit dolar tutarı. Kaldıraç, Binance'in o sembol için izin verdiği tavanı aşarsa otomatik kırpılır (ör. 100x istenip sembol 50x'e izinliyse 50x uygulanır).
            </span>
          </div>

          {stats && stats.totalClosed > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              <p className="text-badge uppercase tracking-wider text-[#A8A6A0]">Gerçek işlem istatistiği (Binance kayıtlarından)</p>
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

          {trades && trades.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-badge uppercase tracking-wider text-[#A8A6A0]">Son gerçek işlemler</p>
              <div className="space-y-1">
                {trades.slice(0, 20).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-body-xs text-[#D6D3CB] flex-wrap">
                    <span className="font-semibold text-[#F5F1EA]">{t.symbol}</span>
                    <span>{t.direction}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-badge uppercase"
                      style={{
                        backgroundColor:
                          t.status === "CLOSED" || t.status === "FAILED" || t.status === "EXPIRED" ? "#A8A6A022" : "#3B5BFF22",
                        color: t.status === "FAILED" ? "#EF4444" : t.status === "CLOSED" ? "#22C55E" : "#3B5BFF",
                      }}
                    >
                      {t.status}
                    </span>
                    {t.entryPrice && <span>@{t.entryPrice}</span>}
                    {t.qty && <span>qty={t.qty}</span>}
                    {t.netPnl != null && (
                      <span className="font-semibold" style={{ color: t.netPnl >= 0 ? "#22C55E" : "#EF4444" }}>
                        net {t.netPnl >= 0 ? "+" : ""}${t.netPnl.toFixed(2)}
                      </span>
                    )}
                    {t.errorMessage && <span className="text-[#EF4444]">{t.errorMessage}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
