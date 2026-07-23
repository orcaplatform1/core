"use client";
import { useState } from "react";
import { Flame, Trophy, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { useMyBadges, useUpdateStreakGoal } from "@/lib/hooks/use-badges";

export default function BadgesPage() {
  const { user, refreshUser } = useAuth();
  const { data: badges, isLoading: badgesLoading } = useMyBadges();
  const updateGoal = useUpdateStreakGoal();

  const currentStreak = Number(user?.currentStreak ?? 0);
  const longestStreak = Number(user?.longestStreak ?? 0);
  const streakGoalDays = Number(user?.streakGoalDays ?? 30);

  const [goalInput, setGoalInput] = useState<string>(String(streakGoalDays));
  const [editingGoal, setEditingGoal] = useState(false);

  const progressPct = streakGoalDays > 0 ? Math.min(100, Math.round((currentStreak / streakGoalDays) * 100)) : 0;

  async function handleSaveGoal() {
    const val = parseInt(goalInput, 10);
    if (!val || val < 1) {
      toast.error("Geçerli bir gün sayısı gir");
      return;
    }
    try {
      await updateGoal.mutateAsync(val);
      await refreshUser();
      toast.success("Hedef güncellendi");
      setEditingGoal(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Güncellenemedi");
    }
  }

  const earnedCount = badges?.filter((b) => !b.locked).length ?? 0;
  const totalCount = badges?.length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-[#F5F8FF]">Rozetler & Seri</h1>
        <p className="text-sm text-[#8D9BB6]">
          Öğrenme serini takip et, hedeflerine ulaş ve rozetler kazan.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F39C3D22]">
            <Flame size={28} color="#F39C3D" />
          </div>
          <div>
            <p className="text-3xl font-semibold text-[#F5F8FF]">{currentStreak} gün</p>
            <p className="text-sm text-[#8D9BB6]">Mevcut seri</p>
          </div>
          <div className="ml-auto text-right">
            <p className="text-lg font-medium text-[#F5F8FF]">{longestStreak} gün</p>
            <p className="text-xs text-[#8D9BB6]">En uzun seri</p>
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs text-[#8D9BB6]">
            <span>Hedef: {streakGoalDays} gün</span>
            <span>{progressPct}%</span>
          </div>
          <div className="h-2 w-full rounded-full bg-card-inner overflow-hidden">
            <div
              className="h-full rounded-full bg-[#F39C3D] transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>

        {editingGoal ? (
          <div className="flex items-center gap-2">
            <input
              type="number"
              min={1}
              value={goalInput}
              onChange={(e) => setGoalInput(e.target.value)}
              className="w-24 rounded-xl border border-border bg-card-inner px-3 py-1.5 text-sm text-[#D7E1F8] outline-none focus:border-primary"
            />
            <Button size="sm" disabled={updateGoal.isPending} onClick={handleSaveGoal}>
              Kaydet
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setEditingGoal(false)}>
              İptal
            </Button>
          </div>
        ) : (
          <button
            onClick={() => {
              setGoalInput(String(streakGoalDays));
              setEditingGoal(true);
            }}
            className="text-xs text-primary hover:underline"
          >
            Hedefi Düzenle
          </button>
        )}
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-medium text-[#F5F8FF]">Rozetler</h2>
          <span className="text-sm text-[#8D9BB6]">
            {earnedCount}/{totalCount}
          </span>
        </div>

        {badgesLoading ? (
          <p className="text-sm text-[#8D9BB6]">Yükleniyor...</p>
        ) : !badges || badges.length === 0 ? (
          <p className="text-sm text-[#8D9BB6]">Henüz rozet tanımlanmamış.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {badges.map((badge) => (
              <div
                key={badge.id}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card-inner p-4 text-center"
                style={{ opacity: badge.locked ? 0.5 : 1 }}
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                  style={{ backgroundColor: badge.locked ? "#22355422" : "#32D66B22" }}
                >
                  {badge.locked ? (
                    <Lock size={20} color="#8D9BB6" />
                  ) : (
                    <Trophy size={20} color="#32D66B" />
                  )}
                </div>
                <p className="text-sm font-medium text-[#F5F8FF]">{badge.name}</p>
                <p className="text-xs text-[#8D9BB6]">{badge.description}</p>
                {!badge.locked && badge.earnedAt && (
                  <p className="flex items-center gap-1 text-[10px] text-[#32D66B]">
                    <Check size={10} />
                    {new Date(badge.earnedAt).toLocaleDateString("tr-TR")}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
