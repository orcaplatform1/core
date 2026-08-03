"use client";

import { useState } from "react";
import { Smile } from "lucide-react";

const QUICK_EMOJIS = ["😀", "😂", "😍", "👍", "👎", "🔥", "🎉", "🙏", "😢", "😮", "❤️", "💯", "🚀", "👏", "🤔", "😅"];

export function EmojiPickerButton({ onPick }: { onPick: (emoji: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="rounded-lg p-2 text-muted-foreground transition-colors duration-200 hover:bg-accent hover:text-foreground"
        aria-label="Emoji ekle"
      >
        <Smile className="size-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute bottom-full left-1/2 z-50 mb-2 w-64 max-w-[80vw] -translate-x-1/2 rounded-xl border border-border bg-card p-2 shadow-lg">
            <div className="grid grid-cols-6 gap-1">
              {QUICK_EMOJIS.map((e) => (
                <button
                  key={e}
                  type="button"
                  onClick={() => {
                    onPick(e);
                    setOpen(false);
                  }}
                  className="flex size-9 items-center justify-center rounded-md text-lg leading-none transition-colors duration-200 hover:bg-accent"
                >
                  {e}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
