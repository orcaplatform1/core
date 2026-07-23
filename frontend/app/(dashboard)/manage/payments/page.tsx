"use client";
import { useState } from "react";
import { Lock, FileText, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useAdminPayments, useApprovePayment, useRejectPayment } from "@/lib/hooks/use-admin-payments";

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

export default function AdminPaymentsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState("PENDING");
  const [page, setPage] = useState(1);

  const { data: paymentList, isLoading } = useAdminPayments(page, status);
  const approve = useApprovePayment();
  const reject = useRejectPayment();

  if (authLoading) {
    return <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <Lock size={32} color="#FF5C5C" className="mx-auto" />
        <p className="text-sm text-[#8D9BB6]">Bu sayfaya erişim yetkin yok.</p>
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
        <h1 className="text-2xl font-semibold text-[#F5F8FF]">Ödemeler</h1>
        <p className="text-sm text-[#8D9BB6]">Dekont/kripto ödemelerini onayla veya reddet.</p>
      </div>

      <div className="flex rounded-xl border border-border overflow-hidden w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => {
              setStatus(tab.value);
              setPage(1);
            }}
            className={`px-4 py-1.5 text-sm ${status === tab.value ? "bg-primary text-white" : "bg-card-inner text-[#8D9BB6]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-sm text-[#8D9BB6]">Yükleniyor...</p>
        ) : !paymentList || paymentList.data.length === 0 ? (
          <p className="p-6 text-sm text-[#8D9BB6]">Bu durumda ödeme yok.</p>
        ) : (
          <div className="divide-y divide-border">
            {paymentList.data.map((p) => (
              <div key={p.id} className="p-4 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-[#F5F8FF]">{p.user.fullName}</p>
                    <p className="text-xs text-[#8D9BB6]">
                      @{p.user.username} · {p.user.email ?? "email yok"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-[#F5F8FF]">{formatMoney(p.amount, p.currency)}</p>
                    <p className="text-xs text-[#8D9BB6]">
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
          <span className="text-sm text-[#8D9BB6]">
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
