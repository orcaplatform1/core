"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Ban } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useIssueSuspension } from "@/lib/hooks/use-suspensions";

const DURATION_OPTIONS = [
  { days: 1 as const, label: "1 Gün" },
  { days: 3 as const, label: "3 Gün" },
  { days: 7 as const, label: "1 Hafta" },
];

export function SuspendUserButton({
  userId,
  userName,
  type,
  reason,
}: {
  userId: string;
  userName: string;
  type: "COMMENT" | "DM";
  reason?: string;
}) {
  const [open, setOpen] = useState(false);
  const [reasonText, setReasonText] = useState(reason ?? "");
  const issue = useIssueSuspension();

  async function handleIssue(days: 1 | 3 | 7) {
    try {
      await issue.mutateAsync({ userId, type, days, reason: reasonText.trim() || undefined });
      toast.success(`${userName} kullanıcısına ${days} gün ${type === "COMMENT" ? "yorum" : "mesajlaşma"} yasağı verildi`);
      setOpen(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Yasak verilemedi");
    }
  }

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        className="text-[#EF4444] hover:bg-[#EF444422]"
        onClick={() => setOpen((o) => !o)}
      >
        <Ban size={14} className="mr-1" />
        Kullanıcıyı Yasakla
      </Button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full z-20 mt-1 w-64 rounded-xl border border-border bg-card p-2 shadow-lg">
            <textarea
              value={reasonText}
              onChange={(e) => setReasonText(e.target.value)}
              rows={2}
              placeholder="Neden yasaklandığını yazın (opsiyonel)..."
              className="w-full resize-none rounded-lg border border-border bg-card-inner p-2 text-xs text-[#F5F1EA] placeholder:text-[#A8A6A0] focus:outline-none"
            />
            <div className="mt-1.5 flex flex-col gap-1">
              {DURATION_OPTIONS.map((opt) => (
                <button
                  key={opt.days}
                  type="button"
                  disabled={issue.isPending}
                  onClick={() => handleIssue(opt.days)}
                  className="whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-xs font-medium text-[#F5F1EA] transition-colors duration-200 hover:bg-[#EF444422] hover:text-[#EF4444]"
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
