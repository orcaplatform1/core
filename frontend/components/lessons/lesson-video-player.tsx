"use client";

import { useRef, useState, useCallback, useEffect } from "react";
import ReactPlayer from "react-player";
import { toast } from "sonner";
import { CheckCircle2 } from "lucide-react";
import { useUpdateWatchProgress } from "@/lib/hooks/use-curriculum";
import { useAuth } from "@/context/auth-context";

const SEND_INTERVAL_SECONDS = 10;
const WATERMARK_MOVE_INTERVAL_MS = 7000;

function maskEmail(email?: string) {
  if (!email) return "";
  const [name, domain] = email.split("@");
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${"*".repeat(Math.max(name.length - 2, 2))}@${domain}`;
}

function VideoWatermark() {
  const { user } = useAuth();
  const [pos, setPos] = useState({ top: 10, left: 10 });

  useEffect(() => {
    const id = setInterval(() => {
      setPos({
        top: 8 + Math.random() * 78,
        left: 8 + Math.random() * 70,
      });
    }, WATERMARK_MOVE_INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  if (!user) return null;

  const identity = user.fullName || user.username;
  const contact = maskEmail(user.email) || user.phone || "";
  const sessionTag = user.sessionId ? user.sessionId.slice(0, 6) : user.id.slice(0, 6);

  return (
    <div
      className="pointer-events-none absolute select-none rounded-md bg-black/35 px-2.5 py-1 text-[11px] font-medium text-white/70 backdrop-blur-[1px] transition-all duration-[1200ms] ease-in-out"
      style={{ top: `${pos.top}%`, left: `${pos.left}%` }}
    >
      {identity} {contact && `· ${contact}`} · {sessionTag}
    </div>
  );
}

export function LessonVideoPlayer({
  lessonId,
  videoUrl,
  initialCompleted,
}: {
  lessonId: string;
  videoUrl: string;
  initialCompleted: boolean;
}) {
  const { mutate: sendProgress } = useUpdateWatchProgress();
  const maxWatchedRef = useRef(0);
  const lastSentRef = useRef(0);
  const [completed, setCompleted] = useState(initialCompleted);

  const persist = useCallback(
    (seconds: number) => {
      sendProgress(
        { lessonId, watchedSeconds: Math.round(seconds) },
        {
          onSuccess: (data) => {
            if (data.completed && !completed) {
              setCompleted(true);
              toast.success("Ders tamamlandı! 🎉");
            }
          },
        }
      );
    },
    [lessonId, sendProgress, completed]
  );

  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const current = e.currentTarget.currentTime;
    if (current > maxWatchedRef.current) {
      maxWatchedRef.current = current;
    }
    if (maxWatchedRef.current - lastSentRef.current >= SEND_INTERVAL_SECONDS) {
      lastSentRef.current = maxWatchedRef.current;
      persist(maxWatchedRef.current);
    }
  };

  const handlePauseOrEnd = () => {
    if (maxWatchedRef.current > lastSentRef.current) {
      lastSentRef.current = maxWatchedRef.current;
      persist(maxWatchedRef.current);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative aspect-video w-full overflow-hidden rounded-2xl border border-border bg-black"
        onContextMenu={(e) => e.preventDefault()}
      >
        <ReactPlayer
          src={videoUrl}
          width="100%"
          height="100%"
          controls
          onTimeUpdate={handleTimeUpdate}
          onPause={handlePauseOrEnd}
          onEnded={handlePauseOrEnd}
        />
        <VideoWatermark />
      </div>
      {completed && (
        <div className="flex items-center gap-2 text-sm font-medium text-success">
          <CheckCircle2 className="size-4" />
          Bu dersi tamamladın
        </div>
      )}
    </div>
  );
}
