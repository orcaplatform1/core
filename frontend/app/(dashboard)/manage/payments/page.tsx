"use client";
import { useEffect, useState } from "react";
import { Lock, FileText, Check, X, Tag, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  useAdminPayments,
  useApprovePayment,
  useRejectPayment,
  useUpdateProgramPrice,
  usePackageSalesStats,
  type PackageSalesPeriod,
} from "@/lib/hooks/use-admin-payments";
import { useProgramPrice } from "@/lib/hooks/use-payments";

const STATUS_TABS = [
  { value: "PENDING", label: "Bekleyen" },
  { value: "APPROVED", label: "Onaylı" },
  { value: "REJECTED", label: "Reddedilen" },
];

const METHOD_LABELS: Record<string, string> = {
  CARD: "Kart",
  CRYPTO: "Kripto",
  BANK_TRANSFER: "Havale/EFT",
};

function formatMoney(n: number, currency: string) {
  return `${n.toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

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

function ProgramPriceEditor() {
  const { data: priceData } = useProgramPrice();
  const updatePrice = useUpdateProgramPrice();
  const [value, setValue] = useState("");

  useEffect(() => {
    if (priceData) setValue(String(priceData.programPriceTRY));
  }, [priceData]);

  async function handleSave() {
    const num = Number(value);
    if (!num || num <= 0) {
      toast.error("Geçerli bir fiyat gir.");
      return;
    }
    try {
      await updatePrice.mutateAsync(num);
      toast.success("Eğitim paketi fiyatı güncellendi");
    } catch (err: any) {
      toast.error(err?.message ?? "Fiyat güncellenemedi");
    }
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2">
        <Tag size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-[#F5F1EA]">Eğitim Paketi Fiyatı</h2>
      </div>
      <p className="mt-1 text-xs text-[#A8A6A0]">
        Satın alındığında tüm programların açıldığı tek fiyat (TRY). Bu fiyat kayıt/ödeme sayfalarında gösterilir.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className="w-40 rounded-lg border border-border bg-card-inner px-3 py-2 text-sm text-[#F5F1EA] outline-none focus:border-primary"
        />
        <span className="text-sm text-[#A8A6A0]">TRY</span>
        <Button size="sm" disabled={updatePrice.isPending} onClick={handleSave}>
          Kaydet
        </Button>
      </div>
    </div>
  );
}

function PackageSalesStatsSection() {
  const { data, isLoading } = usePackageSalesStats();
  const [tab, setTab] = useState<(typeof PERIOD_TABS)[number]["value"]>("daily");
  const rows: PackageSalesPeriod[] = data?.[tab] ?? [];
  const totalRevenue = rows.reduce((sum, r) => sum + r.revenue, 0);
  const totalCount = rows.reduce((sum, r) => sum + r.count, 0);

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-sm font-semibold text-[#F5F1EA]">Eğitim Paketi Satış İstatistikleri</h2>
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
        <p className="mt-4 text-sm text-[#A8A6A0]">Bu dönemde satış yok.</p>
      ) : (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:w-72">
            <div className="rounded-xl bg-card-inner p-3">
              <p className="text-xs text-[#A8A6A0]">Toplam Ciro</p>
              <p className="mt-1 text-lg font-semibold text-[#F5F1EA]">{formatMoney(totalRevenue, "TRY")}</p>
            </div>
            <div className="rounded-xl bg-card-inner p-3">
              <p className="text-xs text-[#A8A6A0]">Toplam Satış</p>
              <p className="mt-1 text-lg font-semibold text-[#F5F1EA]">{totalCount}</p>
            </div>
          </div>
          <div className="mt-4 max-h-64 overflow-y-auto rounded-xl border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-[#A8A6A0]">
                  <th className="px-3 py-2 font-medium">Dönem</th>
                  <th className="px-3 py-2 font-medium">Satış</th>
                  <th className="px-3 py-2 font-medium">Ciro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...rows].reverse().map((r) => (
                  <tr key={r.period}>
                    <td className="px-3 py-2 text-[#F5F1EA]">{formatPeriodLabel(r.period, tab)}</td>
                    <td className="px-3 py-2 text-[#F5F1EA]">{r.count}</td>
                    <td className="px-3 py-2 text-[#F5F1EA]">{formatMoney(r.revenue, "TRY")}</td>
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

export default function AdminPaymentsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);

  const { data: paymentList, isLoading } = useAdminPayments(page, status);
  const approve = useApprovePayment();
  const reject = useRejectPayment();

  if (authLoading) {
    return <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <Lock size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  async function handleApprove(id: string) {
    try {
      await approve.mutateAsync(id);
      toast.success("Ödeme onaylandı");
    } catch (err: any) {
      toast.error(err?.message ?? "Onaylanamadı");
    }
  }

  async function handleReject(id: string) {
    try {
      await reject.mutateAsync(id);
      toast.success("Ödeme reddedildi");
    } catch (err: any) {
      toast.error(err?.message ?? "Reddedilemedi");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F1EA]">Ödemeler</h1>
        <p className="text-sm text-[#A8A6A0]">Dekont/kripto ödemelerini onayla veya reddet.</p>
      </div>

      <ProgramPriceEditor />
      <PackageSalesStatsSection />

      <div className="flex rounded-xl border border-border overflow-hidden w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`px-4 py-1.5 text-sm ${status === tab.value ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !paymentList || paymentList.data.length === 0 ? (
          <p className="p-6 text-sm text-[#A8A6A0]">Bu durumda ödeme yok.</p>
        ) : (
          <div className="divide-y divide-border">
            {paymentList.data.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#F5F1EA]">{p.user.fullName}</p>
                    <p className="text-xs text-[#A8A6A0]">
                      @{p.user.username} · {p.user.email ?? "email yok"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#F5F1EA]">{formatMoney(p.amount, p.currency)}</p>
                    <p className="text-xs text-[#A8A6A0]">
                      {METHOD_LABELS[p.method]} · {p.purpose === "PROGRAM" ? "Program" : "Mentor Kredi"}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {p.receiptUrl && (
                    <a
                      href={p.receiptUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      <FileText size={14} />
                      Dekont/Kanıt
                    </a>
                  )}
                  {status === "PENDING" && (
                    <div className="ml-auto flex gap-2">
                      <Button
                        size="sm"
                        disabled={approve.isPending}
                        onClick={() => handleApprove(p.id)}
                      >
                        <Check size={14} className="mr-1" />
                        Onayla
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={reject.isPending}
                        onClick={() => handleReject(p.id)}
                      >
                        <X size={14} className="mr-1" />
                        Reddet
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {paymentList && paymentList.pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Önceki
          </Button>
          <span className="text-sm text-[#A8A6A0]">
            {page} / {paymentList.pagination.totalPages}
          </span>
          <Button
            variant="outline"
            disabled={page >= paymentList.pagination.totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Sonraki
          </Button>
        </div>
      )}
    </div>
  );
}
