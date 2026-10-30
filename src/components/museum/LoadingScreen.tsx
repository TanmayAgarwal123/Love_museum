"use client";

import { useProgress } from "@react-three/drei";
import { useEffect, useState } from "react";
import { HeartFill } from "@/components/ui/icons";

/** Shows texture loading progress, then fades away. */
export function LoadingScreen({ started }: { started: boolean }) {
  const { progress, active, total } = useProgress();
  const [minTimePassed, setMinTimePassed] = useState(false);
  const [gone, setGone] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMinTimePassed(true), 1100);
    return () => clearTimeout(t);
  }, []);

  const done = started && minTimePassed && !active && (total === 0 || progress >= 100);

  useEffect(() => {
    if (!done) return;
    const t = setTimeout(() => setGone(true), 600);
    return () => clearTimeout(t);
  }, [done]);

  // Never trap the visitor: give up waiting after 12s.
  useEffect(() => {
    const t = setTimeout(() => setGone(true), 12000);
    return () => clearTimeout(t);
  }, []);

  if (gone) return null;
  const pct = Math.round(total === 0 ? (started ? 100 : 10) : progress);

  return (
    <div
      className="absolute inset-0 z-30 grid place-items-center bg-paper transition-opacity duration-500"
      style={{ opacity: done ? 0 : 1 }}
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center text-center px-6">
        <HeartFill size={56} className="text-blush anim-beat" />
        <p className="display mt-6 text-3xl sm:text-4xl">Preparing your museum…</p>
        <div className="mt-6 h-1.5 w-56 rounded-full bg-stone overflow-hidden" aria-hidden>
          <div className="h-full bg-rose transition-[width] duration-300" style={{ width: `${pct}%` }} />
        </div>
        <p className="mt-3 text-sm text-ink-soft tabular-nums">Hanging the photos · {pct}%</p>
      </div>
    </div>
  );
}
