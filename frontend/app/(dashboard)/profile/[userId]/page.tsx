"use client";

import { use } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { UserX, UserCheck, MessageCircle, Flame, Award, Briefcase, ShieldAlert, GraduationCap, LineChart, TrendingUp } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api-client";
import { usePublicProfile, useBlockUser, useUnblockUser } from "@/lib/hooks/use-profile";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";

const ROLE_LABELS: Record<string, string> = {
  STUDENT: "Öğrenci",
  STAFF: "Yetkili",
  SUPER_ADMIN: "Kurucu",
  GUEST: "Misafir",
};

const OCCUPATION_LABELS: Record<string, string> = {
  OGRENCI: "Öğrenci",
  ISSIZ: "Çalışmıyor",
  SERBEST_MESLEK: "Serbest Meslek",
  OZEL_SEKTOR: "Özel Sektör Çalışanı",
  KAMU: "Kamu Çalışanı",
  YONETICI: "Yönetici",
};

export default function PublicProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId } = use(params);
  const { user: me } = useAuth();
  const { data: profile, isLoading, error } = usePublicProfile(userId);
  const block = useBlockUser();
  const unblock = useUnblockUser();

  if (isLoading) {
    return <div className="h-96 animate-pulse rounded-2xl bg-card" />;
  }

  if (error instanceof ApiError && error.status === 403) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <UserX size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-muted-foreground">Bu kullanıcı sizi engellediği için profiline erişemezsiniz.</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-border bg-card p-8 text-center space-y-2">
        <ShieldAlert size={32} color="#EF4444" className="mx-auto" />
        <p className="text-sm text-muted-foreground">Bu kullanıcı bulunamadı.</p>
      </div>
    );
  }

  const isOwnProfile = me?.id === profile.id;
  const isStaffOrAdmin = profile.role === "STAFF" || profile.role === "SUPER_ADMIN";

  async function handleBlock() {
    try {
      await block.mutateAsync(userId);
      toast.success(`${profile!.fullName} engellendi`);
    } catch (err: any) {
      toast.error(err?.message ?? "Engellenemedi");
    }
  }

  async function handleUnblock() {
    try {
      await unblock.mutateAsync(userId);
      toast.success("Engel kaldırıldı");
    } catch (err: any) {
      toast.error(err?.message ?? "Engel kaldırılamadı");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="glow-primary rounded-2xl border border-border bg-card p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="relative shrink-0">
            <Avatar className="size-20 ring-2 ring-primary/25">
              <AvatarImage src={profile.avatarUrl ?? undefined} alt={profile.fullName} />
              <AvatarFallback className="text-xl">{profile.fullName?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <span
              className={`absolute bottom-0.5 right-0.5 size-4 rounded-full border-2 border-card ${
                profile.online ? "bg-[#22C55E]" : "bg-[#EF4444]"
              }`}
              title={profile.online ? "Çevrimiçi" : "Çevrimdışı"}
            />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-foreground">{profile.fullName}</h1>
              <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-semibold text-primary">
                {ROLE_LABELS[profile.role] ?? profile.role}
              </span>
            </div>
            {profile.username && <p className="text-sm text-muted-foreground">@{profile.username}</p>}
            <p className="mt-1 text-xs text-muted-foreground">
              {new Date(profile.createdAt).toLocaleDateString("tr-TR", { year: "numeric", month: "long" })}
              'den beri üye
            </p>
            {profile.occupation && (
              <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Briefcase className="size-3" /> {OCCUPATION_LABELS[profile.occupation] ?? profile.occupation}
                </span>
              </div>
            )}
          </div>

          {!isOwnProfile && (
            <div className="flex flex-col gap-2">
              {!profile.hasBlockedMe && !profile.isBlockedByMe && (
                <Button
                  render={<Link href={`/messages?to=${profile.id}`} />}
                  className="h-9"
                >
                  <MessageCircle size={14} className="mr-1.5" />
                  Mesaj Gönder
                </Button>
              )}
              {!isStaffOrAdmin &&
                (profile.isBlockedByMe ? (
                  <Button variant="outline" className="h-9" disabled={unblock.isPending} onClick={handleUnblock}>
                    <UserCheck size={14} className="mr-1.5" />
                    Engeli Kaldır
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    className="h-9 text-[#EF4444] hover:bg-[#EF444422]"
                    disabled={block.isPending}
                    onClick={handleBlock}
                  >
                    <UserX size={14} className="mr-1.5" />
                    Engelle
                  </Button>
                ))}
            </div>
          )}
        </div>

        {profile.hasBlockedMe && (
          <p className="mt-4 rounded-lg border border-[#EF444440] bg-[#EF444411] p-3 text-xs text-[#EF4444]">
            Bu kullanıcı sizi engellemiş, kendisine mesaj gönderemezsiniz.
          </p>
        )}
        {profile.isBlockedByMe && (
          <p className="mt-4 rounded-lg border border-[#EF444440] bg-[#EF444411] p-3 text-xs text-[#EF4444]">
            Bu kullanıcıyı engellediniz, kendisine mesaj gönderemezsiniz. Mesajlaşmak için engeli kaldırın.
          </p>
        )}
      </div>

      {!isStaffOrAdmin && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <Flame className="mx-auto size-5 text-[#F39C3D]" />
              <p className="mt-1 text-lg font-bold text-foreground">{profile.currentStreak}</p>
              <p className="text-[11px] text-muted-foreground">Güncel Seri</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <Flame className="mx-auto size-5 text-[#EF4444]" />
              <p className="mt-1 text-lg font-bold text-foreground">{profile.longestStreak}</p>
              <p className="text-[11px] text-muted-foreground">En Uzun Seri</p>
            </div>
            <div className="rounded-2xl border border-border bg-card p-4 text-center">
              <Award className="mx-auto size-5 text-primary" />
              <p className="mt-1 text-lg font-bold text-foreground">{profile.userBadges.length}</p>
              <p className="text-[11px] text-muted-foreground">Rozet</p>
            </div>
          </div>

          {profile.performance && !profile.performance.locked && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Genel Finans Skoru" value={profile.performance.overallScore} icon={Award} accent="primary" />
              <StatCard
                label="Eğitim Tamamlama"
                value={`%${profile.performance.educationCompletionRate}`}
                icon={GraduationCap}
                accent="success"
              />
              <StatCard label="Quiz Başarı Oranı" value={`%${profile.performance.quizSuccessRate}`} icon={LineChart} accent="warning" />
              <StatCard
                label="Backtest Başarı Oranı"
                value={`%${profile.performance.backtestSuccessRate}`}
                icon={TrendingUp}
                accent="purple"
              />
            </div>
          )}

          {profile.userBadges.length > 0 && (
            <div className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold text-foreground">Rozetler</h3>
              <div className="mt-3 flex flex-wrap gap-3">
                {profile.userBadges.map((ub, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-xl border border-border bg-card-inner px-3 py-2">
                    {ub.badge.iconUrl && <img src={ub.badge.iconUrl} alt="" className="size-6" />}
                    <span className="text-xs font-medium text-foreground">{ub.badge.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
