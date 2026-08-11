"use client";
import { useState } from "react";
import { cn } from "@/lib/utils";

// Fotoğrafı olmayan (veya yüklenemeyen) kişiler için baş harf rozetine düşer -
// success-stories-content.tsx'teki aynı fallback deseni.
export function LegendAvatar({
  name,
  photoUrl,
  size = "sm",
}: {
  name: string;
  photoUrl: string | null;
  size?: "sm" | "lg";
}) {
  const [failed, setFailed] = useState(false);
  const showPhoto = photoUrl && !failed;
  const dims = size === "lg" ? "size-28 sm:size-36" : "size-11";
  const textClass = size === "lg" ? "text-h1" : "text-body-sm";

  if (showPhoto) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl}
        alt={name}
        onError={() => setFailed(true)}
        className={cn(dims, "shrink-0 rounded-full border border-border object-cover")}
      />
    );
  }

  return (
    <div
      className={cn(
        dims,
        textClass,
        "flex shrink-0 items-center justify-center rounded-full bg-primary/15 font-medium text-primary"
      )}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}
