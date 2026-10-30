"use client";

import { DEMO_MUSEUM } from "./demo";
import { OUR_MUSEUM } from "./ourMuseum";
import type { MediaRef, Museum } from "./types";

/**
 * Storage boundary. Everything in the app talks to `repo`, never to
 * localStorage / IndexedDB directly, so a Supabase or Firebase implementation
 * can be dropped in by writing another `MuseumRepository` and exporting it.
 *
 *   - museums: JSON documents keyed by slug  (Supabase: a `museums` table)
 *   - media:   blobs referenced by MediaRef  (Supabase: a storage bucket)
 */
export interface MuseumRepository {
  list(): Promise<Museum[]>;
  get(slug: string): Promise<Museum | null>;
  save(museum: Museum): Promise<void>;
  remove(slug: string): Promise<void>;
  /** Persist a blob and return a reference that can be stored in a Museum. */
  putMedia(blob: Blob): Promise<MediaRef>;
  /** Turn a reference into something an <img>/<video>/texture can load. */
  resolveMedia(ref: MediaRef): Promise<string>;
}

const LS_KEY = "museum-of-us:museums:v1";
const DB_NAME = "museum-of-us";
const STORE = "media";

function readAll(): Record<string, Museum> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, Museum>) : {};
  } catch {
    return {};
  }
}

function writeAll(all: Record<string, Museum>) {
  localStorage.setItem(LS_KEY, JSON.stringify(all));
}

function seedIfEmpty() {
  const all = readAll();
  if (!all[DEMO_MUSEUM.slug]) {
    all[DEMO_MUSEUM.slug] = DEMO_MUSEUM;
    try {
      writeAll(all);
    } catch {
      /* storage full or blocked: the demo is still served from memory */
    }
  }
  return all;
}

let dbPromise: Promise<IDBDatabase> | null = null;
function db(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => req.result.createObjectStore(STORE);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
}

function idbRequest<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest): Promise<T> {
  return db().then(
    (d) =>
      new Promise<T>((resolve, reject) => {
        const tx = d.transaction(STORE, mode);
        const req = fn(tx.objectStore(STORE));
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error);
      }),
  );
}

const urlCache = new Map<string, string>();

export const localRepository: MuseumRepository = {
  async list() {
    return Object.values(seedIfEmpty()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },
  async get(slug) {
    // Built into the site from src/content/museum.config.ts, so it opens on any device.
    if (slug === OUR_MUSEUM.slug) return OUR_MUSEUM;
    if (slug === DEMO_MUSEUM.slug) {
      // The demo always reflects the code (so edits to demo.ts show up).
      seedIfEmpty();
      return DEMO_MUSEUM;
    }
    return readAll()[slug] ?? null;
  },
  async save(museum) {
    const all = readAll();
    all[museum.slug] = museum;
    writeAll(all);
  },
  async remove(slug) {
    const all = readAll();
    delete all[slug];
    writeAll(all);
  },
  async putMedia(blob) {
    const key = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    await idbRequest("readwrite", (s) => s.put(blob, key));
    return `idb:${key}`;
  },
  async resolveMedia(ref) {
    if (!ref.startsWith("idb:")) return ref;
    const cached = urlCache.get(ref);
    if (cached) return cached;
    const blob = await idbRequest<Blob | undefined>("readonly", (s) => s.get(ref.slice(4)));
    if (!blob) return "";
    const url = URL.createObjectURL(blob);
    urlCache.set(ref, url);
    return url;
  },
};

export const repo: MuseumRepository = localRepository;

/** Returns a copy of the museum with every MediaRef resolved to a loadable URL. */
export async function resolveMuseum(m: Museum): Promise<Museum> {
  const r = (ref?: string) => (ref ? repo.resolveMedia(ref) : Promise.resolve(undefined));
  const photos = await Promise.all(m.photos.map(async (p) => ({ ...p, src: (await r(p.src)) ?? "" })));
  const video = m.video ? { ...m.video, src: (await r(m.video.src)) ?? "", poster: await r(m.video.poster) } : undefined;
  const song = m.song ? { ...m.song, src: (await r(m.song.src)) ?? "" } : undefined;
  return { ...m, photos: photos.filter((p) => p.src), video, song };
}

export function makeSlug(a: string, b: string) {
  const clean = (s: string) =>
    s
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 20);
  const base = [clean(a), clean(b)].filter(Boolean).join("-and-") || "us";
  return `${base}-${Math.random().toString(36).slice(2, 6)}`;
}
