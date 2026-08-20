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
  Newspaper,
  BadgeCheck,
  BadgeAlert,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { PremiumGlowButton } from "@/components/ui/premium-glow-button";
import { ExternalLink } from "@/components/ui/external-link";
import { useAuth } from "@/context/auth-context";
import {
  useTerminalNewsTradeConfig,
  useUpdateTerminalNewsTradeConfig,
  useTerminalNewsTrades,
  useTerminalNewsTradeStats,
  useTerminalNewsTradePositions,
  useTerminalNewsEvents,
  useSendTestNewsEvent,
  useCloseTerminalNewsTrade,
  useCloseAllTerminalNewsTrades,
  type LiveTerminalNewsTradePosition,
  type NewsCategory,
} from "@/lib/hooks/use-terminal-news-trade";

const CATEGORY_LABELS: Record<NewsCategory, string> = {
  EXCHANGE_HACK_OR_INSOLVENCY: "Borsa Hack/İflası",
  OFFICIAL_MA_ACQUISITION: "Resmi M&A/Satın Alma",
  MACRO_SURPRISE: "Makro Sürpriz (Fed/CPI)",
  VERIFIED_INFLUENCER: "Doğrulanmış Etkili Kişi",
  PARTNERSHIP_INTEGRATION: "Ortaklık/Entegrasyon",
  EXCHANGE_LISTING: "Borsa Listeleme",
  MAINNET_UPGRADE: "Mainnet/Upgrade",
  REGULATORY: "Regülasyon",
  TOKEN_UNLOCK: "Token Unlock",
  ETF_DECISION: "ETF Kararı",
  UNVERIFIED_OTHER: "Diğer/Doğrulanmamış",
};

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
        <span className="flex size-6 items-center justify-center rounded-md bg-[#3B5BFF1A] text-[#3B5BFF]">{icon}</span>
        <h3 className="text-card-title-sm text-[#F5F1EA]">{title}</h3>
      </div>
      <div className="pl-8">{children}</div>
    </div>
  );
}

function AboutTerminalNewsTradePanel({ onClose }: { onClose: () => void }) {
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
            <Newspaper size={20} className="text-[#3B5BFF]" />
            <h2 className="text-h2 text-[#F5F1EA]">Terminal News Trade — Haber Tabanlı Otomatik İşlem</h2>
          </div>
          <p className="text-body-sm text-[#A8A6A0]">
            X'te (Twitter) yayınlanan kripto haberlerini <b className="text-[#F5F1EA]">Orca AI</b> (Claude) ile
            saniyeler içinde sınıflandırıp — sadece tarihsel olarak <b className="text-[#F5F1EA]">sürdürülebilir
            hareket</b> gösteren birkaç kategoride — doğrudan Binance Futures'ta gerçek bir işleme çeviren, Money
            Maker'dan (Orca ACS sinyalleri) <b className="text-[#F5F1EA]">tamamen bağımsız</b> ikinci bir yürütme
            katmanı. İstatistiği/kâr-zararı Money Maker'la karışmaz, kendi ayrı kaydı vardır.
          </p>
        </div>

        <div className="space-y-5">
          <Section icon={<Zap size={16} />} title="Ne İşe Yarar">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                İzlenen resmi/doğrulanmış X hesaplarından (borsalar, resmi kurumlar, büyük haber ajansları,
                doğrulanmış etkili kişiler) yeni bir paylaşım geldiği anda Orca AI devreye girer: haberin
                kategorisini, yönünü (LONG/SHORT), ilgili sembolü ve güven skorunu çıkarır.
              </p>
              <p>
                Amaç, haberi elle okuyup Binance'e girip pozisyon açma sürecindeki insan gecikmesini (genelde
                dakikalar) saniyelere indirmek — ama SADECE aşağıdaki kategori filtresinden geçen haberlerde.
              </p>
            </div>
          </Section>

          <Section icon={<Filter size={16} />} title="Kategori Filtresi (neden her haberde işlem açılmıyor)">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                2026-08-20 araştırması: kripto haberlerinin çoğu (borsa listeleme, ortaklık/entegrasyon duyurusu,
                mainnet/upgrade lansmanı, token unlock, eski regülasyon haberinin tekrarı) istatistiksel olarak{" "}
                <b className="text-[#EF4444]">spike-and-fade / whipsaw</b> — ilk saniyelerde teper, sonra geri
                döner. Araştırma sadece 4 kategoriyi (hack/iflas, M&A, makro sürpriz, doğrulanmış kişi)
                "güvenli" bulmuştu; kullanıcı kararıyla (2026-08-20) <b className="text-[#F5F1EA]">listeleme,
                ortaklık, mainnet ve ETF kategorileri de bilerek eklendi</b> — bildirim anlık geldiği için
                gerekirse elle kapatma seçeneği var, whipsaw riski bu şekilde göze alınıyor.
              </p>
              <p>
                Şu an açık olan kategoriler: <b className="text-[#22C55E]">Borsa Hack/İflası</b> (büyük ölçekli/
                sistemik), <b className="text-[#22C55E]">Resmi M&A/Satın Alma</b>,{" "}
                <b className="text-[#22C55E]">Makro Sürpriz</b> (Fed/CPI beklenti-gerçekleşen farkı),{" "}
                <b className="text-[#22C55E]">Doğrulanmış Etkili Kişi</b>,{" "}
                <b className="text-[#22C55E]">Borsa Listeleme</b>, <b className="text-[#22C55E]">Ortaklık/
                Entegrasyon</b>, <b className="text-[#22C55E]">Mainnet/Upgrade</b>,{" "}
                <b className="text-[#22C55E]">ETF Kararı</b>. Hâlâ dışarıda olanlar:{" "}
                <b className="text-[#EF4444]">Regülasyon</b> (eski haberin tekrar servisi riski yüksek) ve{" "}
                <b className="text-[#EF4444]">Token Unlock</b> (takvim önceden belli, ani sürpriz yok). Ayrıca
                kaynağın <b className="text-[#F5F1EA]">doğrulanmış/resmi</b> olması VE güven skorunun eşiği
                (%70) aşması da şart.
              </p>
              <p>
                Elenen haberler kaybolmaz — panelin altındaki "Haber Akışı" listesinde, neden elendiği (kategori
                veya doğrulama notuyla) görülebilir. Bu, kategori kurallarının ileride ince ayarlanması için.
              </p>
            </div>
          </Section>

          <Section icon={<Target size={16} />} title="Emir Akışı">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                <b className="text-[#F5F1EA]">1) Giriş:</b> Money Maker'daki gibi bekleyen LIMIT emir DEĞİL —
                haber anlık olduğu için doğrudan <b className="text-[#8FB8FF]">MARKET</b> emriyle piyasa
                fiyatından anında girilir.
              </p>
              <p>
                <b className="text-[#F5F1EA]">2) Stop:</b> Haberin yayın zamanından önceki son mumların swing
                high/low'una (+ küçük bir oynaklık tamponu) göre hesaplanan{" "}
                <b className="text-[#8FB8FF]">"haber öncesi pivot"</b> seviyesine STOP_MARKET (reduceOnly)
                yerleştirilir.
              </p>
              <p>
                <b className="text-[#F5F1EA]">3) Kademeli TP yok:</b> Money Maker'daki TP1/TP2/TP3 modeli burada
                kullanılmıyor — henüz test edilmiş bir hedef şeması yok. Pozisyon sadece pivot stop ile korunur,
                kapanış stop'a çarpana kadar ya da panelden elle "Kapat" ile olur.
              </p>
            </div>
          </Section>

          <Section icon={<Sparkles size={16} />} title="Orca AI Neyi Yazıyor">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                Her açık pozisyon kartının altında <b className="text-[#F5F1EA]">Orca AI</b> etiketiyle: haberin
                doğrulanıp doğrulanmadığı (kaynak resmi mi, haber gerçekten yeni mi) ve gerekçesi, 1-2 cümlelik
                detaylı özet, ve <b className="text-[#F5F1EA]">haberden ne kadar süre sonra işleme girildiği</b>{" "}
                — bu gecikme rakamını da yine Orca AI kendi cümlesiyle açıklıyor (ayrı, ucuz bir ikinci
                model çağrısı).
              </p>
            </div>
          </Section>

          <Section icon={<Coins size={16} />} title="Pozisyon Büyüklüğü ve Kaldıraç">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                Money Maker ile aynı mantık: <b className="text-[#F5F1EA]">Miktar</b> = İşlem başına risk (USDT) ÷
                (giriş-stop mesafesi) — sabit dolar tutarı, bakiye yüzdesi değil. Kaldıraç, Binance'in sembol
                başına izin verdiği tavana göre otomatik kırpılır.
              </p>
            </div>
          </Section>

          <Section icon={<Shield size={16} />} title="Güvenlik Mekanizmaları">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                <b className="text-[#F5F1EA]">Üç bağımsız anahtar:</b> (1) backend `.env`'de gerçek bir Binance
                API key/secret, (2) `.env`'de X API erişimi (`X_API_BEARER_TOKEN`) — bu olmadan haber akışı hiç
                başlamaz, (3) bu paneldeki "Aç" anahtarı ayrıca AÇIK olmalı. Üçünden biri eksikse hiçbir gerçek
                emir gönderilmez.
              </p>
              <p>
                <b className="text-[#F5F1EA]">Gölge mod (varsayılan AÇIK):</b> "Aç" anahtarı açık olsa bile gölge
                mod açıkken hiçbir gerçek/testnet emir borsaya gitmez — sadece "açılsaydı ne olurdu" kaydı
                (giriş fiyatı, hesaplanan pivot stop, gecikme) tutulur. Amaç: isabet oranını/whipsaw oranını
                gerçek para riske atmadan ölçmek. Gölge mod kapatılmadan hiçbir gerçek emir açılmaz.
              </p>
              <p>
                <b className="text-[#F5F1EA]">Testnet varsayılan:</b> `BINANCE_TESTNET` elle `false` yapılmadığı
                sürece emirler test ortamına gider.
              </p>
              <p>
                <b className="text-[#F5F1EA]">Bildirimler:</b> gerçek pozisyon açıldığında, kapandığında ve
                herhangi bir hatada tüm SUPER_ADMIN kullanıcılarına anlık bildirim gönderilir.
              </p>
            </div>
          </Section>

          <Section icon={<BarChart3 size={16} />} title="İstatistik — Money Maker'dan Bağımsız">
            <div className="space-y-2 text-body-xs text-[#D6D3CB]">
              <p>
                Bu sayfadaki kazandı/kayıp/win-rate ve $ rakamları kendi ayrı kayıtından gelir — Orca ACS/Money
                Maker istatistiğiyle hiç karışmaz, ikisi kasıtlı olarak izole tutulur.
              </p>
            </div>
          </Section>

          <Section icon={<Clock size={16} />} title="Diğer">
            <ul className="list-inside list-disc space-y-1 text-body-xs text-[#D6D3CB]">
              <li>Sadece Binance Futures'ta işlem gören semboller için çalışır.</li>
              <li>Panel 15-30 saniyede bir kendiliğinden güncellenir; açık pozisyonlar 5 saniyede bir.</li>
              <li>X API ve Anthropic API anahtarları tanımlı değilse panelde durum rozetleriyle gösterilir.</li>
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

// Money Maker/scanner sayfalarindaki CoinIcon/Binance-link deseniyle birebir
// ayni - kullanici istegi 2026-08-20: "logo coin adı yanına binance futures
// linki olsun".
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

function VerificationBadge({ verified }: { verified: boolean }) {
  return verified ? (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-badge uppercase" style={{ backgroundColor: "#22C55E22", color: "#22C55E" }}>
      <BadgeCheck size={11} /> Doğrulandı
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-badge uppercase" style={{ backgroundColor: "#EF444422", color: "#EF4444" }}>
      <BadgeAlert size={11} /> Doğrulanmadı
    </span>
  );
}

function PositionCard({
  position,
  onClose,
  isClosing,
}: {
  position: LiveTerminalNewsTradePosition;
  onClose: () => void;
  isClosing: boolean;
}) {
  const fundingCountdown = useFundingCountdown();
  const unrealized = position.unrealizedProfit ?? 0;
  const liveNet = unrealized + position.realizedSoFar + position.commissionSoFar + position.fundingSoFar;
  const latencySec = position.entryLatencyMs != null ? (position.entryLatencyMs / 1000).toFixed(1) : null;
  return (
    <div className="rounded-xl border border-border bg-card-inner p-3 space-y-2">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2 flex-wrap">
          <CoinIcon symbol={position.symbol} />
          <span className="text-body-sm font-semibold text-[#F5F1EA]">{position.symbol}</span>
          <BinanceFuturesLink symbol={position.symbol} />
          <span
            className="rounded-full px-2 py-0.5 text-badge uppercase"
            style={{ backgroundColor: position.direction === "LONG" ? "#22C55E22" : "#EF444422", color: position.direction === "LONG" ? "#22C55E" : "#EF4444" }}
          >
            {position.direction}
          </span>
          {position.newsCategory && (
            <span className="rounded-full px-2 py-0.5 text-badge uppercase" style={{ backgroundColor: "#3B5BFF22", color: "#3B5BFF" }}>
              {CATEGORY_LABELS[position.newsCategory] ?? position.newsCategory}
            </span>
          )}
        </div>
        <Button onClick={onClose} disabled={isClosing} className="h-8 gap-1.5 text-badge" style={{ backgroundColor: "#EF4444" }}>
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
        <span>Stop (haber öncesi pivot): <b className="text-[#F5A623]">{position.pivotStopPrice ?? "—"}</b></span>
        <span>Sonraki funding: <b className="text-[#F5A623]">{fundingCountdown}</b></span>
      </div>

      <div className="flex items-center gap-3 text-body-xs flex-wrap border-t border-border pt-2">
        <span className="text-[#A8A6A0]">
          Açık kısım (anlık): <b style={{ color: unrealized >= 0 ? "#22C55E" : "#EF4444" }}>{unrealized >= 0 ? "+" : ""}${fmtUsd(unrealized)}</b>
        </span>
        <span className="text-[#605D57]">Komisyon: -${fmtUsd(Math.abs(position.commissionSoFar))}</span>
        <span className="text-[#605D57]">Funding: {position.fundingSoFar >= 0 ? "-" : "+"}${fmtUsd(Math.abs(position.fundingSoFar))}</span>
        <span className="font-semibold" style={{ color: liveNet >= 0 ? "#22C55E" : "#EF4444" }}>
          Toplam (anlık net): {liveNet >= 0 ? "+" : ""}${fmtUsd(liveNet)}
        </span>
      </div>

      <div className="space-y-1.5 border-t border-border pt-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="flex items-center gap-1 text-badge uppercase tracking-wider text-[#8A5CFF]">
            <Sparkles size={11} /> Orca AI
          </span>
          <VerificationBadge verified={position.newsVerified} />
          {latencySec && (
            <span className="rounded-full px-2 py-0.5 text-badge uppercase" style={{ backgroundColor: "#F5A62322", color: "#F5A623" }}>
              Giriş gecikmesi: {latencySec}sn
            </span>
          )}
        </div>
        {position.newsSummary && <p className="text-body-xs text-[#D6D3CB]">{position.newsSummary}</p>}
        {position.newsVerificationNotes && (
          <p className="text-body-xs text-[#A8A6A0]">Doğrulama notu: {position.newsVerificationNotes}</p>
        )}
        {position.entryLatencyNote && <p className="text-body-xs text-[#A8A6A0]">{position.entryLatencyNote}</p>}
        <a href={position.newsSourceUrl} target="_blank" rel="noreferrer" className="text-body-xs text-primary hover:underline">
          Kaynak haberi gör →
        </a>
      </div>
    </div>
  );
}

function TestEventBox() {
  const sendTest = useSendTestNewsEvent();
  const [text, setText] = useState("");
  const [account, setAccount] = useState("");

  async function handleSend() {
    if (!text.trim()) return;
    try {
      await sendTest.mutateAsync({ rawText: text, sourceAccount: account.trim() || undefined });
      toast.success("Test haberi gönderildi — Orca AI sınıflandırıyor, birkaç saniye içinde aşağıdaki Haber Akışı'nda görünür");
      setText("");
    } catch (err: any) {
      toast.error(err?.message ?? "Gönderilemedi");
    }
  }

  return (
    <div className="rounded-2xl border border-[#8A5CFF33] bg-[#8A5CFF0D] p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Sparkles size={16} className="text-[#8A5CFF]" />
        <p className="text-body-sm font-semibold text-[#F5F1EA]">Test Haberi Gönder</p>
      </div>
      <p className="text-body-xs text-[#A8A6A0]">
        X API bağlanmadan (X_API_BEARER_TOKEN boşken) tüm hattı — Orca AI sınıflandırma → gölge işlem — test etmek
        için. X akışının ileteceği olayın aynısını elle tetikler. ANTHROPIC_API_KEY `.env`&apos;de dolu olmalı, aksi
        halde sınıflandırma başarısız olur.
      </p>
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder='Örn: Binance confirms $500M exploit, has halted withdrawals while investigating'
        rows={3}
        className="w-full rounded-lg border border-border bg-card-inner px-3 py-2 text-body-sm text-[#F5F1EA]"
      />
      <div className="flex items-center gap-2 flex-wrap">
        <input
          value={account}
          onChange={(e) => setAccount(e.target.value)}
          placeholder="Kaynak hesap (opsiyonel, ör. binance)"
          className="w-56 rounded-lg border border-border bg-card-inner px-2 py-1.5 text-body-sm text-[#F5F1EA]"
        />
        <Button onClick={handleSend} disabled={sendTest.isPending || !text.trim()} className="h-9">
          Gönder
        </Button>
      </div>
    </div>
  );
}

// Terminal News Trade — Money Maker'dan (Orca ACS execution) TAMAMEN ayrı bir
// sayfa/modül; sinyal kaynağı X (Twitter) haber akışı, istatistiği de ayrı
// (kullanıcı isteği 2026-08-20: "istatistiği ayrı tutmalıyım").
export default function TerminalNewsTradePage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [showAbout, setShowAbout] = useState(false);
  const { data: config, isLoading } = useTerminalNewsTradeConfig();
  const { data: trades } = useTerminalNewsTrades();
  const { data: stats } = useTerminalNewsTradeStats();
  const { data: positions } = useTerminalNewsTradePositions();
  const { data: events } = useTerminalNewsEvents();
  const updateConfig = useUpdateTerminalNewsTradeConfig();
  const closeOne = useCloseTerminalNewsTrade();
  const closeAll = useCloseAllTerminalNewsTrades();
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
  const leverageValue = leverage === "" ? config?.leverage ?? 5 : Number(leverage);

  async function handleToggle() {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({ enabled: !config.enabled, riskPerTradeUsdt: riskValue, leverage: leverageValue });
      toast.success(!config.enabled ? "Terminal News Trade AÇILDI" : "Terminal News Trade kapatıldı");
    } catch (err: any) {
      toast.error(err?.message ?? "Ayar güncellenemedi");
    }
  }

  async function handleToggleShadow() {
    if (!config) return;
    try {
      await updateConfig.mutateAsync({ shadowMode: !config.shadowMode });
      toast.success(!config.shadowMode ? "Gölge mod AÇILDI — gerçek emir gitmeyecek" : "Gölge mod kapatıldı — gerçek emir gidebilir");
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
          <h1 className="text-h1 text-[#F5F1EA]">Terminal News Trade</h1>
          <div className="mt-1.5 flex items-center gap-2 flex-wrap">
            <span className="rounded-full px-2.5 py-1 text-badge uppercase tracking-wider" style={{ backgroundColor: "#3B5BFF22", color: "#3B5BFF" }}>
              Kullanım durumu: Yalnızca yönetici
            </span>
            <PremiumGlowButton type="button" size="sm" onClick={() => setShowAbout(true)} className="gap-1.5 text-badge">
              <Sparkles size={13} />
              Modül Hakkında
            </PremiumGlowButton>
          </div>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>
      {showAbout && <AboutTerminalNewsTradePanel onClose={() => setShowAbout(false)} />}

      <TestEventBox />

      {positions && positions.length > 0 && (
        <div className="rounded-2xl border border-[#EF444433] bg-[#EF44440D] p-4 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <p className="text-body-sm font-semibold text-[#F5F1EA]">Açık Pozisyonlar ({positions.length})</p>
            <Button onClick={handleCloseAll} disabled={closeAll.isPending} className="h-9 gap-1.5" style={{ backgroundColor: "#EF4444" }}>
              <XCircle size={15} />
              Tüm İşlemleri Kapat (piyasa fiyatından)
            </Button>
          </div>
          <div className="space-y-2">
            {positions.map((p) => (
              <PositionCard key={p.id} position={p} onClose={() => handleCloseOne(p.id, p.symbol)} isClosing={closeOne.isPending} />
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
                style={{ backgroundColor: config.enabled ? "#22C55E22" : "#A8A6A022", color: config.enabled ? "#22C55E" : "#A8A6A0" }}
              >
                {config.enabled ? "AÇIK" : "KAPALI"}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider"
                style={{ backgroundColor: config.shadowMode ? "#8A5CFF22" : "#EF444422", color: config.shadowMode ? "#8A5CFF" : "#EF4444" }}
              >
                {config.shadowMode ? "GÖLGE MOD" : "GERÇEK EMİR"}
              </span>
              <span
                className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider"
                style={{ backgroundColor: config.testnetActive ? "#F5A62322" : "#EF444422", color: config.testnetActive ? "#F5A623" : "#EF4444" }}
              >
                {config.testnetActive ? "TESTNET" : "GERÇEK PARA"}
              </span>
              {!config.apiKeyConfigured && (
                <span className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider" style={{ backgroundColor: "#EF444422", color: "#EF4444" }}>
                  Binance API key tanımlı değil
                </span>
              )}
              {!config.xApiConfigured && (
                <span className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider" style={{ backgroundColor: "#EF444422", color: "#EF4444" }}>
                  X API tanımlı değil
                </span>
              )}
              {!config.aiConfigured && (
                <span className="rounded-full px-2 py-0.5 text-badge uppercase tracking-wider" style={{ backgroundColor: "#EF444422", color: "#EF4444" }}>
                  Orca AI (Anthropic) tanımlı değil
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handleToggleShadow} disabled={updateConfig.isPending} className="h-9" style={{ backgroundColor: config.shadowMode ? undefined : "#8A5CFF" }}>
                {config.shadowMode ? "Gölge Modu Kapat" : "Gölge Modu Aç"}
              </Button>
              <Button onClick={handleToggle} disabled={!config.apiKeyConfigured || updateConfig.isPending} className="h-9" style={{ backgroundColor: config.enabled ? "#EF4444" : undefined }}>
                {config.enabled ? "Kapat" : "Aç"}
              </Button>
            </div>
          </div>

          {!config.apiKeyConfigured && (
            <p className="text-body-xs text-[#A8A6A0]">
              Açmak için backend `.env` içinde BINANCE_API_KEY / BINANCE_API_SECRET tanımlı olmalı. Ayrıca haber
              akışının çalışması için X_API_BEARER_TOKEN, sınıflandırma için ANTHROPIC_API_KEY gerekir.
            </p>
          )}
          {config.shadowMode && (
            <p className="text-body-xs text-[#8A5CFF]">
              Gölge mod açık: "Aç" anahtarı açık olsa bile hiçbir gerçek/testnet emir gitmiyor, sadece "açılsaydı ne
              olurdu" kaydı tutuluyor.
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
              Stop, haber öncesi pivot (swing high/low) seviyesinden hesaplanır — sabit bir R:R değil.
            </span>
          </div>

          {stats && stats.totalClosed > 0 && (
            <div className="border-t border-border pt-3 space-y-1.5">
              <p className="text-badge uppercase tracking-wider text-[#A8A6A0]">Gerçek işlem istatistiği (Money Maker'dan bağımsız)</p>
              <div className="flex items-center gap-3 text-body-xs text-[#A8A6A0] flex-wrap">
                <span>Kapanan: {stats.totalClosed}</span>
                <span className="text-[#22C55E]">Kazandı: {stats.wins}</span>
                <span className="text-[#EF4444]">Kayıp: {stats.losses}</span>
                <span className="font-semibold text-[#F5F1EA]">Başarı: {stats.winRate !== null ? `%${stats.winRate}` : "Yetersiz veri"}</span>
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
              <p className="mb-2 text-badge uppercase tracking-wider text-[#A8A6A0]">Son işlemler</p>
              <div className="space-y-1">
                {trades.slice(0, 20).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-body-xs text-[#D6D3CB] flex-wrap">
                    <span className="font-semibold text-[#F5F1EA]">{t.symbol}</span>
                    <span>{t.direction}</span>
                    <span
                      className="rounded-full px-2 py-0.5 text-badge uppercase"
                      style={{
                        backgroundColor: t.status === "CLOSED" || t.status === "FAILED" ? "#A8A6A022" : t.status === "SHADOW_ONLY" ? "#8A5CFF22" : "#3B5BFF22",
                        color: t.status === "FAILED" ? "#EF4444" : t.status === "CLOSED" ? "#22C55E" : t.status === "SHADOW_ONLY" ? "#8A5CFF" : "#3B5BFF",
                      }}
                    >
                      {t.status === "SHADOW_ONLY" ? "GÖLGE" : t.status}
                    </span>
                    {t.entryPrice && <span>@{t.entryPrice}</span>}
                    {t.qty && <span>qty={t.qty}</span>}
                    {t.entryLatencyMs != null && <span className="text-[#F5A623]">gecikme {(t.entryLatencyMs / 1000).toFixed(1)}sn</span>}
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

          {events && events.length > 0 && (
            <div className="border-t border-border pt-3">
              <p className="mb-2 text-badge uppercase tracking-wider text-[#A8A6A0]">
                Haber Akışı (işlem açılsın açılmasın tüm haberler)
              </p>
              <div className="space-y-1.5">
                {events.slice(0, 30).map((e) => (
                  <div key={e.id} className="flex items-start gap-2 text-body-xs text-[#D6D3CB] flex-wrap rounded-lg bg-card-inner p-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-badge uppercase shrink-0"
                      style={{ backgroundColor: e.tradable ? "#22C55E22" : "#A8A6A022", color: e.tradable ? "#22C55E" : "#A8A6A0" }}
                    >
                      {e.tradable ? "İşlem açıldı" : "Sadece loglandı"}
                    </span>
                    {e.category && (
                      <span className="rounded-full px-2 py-0.5 text-badge uppercase shrink-0" style={{ backgroundColor: "#3B5BFF22", color: "#3B5BFF" }}>
                        {CATEGORY_LABELS[e.category] ?? e.category}
                      </span>
                    )}
                    <span className="text-[#605D57]">@{e.sourceAccount}</span>
                    <span className="flex-1 min-w-[200px]">{e.aiSummary ?? e.rawText}</span>
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
