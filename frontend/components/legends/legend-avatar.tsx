"use client";
import { useState } from "react";
import Image from "next/image";
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
      <div className={cn(dims, "relative shrink-0 overflow-hidden rounded-full border border-border")}>
        {/* unoptimized: next/image'ın local optimizer'ı bu projede basePath ("/core")
            ile dahili self-fetch yaparken 400 dönüyor (bkz. hero-background.tsx). */}
        <Image
          src={photoUrl}
          alt={name}
          fill
          unoptimized
          sizes={size === "lg" ? "144px" : "44px"}
          onError={() => setFailed(true)}
          className="object-cover"
        />
      </div>
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
