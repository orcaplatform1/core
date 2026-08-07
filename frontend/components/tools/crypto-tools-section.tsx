"use client";

import {
  TrendingUp,
  TrendingDown,
  Flame,
  Gauge,
  PieChart,
  Percent,
  AlertTriangle,
  Sparkles,
  Coins,
  Landmark,
} from "lucide-react";
import {
  useCryptoMovers,
  useCryptoHeatmap,
  useFundingRates,
  useFearGreed,
  useLiquidationZones,
  useTrending,
  useStablecoins,
  useAltcoinSeason,
  useEtfFlows,
} from "@/lib/hooks/use-tools";
import type { TickerRow } from "@/lib/types/tools";
import { ToolCard, type ToolAccent } from "./tool-card";
import { Sparkline } from "./sparkline";
import { CircularProgress } from "./circular-progress";

function fmtPrice(n: number) {
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (n >= 1) return n.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return n.toLocaleString("en-US", { maximumFractionDigits: 6 });
}

function ChangePill({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={
        positive
          ? "rounded-full bg-success/10 px-2 py-0.5 text-badge text-success"
          : "rounded-full bg-danger/10 px-2 py-0.5 text-badge text-danger"
      }
    >
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}

function TickerTable({
  title,
  rows,
  icon,
  accent,
}: {
  title: string;
  rows: TickerRow[];
  icon: React.ElementType;
  accent: ToolAccent;
}) {
  return (
    <ToolCard title={title} icon={icon} accent={accent}>
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
        {rows.map((r) => (
          <div
            key={r.symbol}
            className="flex items-center justify-between gap-2 rounded-lg px-2 py-2.5 transition-colors hover:bg-card-hover"
          >
            <span className="w-16 shrink-0 truncate text-financial text-foreground/90">
              {r.symbol.replace("USDT", "")}
            </span>
            <Sparkline data={r.sparkline} positive={r.changePercent >= 0} />
            <span className="w-20 shrink-0 text-right text-financial text-muted-foreground">${fmtPrice(r.price)}</span>
            <span className="w-16 shrink-0 text-right">
              <ChangePill value={r.changePercent} />
            </span>
          </div>
        ))}
      </div>
    </ToolCard>
  );
}

function FearGreedCard() {
  const { data } = useFearGreed();
  if (!data) {
    return (
      <ToolCard title="Korku & Açgözlülük Endeksi" icon={Gauge} accent="purple">
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      </ToolCard>
    );
  }
  const color = data.value < 40 ? "var(--danger)" : data.value > 60 ? "var(--success)" : "var(--warning)";
  return (
    <ToolCard title="Korku & Açgözlülük Endeksi" icon={Gauge} accent="purple">
      <div className="flex items-center gap-5">
        <CircularProgress value={data.value} color={color} label={data.classification} />
        <div>
          <p className="text-card-title-md text-foreground">{data.classification}</p>
          <p className="text-body-xs text-muted-foreground">Günlük endeks</p>
          <p className="mt-1 text-body-xs text-muted-foreground">Kaynak: alternative.me</p>
        </div>
      </div>
    </ToolCard>
  );
}

function DominanceCard() {
  const { data } = useCryptoHeatmap();
  const btcDom = data?.btcDominance;
  const ethDom = data?.ethDominance;
  return (
    <ToolCard title="BTC / ETH Dominansı" icon={PieChart} accent="purple">
      {btcDom == null || ethDom == null ? (
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CircularProgress value={Math.round(btcDom)} color="var(--purple)" label="BTC" />
            <p className="text-num-sm text-foreground">%{btcDom.toFixed(1)}</p>
          </div>
          <div className="flex items-center gap-3">
            <CircularProgress value={Math.round(ethDom)} color="var(--primary)" label="ETH" />
            <p className="text-num-sm text-foreground">%{ethDom.toFixed(1)}</p>
          </div>
        </div>
      )}
    </ToolCard>
  );
}

function TrendingCard() {
  const { data } = useTrending();
  const coins = (data ?? []).slice(0, 7);
  return (
    <ToolCard title="Trend Olan Coinler" icon={Sparkles} accent="warning">
      <div className="flex flex-wrap gap-2">
        {coins.length === 0 && <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
        {coins.map((c, i) => (
          <span
            key={c.symbol + i}
            className="flex items-center gap-1.5 rounded-full card-inner px-3 py-1.5 text-tag text-foreground/90"
          >
            <Flame className="size-3 text-warning" />
            {c.symbol}
            {c.marketCapRank && <span className="text-muted-foreground">#{c.marketCapRank}</span>}
          </span>
        ))}
      </div>
    </ToolCard>
  );
}

function StablecoinFlowCard() {
  const { data } = useStablecoins();
  return (
    <ToolCard title="Stablecoin Piyasa Değeri" icon={Coins} accent="primary">
      {!data ? (
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      ) : (
        <>
          <p className="text-num-md text-foreground">
            ${(data.totalMarketCap / 1e9).toLocaleString("en-US", { maximumFractionDigits: 1 })}B
          </p>
          <p className={`mt-1 text-financial ${data.change24h >= 0 ? "text-success" : "text-danger"}`}>
            {data.change24h >= 0 ? "+" : ""}
            ${(data.change24h / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M (24s akış)
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {data.topStablecoins.map((s) => (
              <span key={s.symbol} className="rounded-md card-inner px-2 py-1 text-badge text-muted-foreground">
                {s.symbol}
              </span>
            ))}
          </div>
        </>
      )}
    </ToolCard>
  );
}

function AltcoinSeasonCard() {
  const { data } = useAltcoinSeason();
  if (!data) {
    return (
      <ToolCard title="Altcoin Season Endeksi" icon={Gauge} accent="success">
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor... (günlük hesaplanır)</p>
      </ToolCard>
    );
  }
  const color =
    data.classification === "Altcoin Season"
      ? "var(--success)"
      : data.classification === "Bitcoin Season"
        ? "var(--warning)"
        : "var(--primary)";
  return (
    <ToolCard title="Altcoin Season Endeksi" icon={Gauge} accent="success">
      <div className="flex items-center gap-5">
        <CircularProgress value={Math.round(data.percentage)} color={color} label={data.classification} />
        <div>
          <p className="text-card-title-md text-foreground">{data.classification}</p>
          <p className="text-body-xs text-muted-foreground">
            Top {data.totalCount} coinin {data.outperformingCount} tanesi son 90 günde BTC&apos;yi geçti
          </p>
        </div>
      </div>
    </ToolCard>
  );
}

function EtfFlowCard() {
  const { data } = useEtfFlows();
  const btcLatest = data?.btc?.[0];
  const ethLatest = data?.eth?.[0];
  return (
    <ToolCard title="BTC / ETH Spot ETF Net Akışları" icon={Landmark} accent="purple">
      {!btcLatest && !ethLatest ? (
        <p className="text-body-xs text-muted-foreground">Veri yok (SoSoValue API anahtarı gerekli).</p>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {btcLatest && (
            <div className="rounded-lg card-inner p-3 text-body-xs">
              <p className="text-muted-foreground">BTC ETF ({btcLatest.date})</p>
              <p className={`mt-1 text-num-sm ${btcLatest.netFlow >= 0 ? "text-success" : "text-danger"}`}>
                {btcLatest.netFlow >= 0 ? "+" : ""}${(btcLatest.netFlow / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M
              </p>
            </div>
          )}
          {ethLatest && (
            <div className="rounded-lg card-inner p-3 text-body-xs">
              <p className="text-muted-foreground">ETH ETF ({ethLatest.date})</p>
              <p className={`mt-1 text-num-sm ${ethLatest.netFlow >= 0 ? "text-success" : "text-danger"}`}>
                {ethLatest.netFlow >= 0 ? "+" : ""}${(ethLatest.netFlow / 1e6).toLocaleString("en-US", { maximumFractionDigits: 1 })}M
              </p>
            </div>
          )}
        </div>
      )}
    </ToolCard>
  );
}

function HeatmapCard() {
  const { data } = useCryptoHeatmap();
  const coins = (data?.coins ?? []).slice(0, 24);
  if (coins.length === 0) {
    return (
      <ToolCard title="Piyasa Heatmap'i (Top 24, market cap)" icon={PieChart} accent="primary" className="sm:col-span-2">
        <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>
      </ToolCard>
    );
  }

  const logCaps = coins.map((c) => Math.log10(Math.max(c.marketCap, 1)));
  const minLog = Math.min(...logCaps);
  const maxLog = Math.max(...logCaps);
  const range = maxLog - minLog || 1;

  return (
    <ToolCard title="Piyasa Heatmap'i (Top 24, market cap)" icon={PieChart} accent="primary" className="sm:col-span-2">
      <div className="grid auto-rows-[64px] grid-cols-4 gap-1.5 sm:grid-cols-6">
        {coins.map((c, i) => {
          const normalized = (logCaps[i] - minLog) / range;
          const spanClass = normalized > 0.82 ? "col-span-2 row-span-2" : normalized > 0.55 ? "col-span-2" : "";
          const rgb = c.changePercent24h >= 0 ? "34,197,94" : "239,68,68";
          // Küçük (%0-1) ile büyük (%5+) değişimler arasında belirgin kontrast için
          // daha dik bir hassasiyet eğrisi.
          const alpha = 0.22 + Math.min(Math.abs(c.changePercent24h) / 4, 1) * 0.68;
          return (
            <div
              key={c.symbol}
              className={`flex flex-col items-center justify-center rounded-lg text-body-xs text-white transition-transform duration-200 hover:scale-[1.03] hover:z-10 ${spanClass}`}
              style={{ backgroundColor: `rgba(${rgb},${alpha})` }}
              title={c.name}
            >
              <span className={normalized > 0.82 ? "text-card-title-sm" : ""}>{c.symbol}</span>
              <span className="opacity-90">
                {c.changePercent24h > 0 ? "+" : ""}
                {c.changePercent24h.toFixed(1)}%
              </span>
            </div>
          );
        })}
      </div>
    </ToolCard>
  );
}

function FundingRateTable() {
  const { data } = useFundingRates();
  const rows = (data ?? []).slice(0, 10);
  return (
    <ToolCard title="Funding Rate Tablosu" icon={Percent} accent="primary">
      <div className="space-y-1">
        {rows.length === 0 && <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
        {rows.map((r) => (
          <div key={r.symbol} className="flex items-center justify-between rounded-lg px-2 py-2 transition-colors hover:bg-card-hover">
            <span className="text-financial text-foreground/90">{r.symbol.replace("USDT", "")}</span>
            <ChangePill value={r.fundingRatePercent} />
          </div>
        ))}
      </div>
    </ToolCard>
  );
}

function LiquidationZonesCard() {
  const { data } = useLiquidationZones();
  const zones = (data?.zones ?? []).slice(0, 6);
  return (
    <ToolCard
      title="Tahmini Likidasyon Bölgeleri"
      icon={AlertTriangle}
      accent="warning"
      className="sm:col-span-2"
      badge={
        <span className="rounded-full bg-warning/10 px-2 py-0.5 text-badge text-warning">TAHMİNİ</span>
      }
    >
      <p className="mb-3 text-body-xs text-muted-foreground">
        Yaygın kaldıraç oranlarına göre hesaplanan yaklaşık seviyelerdir; gerçek likidasyon verisi değildir.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {zones.length === 0 && <p className="text-body-xs text-muted-foreground">Veri yükleniyor...</p>}
        {zones.map((z) => (
          <div key={z.symbol} className="rounded-lg card-inner p-3 text-body-xs">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-financial text-foreground/90">{z.symbol.replace("USDT", "")}</span>
              <span className="text-financial text-muted-foreground">${fmtPrice(z.price)}</span>
            </div>
            <div className="space-y-1">
              {z.estimatedZones.map((ez) => (
                <div key={ez.leverage} className="flex items-center justify-between text-body-xs">
                  <span className="text-muted-foreground">{ez.leverage}x</span>
                  <span className="text-financial text-danger">${fmtPrice(ez.shortLiqPrice)}</span>
                  <span className="text-financial text-success">${fmtPrice(ez.longLiqPrice)}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </ToolCard>
  );
}

export function CryptoToolsSection() {
  const { data: movers } = useCryptoMovers();

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <TickerTable title="Top 10 (Hacim)" rows={movers?.top10 ?? []} icon={TrendingUp} accent="primary" />
        <TickerTable title="Hot 10 (En Çok Hareketli)" rows={movers?.hot10 ?? []} icon={Flame} accent="warning" />
        <TickerTable title="En Çok Kazandıranlar" rows={movers?.gainers ?? []} icon={TrendingUp} accent="success" />
        <TickerTable title="En Çok Kaybettirenler" rows={movers?.losers ?? []} icon={TrendingDown} accent="danger" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FearGreedCard />
        <DominanceCard />
        <FundingRateTable />
      </div>

      <div className="grid grid-cols-1 gap-4">
        <HeatmapCard />
        <LiquidationZonesCard />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <TrendingCard />
        <StablecoinFlowCard />
        <AltcoinSeasonCard />
      </div>

      <EtfFlowCard />
    </div>
  );
}
