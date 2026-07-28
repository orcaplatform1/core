"use client";

import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, ReferenceLine } from "recharts";
import { Newspaper } from "lucide-react";
import { useNewsSentiment, type SentimentLabel } from "@/lib/hooks/use-news-sentiment";
import { ToolCard } from "./tool-card";

const LABEL_STYLES: Record<SentimentLabel, string> = {
  POSITIVE: "bg-success/10 text-success",
  NEGATIVE: "bg-danger/10 text-danger",
  NEUTRAL: "bg-muted text-muted-foreground",
};

const LABEL_TEXT: Record<SentimentLabel, string> = {
  POSITIVE: "Pozitif",
  NEGATIVE: "Negatif",
  NEUTRAL: "Nötr",
};

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 60) return `${mins} dk önce`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} saat önce`;
  return `${Math.floor(hours / 24)} gün önce`;
}

export function NewsSentimentSection() {
  const { data } = useNewsSentiment();

  return (
    <div className="space-y-4">
      <ToolCard title="Haber Sentiment Trendi" icon={Newspaper} accent="purple">
        {!data || data.trend.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Henüz yeterli veri yok. Haberler işlendikçe trend burada görünecek.
          </p>
        ) : (
          <div className="h-[220px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.trend} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="sentiment-gradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--purple)" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="var(--purple)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                  tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis domain={[-1, 1]} tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
                <ReferenceLine y={0} stroke="var(--border)" />
                <Tooltip
                  contentStyle={{
                    background: "var(--elevated)",
                    border: "1px solid var(--border)",
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelFormatter={(v) => new Date(String(v)).toLocaleDateString("tr-TR")}
                  formatter={(value: unknown) => [Number(value).toFixed(2), "Ortalama Skor"]}
                />
                <Area type="monotone" dataKey="avgScore" stroke="var(--purple)" strokeWidth={2} fill="url(#sentiment-gradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </ToolCard>

      <ToolCard title="Son Haberler" icon={Newspaper} accent="primary">
        <div className="space-y-1">
          {(!data || data.articles.length === 0) && (
            <p className="text-xs text-muted-foreground">Veri yükleniyor...</p>
          )}
          {data?.articles.map((article) => (
            <a
              key={article.id}
              href={article.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-start justify-between gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-card-hover"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground/90">{article.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {article.source} · {relativeTime(article.publishedAt)}
                </p>
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold ${LABEL_STYLES[article.sentimentLabel]}`}
              >
                {LABEL_TEXT[article.sentimentLabel]}
              </span>
            </a>
          ))}
        </div>
      </ToolCard>
    </div>
  );
}
