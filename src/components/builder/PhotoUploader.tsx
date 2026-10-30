"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Close } from "@/components/ui/icons";
import { defaultRoom } from "@/lib/floorplan";
import { ROOMS, type RoomId } from "@/lib/types";

export interface DraftPhoto {
  id: string;
  file?: Blob;
  preview: string;
  title: string;
  caption: string;
  date: string;
  room: RoomId;
}

export const MAX_PHOTOS = 12;

const uid = () => Math.random().toString(36).slice(2, 10);

export { defaultRoom };

export function PhotoUploader({ photos, onChange }: { photos: DraftPhoto[]; onChange: (p: DraftPhoto[]) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [dragId, setDragId] = useState<string | null>(null);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const left = MAX_PHOTOS - photos.length;

  const addFiles = (files: FileList | File[]) => {
    const imgs = Array.from(files).filter((f) => f.type.startsWith("image/"));
    if (!imgs.length) return setNote("Those weren't images. Try JPG, PNG, WEBP or HEIC exported as JPG.");
    const take = imgs.slice(0, left);
    setNote(imgs.length > left ? `Only ${MAX_PHOTOS} photos fit on the walls, so ${imgs.length - left} were left out.` : "");
    onChange([
      ...photos,
      ...take.map((f, i) => ({
        id: uid(),
        file: f,
        preview: URL.createObjectURL(f),
        title: f.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 40),
        caption: "",
        date: "",
        room: defaultRoom(photos.length + i),
      })),
    ]);
  };

  const addUrl = () => {
    const u = url.trim();
    if (!/^https?:\/\/.+/i.test(u) || left <= 0) return;
    onChange([...photos, { id: uid(), preview: u, title: "", caption: "", date: "", room: defaultRoom(photos.length) }]);
    setUrl("");
  };

  const update = (id: string, patch: Partial<DraftPhoto>) => onChange(photos.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };

  return (
    <div>
      <div
        onDragOver={(e) => {
          if (e.dataTransfer.types.includes("Files")) {
            e.preventDefault();
            setOver(true);
          }
        }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => {
          if (!e.dataTransfer.files.length) return;
          e.preventDefault();
          setOver(false);
          addFiles(e.dataTransfer.files);
        }}
        className={`rounded-xl border-2 border-dashed px-6 py-10 text-center transition-colors ${over ? "border-rose bg-blush-soft" : "border-stone-2 bg-stone"}`}
      >
        <p className="display text-2xl">Drop photos here</p>
        <p className="mt-2 text-ink-soft" id="photo-limit">
          Up to {MAX_PHOTOS} images. {photos.length ? `${left} spot${left === 1 ? "" : "s"} left.` : "They're resized in your browser before saving."}
        </p>
        <button type="button" className="btn btn-primary mt-5" onClick={() => input.current?.click()} disabled={left <= 0} aria-describedby="photo-limit">
          Choose photos
        </button>
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          aria-label="Choose photos"
          onChange={(e) => {
            if (e.target.files) addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      <div className="mt-3 flex gap-2">
        <label htmlFor="photo-url" className="sr-only">Add a photo by URL</label>
        <input id="photo-url" name="photoUrl" type="url" autoComplete="off" spellCheck={false} className="field text-sm" placeholder="…or paste an image URL (https://…)" value={url} onChange={(e) => setUrl(e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addUrl())} />
        <button type="button" className="btn btn-quiet shrink-0" onClick={addUrl} disabled={!url.trim() || left <= 0}>Add</button>
      </div>
      {note && <p className="hint" role="status">{note}</p>}

      {photos.length > 0 && (
        <ol className="mt-8 flex flex-col gap-4">
          {photos.map((p, i) => (
            <li
              key={p.id}
              draggable
              onDragStart={(e) => {
                setDragId(p.id);
                e.dataTransfer.effectAllowed = "move";
              }}
              onDragEnd={() => setDragId(null)}
              onDragOver={(e) => {
                if (dragId) e.preventDefault();
              }}
              onDrop={(e) => {
                if (!dragId) return;
                e.preventDefault();
                move(photos.findIndex((x) => x.id === dragId), i);
                setDragId(null);
              }}
              className={`grid grid-cols-[96px_1fr] sm:grid-cols-[132px_1fr] gap-4 rounded-xl bg-stone p-3 sm:p-4 transition-opacity ${dragId === p.id ? "opacity-50" : ""}`}
            >
              <div className="flex flex-col gap-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.preview} alt="" width={264} height={198} className="w-full aspect-[4/3] object-cover rounded-md bg-stone-2 cursor-grab" />
                <div className="flex justify-between items-center">
                  <button type="button" className="btn btn-ghost min-h-9 w-9 p-0" aria-label={`Move photo ${i + 1} earlier`} onClick={() => move(i, i - 1)} disabled={i === 0}>
                    <ArrowLeft size={16} />
                  </button>
                  <span className="text-sm text-ink-soft tabular-nums">{i + 1}</span>
                  <button type="button" className="btn btn-ghost min-h-9 w-9 p-0" aria-label={`Move photo ${i + 1} later`} onClick={() => move(i, i + 1)} disabled={i === photos.length - 1}>
                    <ArrowRight size={16} />
                  </button>
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 min-w-0">
                <div className="sm:col-span-2 flex gap-2">
                  <div className="flex-1 min-w-0">
                    <label className="sr-only" htmlFor={`t-${p.id}`}>Title for photo {i + 1}</label>
                    <input id={`t-${p.id}`} className="field" name={`title-${i}`} autoComplete="off" placeholder="Title, e.g. The night we met…" value={p.title} maxLength={60} onChange={(e) => update(p.id, { title: e.target.value })} />
                  </div>
                  <button type="button" className="btn btn-ghost min-h-11 w-11 p-0 shrink-0" aria-label={`Remove photo ${i + 1}`} onClick={() => onChange(photos.filter((x) => x.id !== p.id))}>
                    <Close size={18} />
                  </button>
                </div>
                <div>
                  <label className="sr-only" htmlFor={`d-${p.id}`}>Date for photo {i + 1}</label>
                  <input id={`d-${p.id}`} className="field" name={`date-${i}`} autoComplete="off" placeholder="Date, e.g. June 2024…" value={p.date} maxLength={30} onChange={(e) => update(p.id, { date: e.target.value })} />
                </div>
                <div>
                  <label className="sr-only" htmlFor={`r-${p.id}`}>Room for photo {i + 1}</label>
                  <select id={`r-${p.id}`} name={`room-${i}`} className="field" value={p.room} onChange={(e) => update(p.id, { room: e.target.value as RoomId })}>
                    {ROOMS.map((r) => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="sr-only" htmlFor={`c-${p.id}`}>Caption for photo {i + 1}</label>
                  <textarea id={`c-${p.id}`} className="field" rows={2} name={`caption-${i}`} placeholder="A line for the plaque…" value={p.caption} maxLength={180} onChange={(e) => update(p.id, { caption: e.target.value })} />
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
