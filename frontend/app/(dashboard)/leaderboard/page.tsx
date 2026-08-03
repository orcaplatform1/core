"use client";

import Link from "next/link";
import { Trophy, Medal } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useLeaderboard } from "@/lib/hooks/use-points";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const RANK_COLORS: Record<number, string> = {
  1: "#F5C542",
  2: "#C0C0C0",
  3: "#CD7F32",
};

export default function LeaderboardPage() {
  const { user } = useAuth();
  const { data: leaderboard, isLoading } = useLeaderboard();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Liderlik Tablosu</h1>
        <p className="text-sm text-muted-foreground">
          Bu haftaki puan sıralaması — her Pazartesi 00:00'da sıfırlanır. Puan kazanmak için ders
          tamamla, quiz geç, rozet kazan ve serini sürdür.
        </p>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Yükleniyor...</p>
        ) : !leaderboard || leaderboard.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Bu hafta henüz kimse puan kazanmadı — ilk sırayı sen al!
          </p>
        ) : (
          <div className="space-y-2">
            {leaderboard.map((entry) => {
              const isMe = entry.id === user?.id;
              return (
                <div
                  key={entry.id}
                  className={`flex items-center gap-4 rounded-xl px-4 py-3 transition-colors ${
                    isMe ? "border border-primary/30 bg-primary/10" : "hover:bg-card-hover"
                  }`}
                >
                  <div className="flex w-8 shrink-0 items-center justify-center">
                    {entry.rank <= 3 ? (
                      <Medal className="size-5" style={{ color: RANK_COLORS[entry.rank] }} />
                    ) : (
                      <span className="text-sm font-semibold text-muted-foreground">{entry.rank}</span>
                    )}
                  </div>
                  <Avatar className="size-9">
                    <AvatarImage src={entry.avatarUrl ?? undefined} alt={entry.fullName} />
                    <AvatarFallback>{entry.fullName?.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <Link
                      href={`/profile/${entry.id}`}
                      className="truncate text-sm font-medium text-foreground hover:text-primary hover:underline"
                    >
                      {entry.fullName} {isMe && <span className="text-xs text-primary">(sen)</span>}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">@{entry.username}</p>
                  </div>
                  <div className="flex items-center gap-1.5 text-sm font-bold text-primary">
                    <Trophy className="size-3.5" />
                    {entry.periodPoints}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
