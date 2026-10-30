"use client";

import { useEffect, useRef, useState } from "react";
import { HeartFill } from "./ui/icons";

export function PasscodeGate({
  expected,
  partnerName,
  isDemo,
  onUnlock,
}: {
  expected: string;
  partnerName: string;
  isDemo?: boolean;
  onUnlock: () => void;
}) {
  const [digits, setDigits] = useState(["", "", "", ""]);
  const [error, setError] = useState(false);
  const refs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => refs.current[0]?.focus(), []);

  const check = (d: string[]) => {
    const code = d.join("");
    if (code.length < 4) return;
    if (code === expected) onUnlock();
    else {
      setError(true);
      setDigits(["", "", "", ""]);
      refs.current[0]?.focus();
    }
  };

  const setAt = (i: number, v: string) => {
    const clean = v.replace(/\D/g, "");
    if (clean.length > 1) {
      // pasted the whole code
      const next = clean.slice(0, 4).split("");
      while (next.length < 4) next.push("");
      setDigits(next);
      check(next);
      return;
    }
    const next = [...digits];
    next[i] = clean;
    setDigits(next);
    setError(false);
    if (clean && i < 3) refs.current[i + 1]?.focus();
    check(next);
  };

  return (
    <main className="min-h-[100svh] grid place-items-center px-[var(--gutter)] anim-fade">
      <form
        className="w-full max-w-sm text-center"
        onSubmit={(e) => {
          e.preventDefault();
          check(digits);
        }}
      >
        <HeartFill size={40} className="mx-auto text-blush anim-beat" />
        <h1 className="mt-6 text-4xl sm:text-5xl">Just for {partnerName}</h1>
        <p className="mt-4 text-ink-soft" id="pass-hint">
          Enter the 4-digit passcode{isDemo ? " (it's 1234 in the demo)" : ""}.
        </p>
        <fieldset className="mt-8 flex justify-center gap-3">
          <legend className="sr-only">Passcode</legend>
          {digits.map((d, i) => (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={d}
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={i === 0 ? 4 : 1}
              aria-label={`Digit ${i + 1}`}
              aria-describedby="pass-hint"
              aria-invalid={error}
              onChange={(e) => setAt(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Backspace" && !digits[i] && i > 0) refs.current[i - 1]?.focus();
              }}
              className={`w-14 h-16 text-center text-2xl font-semibold rounded-lg bg-stone text-ink outline-none focus-visible:ring-2 focus-visible:ring-rose ${error ? "ring-2 ring-rose" : ""}`}
            />
          ))}
        </fieldset>
        <p className="mt-4 min-h-6 text-rose font-medium" role="alert">
          {error ? "Not quite. Try again." : ""}
        </p>
        <button type="submit" className="btn btn-primary mt-2 w-full">Unlock</button>
      </form>
    </main>
  );
}
