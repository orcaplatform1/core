"use client";
import Link from "next/link";
import { ShieldAlert, TrendingUp, Users2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useStaffPerformance } from "@/lib/hooks/use-admin-staff";

export default function AdminStaffPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const { data: staff, isLoading } = useStaffPerformance();

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

  const totals = (staff ?? []).reduce(
    (acc, s) => ({
      testsGiven: acc.testsGiven + s.testsGiven,
      conversions: acc.conversions + s.conversions,
      totalSales: acc.totalSales + s.totalSales,
      totalCommission: acc.totalCommission + s.totalCommission,
    }),
    { testsGiven: 0, conversions: 0, totalSales: 0, totalCommission: 0 }
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-h1 text-[#F5F1EA]">Staff Performans</h1>
          <p className="text-body-sm text-[#A8A6A0]">AVM personel bazlı test/satış/komisyon özeti.</p>
        </div>
        <Link href="/manage" className="text-body-sm text-primary hover:underline">
          ← M Dashboard
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-body-xs text-[#A8A6A0]">Toplam Test</p>
          <p className="mt-1 text-num-md text-[#F5F1EA]">{totals.testsGiven}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-body-xs text-[#A8A6A0]">Dönüşüm</p>
          <p className="mt-1 text-num-md text-[#22C55E]">{totals.conversions}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-body-xs text-[#A8A6A0]">Toplam Satış</p>
          <p className="mt-1 text-num-md text-[#F5F1EA]">{totals.totalSales}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-body-xs text-[#A8A6A0]">Toplam Komisyon</p>
          <p className="mt-1 text-num-md text-[#3B5BFF]">
            {totals.totalCommission.toLocaleString("tr-TR")} ₺
          </p>
        </div>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !staff || staff.length === 0 ? (
          <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
            <Users2 size={28} className="mx-auto text-[#A8A6A0]" />
            <p className="text-body-sm text-[#A8A6A0]">
              Henüz STAFF rolüne yükseltilmiş personel yok. Kullanıcılar bölümünden bir kullanıcının
              rolünü STAFF yaparak başlayabilirsin.
            </p>
          </div>
        ) : (
          staff.map((s) => {
            const conversionRate = s.testsGiven > 0 ? Math.round((s.conversions / s.testsGiven) * 100) : 0;
            return (
              <div key={s.staffId} className="rounded-2xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/manage/users/${s.staffId}`} className="font-medium text-[#F5F1EA] hover:text-primary hover:underline">
                      {s.fullName}
                    </Link>
                    <p className="text-body-xs text-[#A8A6A0]">
                      Promo kod: {s.promoCode ?? "—"}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-card-title-sm text-[#22C55E]">
                    <TrendingUp size={14} />
                    {conversionRate}%
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  <div className="rounded-lg border border-border bg-card-inner p-2.5">
                    <p className="text-[10px] text-[#A8A6A0]">Test</p>
                    <p className="text-card-title-sm text-[#F5F1EA]">{s.testsGiven}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card-inner p-2.5">
                    <p className="text-[10px] text-[#A8A6A0]">Dönüştü</p>
                    <p className="text-card-title-sm text-[#22C55E]">{s.conversions}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card-inner p-2.5">
                    <p className="text-[10px] text-[#A8A6A0]">Dönüşmedi</p>
                    <p className="text-card-title-sm text-[#F39C3D]">{s.notConvertedYet}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card-inner p-2.5">
                    <p className="text-[10px] text-[#A8A6A0]">Satış</p>
                    <p className="text-card-title-sm text-[#F5F1EA]">{s.totalSales}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-card-inner p-2.5">
                    <p className="text-[10px] text-[#A8A6A0]">Komisyon</p>
                    <p className="text-card-title-sm text-[#3B5BFF]">
                      {s.totalCommission.toLocaleString("tr-TR")} ₺
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
