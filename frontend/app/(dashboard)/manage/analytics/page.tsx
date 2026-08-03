"use client";
import { useState } from "react";
import Link from "next/link";
import { ShieldAlert, Users, Eye, Radio, ExternalLink } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import {
  useVisitorStats,
  useRoleCounts,
  useActiveUsers,
  useGuestList,
  type ActiveUser,
} from "@/lib/hooks/use-analytics";

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  STUDENT: { label: "Öğrenci", color: "#3B5BFF" },
  STAFF: { label: "Yetkili", color: "#22C55E" },
  SUPER_ADMIN: { label: "Kurucu", color: "#EF4444" },
  GUEST: { label: "Guest", color: "#A8A6A0" },
};

function StatBox({ label, value }: { label: string; value: number | undefined }) {
  return (
    <div className="rounded-xl border border-border bg-card-inner p-4">
      <p className="text-2xl font-semibold text-[#F5F1EA]">{value ?? "—"}</p>
      <p className="text-xs text-[#A8A6A0]">{label}</p>
    </div>
  );
}

function ActiveUserRow({ u }: { u: ActiveUser }) {
  const badge = ROLE_BADGES[u.role];
  return (
    <Link
      href={`/profile/${u.id}`}
      className="flex items-center gap-3 rounded-lg border border-border bg-card-inner p-2.5 hover:border-primary transition-colors"
    >
      <Avatar className="size-8 shrink-0">
        <AvatarImage src={u.avatarUrl ?? undefined} alt={u.username ?? ""} />
        <AvatarFallback className="text-xs">{(u.username ?? u.fullName)?.[0]?.toUpperCase() ?? "?"}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-[#F5F1EA]">@{u.username ?? u.fullName}</p>
      </div>
      {badge && (
        <span
          className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-semibold"
          style={{ backgroundColor: `${badge.color}22`, color: badge.color }}
        >
          {badge.label}
        </span>
      )}
      <ExternalLink size={12} className="shrink-0 text-[#A8A6A0]" />
    </Link>
  );
}

function GuestListPanel() {
  const [page, setPage] = useState(1);
  const { data, isLoading } = useGuestList(page, true);

  return (
    <div className="mt-3 rounded-xl border border-border bg-card-inner overflow-hidden">
      {isLoading ? (
        <p className="p-4 text-sm text-[#A8A6A0]">Yükleniyor...</p>
      ) : !data || data.data.length === 0 ? (
        <p className="p-4 text-sm text-[#A8A6A0]">Guest rollü kullanıcı yok.</p>
      ) : (
        <div className="divide-y divide-border">
          {data.data.map((g) => (
            <Link
              key={g.id}
              href={`/profile/${g.id}`}
              className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-accent transition-colors"
            >
              <div>
                <p className="text-sm font-medium text-[#F5F1EA]">
                  {g.fullName} <span className="text-xs font-normal text-[#A8A6A0]">@{g.username}</span>
                </p>
                <p className="text-xs text-[#A8A6A0]">
                  {g.email ?? "—"} {g.phone ? `· ${g.phone}` : ""} · kayıt: {new Date(g.createdAt).toLocaleDateString("tr-TR")}
                </p>
              </div>
              <ExternalLink size={14} className="shrink-0 text-[#A8A6A0]" />
            </Link>
          ))}
        </div>
      )}
      {data && data.pagination.totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-border p-3">
          {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              type="button"
              onClick={() => setPage(p)}
              className={`size-8 rounded-lg text-xs font-medium ${
                p === page ? "bg-primary text-white" : "bg-card text-[#A8A6A0]"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AnalyticsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [showGuests, setShowGuests] = useState(false);
  const { data: visitors, isLoading: visitorsLoading } = useVisitorStats();
  const { data: roleCounts, isLoading: rolesLoading } = useRoleCounts();
  const { data: activeUsers, isLoading: activeLoading } = useActiveUsers();

  if (authLoading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6">
        <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
      </div>
    );
  }
  if (user?.role !== "STAFF" && user?.role !== "SUPER_ADMIN") {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-[#A8A6A0]">Bu sayfaya erişim yetkin yok.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F1EA]">Trafik &amp; Aktif Kullanıcılar</h1>
        <p className="text-sm text-[#A8A6A0]">Ziyaretçi istatistikleri, kayıtlı rol dağılımı ve şu an aktif olanlar.</p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#F5F1EA]">
          <Eye size={16} /> Giriş Yapmamış Ziyaretçiler
        </h2>
        <p className="mt-1 text-xs text-[#A8A6A0]">
          Sadece hesapsız/giriş yapmamış tarayıcı ziyaretlerini sayar — giriş yapmış hiçbir rol (Guest dahil) dahil değildir.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatBox label="Bugün" value={visitorsLoading ? undefined : visitors?.today} />
          <StatBox label="Bu Hafta" value={visitorsLoading ? undefined : visitors?.week} />
          <StatBox label="Bu Ay" value={visitorsLoading ? undefined : visitors?.month} />
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#F5F1EA]">
          <Users size={16} /> Kayıtlı Kullanıcı Dağılımı
        </h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatBox label="Öğrenci" value={rolesLoading ? undefined : roleCounts?.STUDENT} />
          <StatBox label="Eğitmen (Staff)" value={rolesLoading ? undefined : roleCounts?.STAFF} />
          <StatBox label="Yönetici" value={rolesLoading ? undefined : roleCounts?.SUPER_ADMIN} />
          <button type="button" onClick={() => setShowGuests((s) => !s)} className="text-left">
            <div className="rounded-xl border border-border bg-card-inner p-4 hover:border-primary transition-colors">
              <p className="text-2xl font-semibold text-[#F5F1EA]">{rolesLoading ? "—" : roleCounts?.GUEST}</p>
              <p className="text-xs text-[#A8A6A0]">Guest (satın almamış)</p>
            </div>
          </button>
        </div>
        <p className="mt-2 text-[11px] text-[#A8A6A0]">
          Guest sayısına tıklayarak tam listeyi görüntüleyip duyuru/e-posta/SMS ile satın almaya davet için kullanabilirsiniz.
        </p>
        {showGuests && <GuestListPanel />}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-[#F5F1EA]">
          <Radio size={16} className="text-[#22C55E]" /> Şu An Aktif Olanlar {activeUsers && `(${activeUsers.length})`}
        </h2>
        <p className="mt-1 text-xs text-[#A8A6A0]">
          Sıralama: önce staff/yönetici, sonra kadın öğrenciler, sonra erkek öğrenciler, en altta guest rollü kullanıcılar.
        </p>
        <div className="mt-4 space-y-1.5">
          {activeLoading ? (
            <p className="text-sm text-[#A8A6A0]">Yükleniyor...</p>
          ) : !activeUsers || activeUsers.length === 0 ? (
            <p className="text-sm text-[#A8A6A0]">Şu an aktif kullanıcı yok.</p>
          ) : (
            activeUsers.map((u) => <ActiveUserRow key={u.id} u={u} />)
          )}
        </div>
      </div>
    </div>
  );
}
