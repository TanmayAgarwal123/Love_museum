"use client";

import { useRef, useState } from "react";
import { sim } from "@/lib/store";

const R = 52;

/** Thumb joystick for touch screens. Writes straight into the simulation. */
export function MobileJoystick() {
  const base = useRef<HTMLDivElement>(null);
  const id = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });

  const update = (cx: number, cy: number) => {
    const r = base.current!.getBoundingClientRect();
    let dx = cx - (r.left + r.width / 2);
    let dy = cy - (r.top + r.height / 2);
    const d = Math.hypot(dx, dy);
    if (d > R) {
      dx = (dx / d) * R;
      dy = (dy / d) * R;
    }
    setKnob({ x: dx, y: dy });
    sim.joy.x = dx / R;
    sim.joy.y = -dy / R;
    sim.target = null;
  };
  const end = () => {
    id.current = null;
    setKnob({ x: 0, y: 0 });
    sim.joy.x = sim.joy.y = 0;
  };

  return (
    <div
      ref={base}
      role="application"
      aria-label="Movement joystick: drag to walk"
      className="relative w-[128px] h-[128px] rounded-full bg-[rgba(251,249,246,0.55)] touch-none select-none"
      onPointerDown={(e) => {
        id.current = e.pointerId;
        e.currentTarget.setPointerCapture(e.pointerId);
        update(e.clientX, e.clientY);
      }}
      onPointerMove={(e) => id.current === e.pointerId && update(e.clientX, e.clientY)}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="absolute left-1/2 top-1/2 w-14 h-14 -ml-7 -mt-7 rounded-full bg-[#fbf9f6] shadow-md"
        style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
      />
    </div>
  );
}
