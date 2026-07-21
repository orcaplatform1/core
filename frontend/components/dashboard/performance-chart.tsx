"use client";

import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from "recharts";
import type { PnlPoint } from "@/lib/types/stats";

export function PerformanceChart({
  title,
  totalLabel,
  data,
  isLoading,
  color = "#33468F",
}: {
  title: string;
  totalLabel: string;
  data: PnlPoint[] | undefined;
  isLoading: boolean;
  color?: string;
}) {
  const total = data && data.length > 0 ? data[data.length - 1].cumulativePnl : 0;

  if (isLoading) {
    return <div className="h-64 w-full animate-pulse rounded-2xl bg-card" />;
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <div className="text-right">
          <p className="text-xs text-muted-foreground">{totalLabel}</p>
          <p className={`text-lg font-bold ${total >= 0 ? "text-success" : "text-danger"}`}>
            {total >= 0 ? "+" : ""}
            {total.toFixed(1)}
          </p>
        </div>
      </div>

      {!data || data.length === 0 ? (
        <div className="mt-6 flex h-[200px] items-center justify-center text-sm text-muted-foreground">
          Henüz işlem verisi yok
        </div>
      ) : (
        <div className="mt-4 h-[200px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: -20, right: 10, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id={`gradient-${title}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.35} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: "var(--text-muted)" }}
                tickFormatter={(v) => new Date(v).toLocaleDateString("tr-TR", { day: "2-digit", month: "short" })}
                axisLine={false}
                tickLine={false}
              />
              <YAxis tick={{ fontSize: 11, fill: "var(--text-muted)" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "var(--elevated)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 12,
                }}
                labelFormatter={(v) => new Date(String(v)).toLocaleDateString("tr-TR")}
              />
              <Area
                type="monotone"
                dataKey="cumulativePnl"
                stroke={color}
                strokeWidth={2}
                fill={`url(#gradient-${title})`}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
