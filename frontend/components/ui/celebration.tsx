"use client";

import { useCallback, useRef, useState } from "react";
import { useCelebrationListener } from "@/lib/hooks/use-celebration";

const COLORS = ["#32D66B", "#22C55E", "#FFFFFF", "#F5C542"];
const PARTICLE_COUNT = 28;

interface Particle {
  id: number;
  left: number;
  rotate: number;
  duration: number;
  delay: number;
  color: string;
  width: number;
  height: number;
}

export function CelebrationOverlay() {
  const [particles, setParticles] = useState<Particle[]>([]);
  const idRef = useRef(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const trigger = useCallback(() => {
    const batch: Particle[] = Array.from({ length: PARTICLE_COUNT }, () => {
      idRef.current += 1;
      return {
        id: idRef.current,
        left: Math.random() * 100,
        rotate: Math.random() * 360,
        duration: 0.9 + Math.random() * 0.6,
        delay: Math.random() * 0.2,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        width: 6 + Math.random() * 6,
        height: 3 + Math.random() * 4,
      };
    });
    setParticles(batch);
    clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setParticles([]), 1700);
  }, []);

  useCelebrationListener(trigger);

  if (particles.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[9999] overflow-hidden">
      {particles.map((p) => (
        <span
          key={p.id}
          className="celebration-particle absolute top-0 rounded-sm"
          style={
            {
              left: `${p.left}%`,
              width: p.width,
              height: p.height,
              backgroundColor: p.color,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              "--celebration-rotate": `${p.rotate}deg`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}
