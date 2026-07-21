"use client";

import { useEffect } from "react";
import { ErrorCard } from "@/components/errors/error-card";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return <ErrorCard code="500" onRetry={reset} />;
}
