"use client";

import { useEffect } from "react";

type Listener = () => void;

const listeners = new Set<Listener>();

// Herhangi bir bileşenden çağrılabilen global tetikleyici — Provider gerektirmez,
// sonner'ın toast() çağrısıyla aynı desen (React ağacı dışından tetiklenebilir).
export function celebrate() {
  listeners.forEach((listener) => listener());
}

export function useCelebrationListener(onCelebrate: Listener) {
  useEffect(() => {
    listeners.add(onCelebrate);
    return () => {
      listeners.delete(onCelebrate);
    };
  }, [onCelebrate]);
}
