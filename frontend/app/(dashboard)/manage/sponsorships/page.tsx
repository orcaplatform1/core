"use client";
import { useState } from "react";
import Link from "next/link";
import { Lock, Check, X, TrendingUp, Rocket, Gift } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import {
  useAdminSponsorships,
  useApproveSponsorship,
  useRejectSponsorship,
  useSponsorshipStats,
  type Sponsorship,
  type SponsorshipStatBucket,
} from "@/lib/hooks/use-sponsorships";

const STATUS_TABS = [
  { value: "PENDING_REVIEW", label: "Bekleyen" },
  { value: "APPROVED", label: "Onaylı" },
  { value: "REJECTED", label: "Reddedilen" },
  { value: "AWAITING_PAYMENT", label: "Ödeme Bekliyor" },
];

const PERIOD_TABS = [
  { value: "thisWeek", label: "Bu Hafta" },
  { value: "thisMonth", label: "Bu Ay" },
  { value: "thisYear", label: "Bu Yıl" },
] as const;

function StatsSection() {
  const { data, isLoading } = useSponsorshipStats();
  const [tab, setTab] = useState<(typeof PERIOD_TABS)[number]["value"]>("thisWeek");
  const bucket: SponsorshipStatBucket | undefined = data?.[tab];

  return (
    <div className="rounded-2xl border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp size={16} className="text-primary" />
          <h2 className="text-h2 text-[#F5F1EA]">Sponsor Geliri</h2>
        </div>
        <div className="flex rounded-lg border border-border overflow-hidden">
          {PERIOD_TABS.map((t) => (
            <button
              key={t.value}
              onClick={() => setTab(t.value)}
              className={`px-3 py-1 text-body-xs ${tab === t.value ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {isLoading || !bucket ? (
        <p className="mt-4 text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : (
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-card-inner p-3">
            <div className="flex items-center gap-1.5 text-[#D9A441]">
              <Rocket size={14} />
              <p className="text-body-xs text-[#A8A6A0]">ICO / IDO</p>
            </div>
            <p className="mt-1 text-num-md text-[#F5F1EA]">${bucket.ico.revenueUsd.toLocaleString("en-US")}</p>
            <p className="text-body-xs text-[#A8A6A0]">{bucket.ico.count} onaylı sponsor</p>
          </div>
          <div className="rounded-xl bg-card-inner p-3">
            <div className="flex items-center gap-1.5 text-[#3B5BFF]">
              <Gift size={14} />
              <p className="text-body-xs text-[#A8A6A0]">Airdrop</p>
            </div>
            <p className="mt-1 text-num-md text-[#F5F1EA]">${bucket.airdrop.revenueUsd.toLocaleString("en-US")}</p>
            <p className="text-body-xs text-[#A8A6A0]">{bucket.airdrop.count} onaylı sponsor</p>
          </div>
          <div className="rounded-xl bg-card-inner p-3">
            <p className="text-body-xs text-[#A8A6A0]">Toplam</p>
            <p className="mt-1 text-num-md text-[#22C55E]">${bucket.total.revenueUsd.toLocaleString("en-US")}</p>
            <p className="text-body-xs text-[#A8A6A0]">{bucket.total.count} onaylı sponsor</p>
          </div>
        </div>
      )}
    </div>
  );
}

function SponsorshipRow({ s, showActions }: { s: Sponsorship; showActions: boolean }) {
  const approve = useApproveSponsorship();
  const reject = useRejectSponsorship();

  const name = s.type === "ICO" ? (s.formData.name as string) : (s.formData.title as string);
  // Airdrop icin public sayfa slug ister, burada sadece id elimizde - o yuzden
  // airdrop icin admin listesine, ICO icin (id ile calisan) genel sayfaya linklenir.
  const listingLink =
    s.status === "APPROVED" ? (s.type === "ICO" ? `/tools/crypto/ico/${s.createdIcoId}` : "/manage/airdrops") : null;

  async function handleApprove() {
    try {
      await approve.mutateAsync(s.id);
      toast.success("Sponsor onaylandı, ilan yayına alındı ve tüm kullanıcılara bildirim gönderildi.");
    } catch (err: any) {
      toast.error(err?.message ?? "Onaylanamadı");
    }
  }

  async function handleReject() {
    const reason = window.prompt("Red sebebi (opsiyonel):") ?? undefined;
    try {
      await reject.mutateAsync({ id: s.id, reason });
      toast.success("Sponsor başvurusu reddedildi");
    } catch (err: any) {
      toast.error(err?.message ?? "Reddedilemedi");
    }
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5">
            {s.type === "ICO" ? <Rocket size={14} className="text-[#D9A441]" /> : <Gift size={14} className="text-[#3B5BFF]" />}
            <p className="text-card-title-sm text-[#F5F1EA]">{name || "(isimsiz)"}</p>
          </div>
          <p className="text-body-xs text-[#A8A6A0]">
            {s.contactName} · {s.contactEmail} {s.contactTelegram ? `· ${s.contactTelegram}` : ""}
          </p>
          {s.user && (
            <Link href={`/manage/users/${s.user.id}`} className="text-body-xs text-primary hover:underline">
              @{s.user.username ?? s.user.id}
            </Link>
          )}
        </div>
        <div className="text-right">
          <p className="text-financial text-[#F5F1EA]">${s.priceUsd}</p>
          <p className="text-body-xs text-[#A8A6A0]">{s.durationDays} gün</p>
        </div>
      </div>

      {s.status === "REJECTED" && s.rejectionReason && (
        <p className="text-body-xs text-danger">Red sebebi: {s.rejectionReason}</p>
      )}
      {s.status === "APPROVED" && listingLink && (
        <Link href={listingLink} className="text-body-xs text-primary hover:underline">
          Yayındaki ilanı gör →
        </Link>
      )}

      {showActions && (
        <div className="flex gap-2">
          <Button size="sm" disabled={approve.isPending} onClick={handleApprove}>
            <Check size={14} className="mr-1" />
            Onayla
          </Button>
          <Button size="sm" variant="outline" disabled={reject.isPending} onClick={handleReject}>
            <X size={14} className="mr-1" />
            Reddet
          </Button>
        </div>
      )}
    </div>
  );
}

export default function AdminSponsorshipsPage() {
  const { user: me, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState("PENDING_REVIEW");

  const { data: list, isLoading } = useAdminSponsorships(status);

  if (authLoading) {
    return <p className="text-body-sm text-[#A8A6A0]">Yükleniyor...</p>;
  }
  if (me?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <Lock size={32} color="#EF4444" className="mx-auto" />
        <p className="text-body-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-h1 text-[#F5F1EA]">Sponsorlar</h1>
        <p className="text-body-sm text-[#A8A6A0]">Ücretli ICO/Airdrop reklam başvurularını onayla veya reddet.</p>
      </div>

      <StatsSection />

      <div className="flex flex-wrap rounded-xl border border-border overflow-hidden w-fit">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatus(tab.value)}
            className={`px-4 py-1.5 text-body-sm ${status === tab.value ? "bg-primary text-white" : "bg-card-inner text-[#A8A6A0]"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <p className="p-6 text-body-sm text-[#A8A6A0]">Yükleniyor...</p>
        ) : !list || list.length === 0 ? (
          <p className="p-6 text-body-sm text-[#A8A6A0]">Bu durumda başvuru yok.</p>
        ) : (
          <div className="divide-y divide-border">
            {list.map((s) => (
              <SponsorshipRow key={s.id} s={s} showActions={status === "PENDING_REVIEW"} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
