"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, UserPlus, ChevronDown, ChevronUp, Gift } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import {
  useReferralOverview,
  useReferralInvitees,
  useReferralEarningsStats,
  type ReferralEarningsPeriod,
} from "@/lib/hooks/use-admin-referrals";

const PERIOD_TABS = [
  { value: "daily", label: "Günlük" },
  { value: "monthly", label: "Aylık" },
  { value: "yearly", label: "Yıllık" },
] as const;

function formatPeriodLabel(period: string, granularity: "daily" | "monthly" | "yearly") {
  const d = new Date(period);
  if (granularity === "daily") return d.toLocaleDateString("tr-TR", { day: "2-digit", month: "short" });
  if (granularity === "monthly") return d.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
  return d.toLocaleDateString("tr-TR", { year: "numeric" });
}

function ReferralEarningsSection() {
  const { data, isLoading } = useReferralEarningsStats();
  const [tab, setTab] = useState<(typeof PERIOD_TABS)[number]["value"]>("daily");
  const rows: ReferralEarningsPeriod[] = data?.[tab] ?? [];
  const totalCredits = rows.reduce((sum, r) => sum + r.creditsAwarded, 0);
  const totalConversions = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gift size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-[#F5F1EA]">Referans Kazanç İstatistikleri</h2>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1 text-xs ${tab === t.value ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <p className="mt-4 text-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : rows.length === 0 ? (
        <p className="mt-4 text-sm text-[#A8A6A0]">Bu dönemde referans dönüşümü yok.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:w-72">
            <div className="rounded-xl bg-card-inner p-3">
              <p className="text-xs text-[#A8A6A0]">Dönüşen Referans</p>
              <p className="mt-1 text-lg font-semibold text-[#F5F1EA]">{totalConversions}</p>
            </div>
            <div className="rounded-xl bg-card-inner p-3">
              <p className="text-xs text-[#A8A6A0]">Dağıtılan Kredi</p>
              <p className="mt-1 text-lg font-semibold text-[#F5F1EA]">{totalCredits}</p>
            </div>
          </div>
          <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-[#A8A6A0]">
                  <th className="px-3 py-2 font-medium">Dönem</th>
                  <th className="px-3 py-2 font-medium">Dönüşüm</th>
                  <th className="px-3 py-2 font-medium">Dağıtılan Kredi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...rows].reverse().map((r) => (
                  <tr key={r.period}>
                    <td className="px-3 py-2 text-[#F5F1EA]">{formatPeriodLabel(r.period, tab)}</td>
                    <td className="px-3 py-2 text-[#F5F1EA]">{r.count}</td>
                    <td className="px-3 py-2 text-[#F5F1EA]">{r.creditsAwarded}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ReferrerInvitees({ userId }: { userId: string }) {
  const { data: invitees, isLoading } = useReferralInvitees(userId);
  if (isLoading) return <p className="px-4 pb-4 text-xs text-[#A8A6A0]">Yükleniyor...</p>;
  if (!invitees || invitees.length === 0) {
    return <p className="px-4 pb-4 text-xs text-[#A8A6A0]">Henüz davet ettiği kimse yok.</p>;
  }
  return (
    <div className="border-t border-border px-4 py-3">
      <p className="mb-2 text-xs font-medium text-[#A8A6A0]">Davet ettiği üyeler ({invitees.length})</p>
      <div className="space-y-1.5">
        {invitees.map((inv) => (
          <div key={inv.id} className="flex items-center justify-between rounded-lg bg-card-inner px-3 py-2 text-sm">
            <div>
              <p className="text-[#F5F1EA]">{inv.fullName}</p>
              <p className="text-xs text-[#A8A6A0]">@{inv.username ?? "—"} · {inv.email ?? "email yok"}</p>
            </div>
            <p className="text-xs text-[#A8A6A0]">{new Date(inv.createdAt).toLocaleDateString("tr-TR")}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminReferralsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: referrers, isLoading } = useReferralOverview();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  if (authLoading) {
    return <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-[#F5F1EA]">Davetiye Sistemi</h1>
          <p className="text-sm text-[#A8A6A0]">Üye referansları, kazandıkları kredi ve davet ettikleri kişiler.</p>
        </div>
        <Link href="/manage" className="text-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      <ReferralEarningsSection />

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !referrers || referrers.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
            <UserPlus size={28} className="mx-auto text-[#A8A6A0]" />
            <p className="text-sm text-[#A8A6A0]">Henüz kimse referans koduyla üye davet etmemiş.</p>
          </div>
        ) : (
          referrers.map((r) => {
            const expanded = expandedId === r.id;
            return (
              <div key={r.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : r.id)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <div>
                    <p className="font-medium text-[#F5F1EA]">{r.fullName}</p>
                    <p className="text-xs text-[#A8A6A0]">Referans kodu: @{r.username ?? "—"}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs text-[#A8A6A0]">Davet ettiği</p>
                      <p className="text-sm font-semibold text-[#F5F1EA]">{r.invitedCount}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-[#A8A6A0]">Kazandığı kredi</p>
                      <p className="text-sm font-semibold text-[#22C55E]">{r.creditsEarned}</p>
                    </div>
                    {expanded ? (
                      <ChevronUp size={18} className="text-[#A8A6A0]" />
                    ) : (
                      <ChevronDown size={18} className="text-[#A8A6A0]" />
                    )}
                  </div>
                </button>
                {expanded && <ReferrerInvitees userId={r.id} />}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
