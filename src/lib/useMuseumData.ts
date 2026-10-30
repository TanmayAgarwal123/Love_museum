"use client";

import { useEffect, useState } from "react";
import { repo, resolveMuseum } from "./repo";
import type { Museum } from "./types";

export type LoadState =
  | { status: "loading" }
  | { status: "missing" }
  | { status: "ready"; museum: Museum };

/** Load a museum by slug and resolve all of its media references. */
export function useMuseumData(slug: string): LoadState {
  const [state, setState] = useState<LoadState>({ status: "loading" });
  useEffect(() => {
    let alive = true;
    (async () => {
      const m = await repo.get(slug);
      if (!alive) return;
      if (!m) return setState({ status: "missing" });
      const resolved = await resolveMuseum(m);
      if (alive) setState({ status: "ready", museum: resolved });
    })().catch(() => alive && setState({ status: "missing" }));
    return () => {
      alive = false;
    };
  }, [slug]);
  return state;
}

const UNLOCK_KEY = "museum-of-us:unlocked";
export function isUnlocked(slug: string) {
  try {
    return (JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || "[]") as string[]).includes(slug);
  } catch {
    return false;
  }
}
export function markUnlocked(slug: string) {
  try {
    const list = JSON.parse(sessionStorage.getItem(UNLOCK_KEY) || "[]") as string[];
    sessionStorage.setItem(UNLOCK_KEY, JSON.stringify([...new Set([...list, slug])]));
  } catch {
    /* ignore */
  }
}
