#!/usr/bin/env python3
"""Generate the original demo media for Museum of Us (photos, memory video, song).

Everything here is drawn / synthesised from scratch so the demo has no licensing or
hotlinking issues. Re-run with:  python3 scripts/generate-demo-assets.py
Requires: numpy, Pillow, ffmpeg (for the mp3 + mp4).
"""
import math
import os
import random
import subprocess
import wave

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "public", "demo")
os.makedirs(OUT, exist_ok=True)


def hex2rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i : i + 2], 16) for i in (0, 2, 4))


def sky(w, h, top, bottom, horizon=1.0):
    t = np.linspace(0, 1, h)[:, None] ** horizon
    a, b = np.array(hex2rgb(top)), np.array(hex2rgb(bottom))
    col = a[None, :] * (1 - t[..., None]) + b[None, :] * t[..., None]
    arr = np.repeat(col, w, axis=1).astype(np.uint8)
    return Image.fromarray(arr, "RGB")


def glow(img, cx, cy, r, color, strength=0.9):
    w, h = img.size
    y, x = np.ogrid[:h, :w]
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2)
    a = np.clip(1 - d / r, 0, 1) ** 2 * strength
    base = np.asarray(img).astype(float)
    c = np.array(hex2rgb(color), float)
    out = base * (1 - a[..., None]) + c * a[..., None]
    return Image.fromarray(out.clip(0, 255).astype(np.uint8))


def couple(d, x, ground, h, color, umbrella=None, lean=0):
    """Two silhouettes holding hands, x = centre between them."""
    gap = h * 0.36
    for i, px in enumerate((x - gap / 2, x + gap / 2)):
        ph = h * (1.0 if i == 0 else 0.93)
        hr = ph * 0.105
        top = ground - ph
        hx = px + (lean if i == 0 else -lean)
        d.ellipse([hx - hr, top, hx + hr, top + hr * 2], fill=color)
        if i == 1:  # hair bun
            d.ellipse([hx + hr * 0.3, top - hr * 0.35, hx + hr * 1.05, top + hr * 0.45], fill=color)
        sh_y = top + hr * 2.2
        hip_y = top + ph * 0.55
        sw = ph * 0.13
        if i == 1:  # dress
            d.polygon([(px - sw, sh_y), (px + sw, sh_y), (px + sw * 1.7, ground - ph * 0.2), (px - sw * 1.7, ground - ph * 0.2)], fill=color)
        else:
            d.rounded_rectangle([px - sw, sh_y, px + sw, hip_y], radius=sw * 0.6, fill=color)
        lw = ph * 0.045
        for s in (-1, 1):
            d.polygon([(px + s * sw * 0.15, hip_y - 4), (px + s * sw * 0.85, hip_y - 4), (px + s * sw * 0.7 + s * 2, ground), (px + s * sw * 0.7 - s * lw * 2, ground)], fill=color)
        # outer arm
        s = -1 if i == 0 else 1
        d.line([(px + s * sw * 0.9, sh_y + 4), (px + s * sw * 1.4, hip_y + ph * 0.02)], fill=color, width=int(lw * 1.6))
    # held hands
    y1 = top + ph * 0.25
    d.line([(x - gap / 2 + h * 0.12, y1 + h * 0.03), (x, y1 + h * 0.2), (x + gap / 2 - h * 0.11, y1 + h * 0.03)], fill=color, width=int(h * 0.07), joint="curve")
    if umbrella:
        uy = ground - h * 1.25
        d.pieslice([x - h * 0.55, uy, x + h * 0.55, uy + h * 0.6], 180, 360, fill=umbrella)
        d.line([(x, uy + h * 0.3), (x, ground - h * 0.55)], fill=color, width=int(h * 0.025))


def finish(img, name, warm=(1.04, 1.0, 0.95)):
    arr = np.asarray(img).astype(float)
    h, w, _ = arr.shape
    rng = np.random.default_rng(abs(hash(name)) % 2**32)
    arr += rng.normal(0, 7, (h, w, 1))
    y, x = np.ogrid[:h, :w]
    v = 1 - 0.45 * (((x - w / 2) / (w / 1.3)) ** 2 + ((y - h / 2) / (h / 1.3)) ** 2)
    arr *= v[..., None]
    arr *= np.array(warm)
    out = Image.fromarray(arr.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6))
    out.save(os.path.join(OUT, name), quality=84, optimize=True, progressive=True)
    print("wrote", name, out.size)


W, H = 1200, 900


def city_night():
    img = sky(W, H, "#0e1530", "#3a2a4a")
    d = ImageDraw.Draw(img)
    r = random.Random(1)
    for i in range(22):
        bw = r.randint(50, 110); bh = r.randint(200, 560); bx = i * 56 - 30
        d.rectangle([bx, H - bh, bx + bw, H], fill="#151226")
        for wy in range(H - bh + 16, H - 140, 26):
            for wx in range(bx + 8, bx + bw - 10, 18):
                if r.random() < 0.38:
                    d.rectangle([wx, wy, wx + 8, wy + 12], fill=r.choice(["#ffd38a", "#ffb870", "#fbe6b0"]))
    img = glow(img, 600, 700, 520, "#ff9a7a", 0.35)
    d = ImageDraw.Draw(img)
    for k in range(40):  # string lights
        x = k * 31; y = 120 + 40 * math.sin(k / 6.3)
        d.ellipse([x - 5, y - 5, x + 5, y + 5], fill="#ffe2a8")
    d.rectangle([0, H - 140, W, H], fill="#1b1424")
    couple(d, 610, H - 140, 300, "#08060c")
    return img


def road_trip():
    img = sky(W, H, "#f6b48a", "#fce6c4", 0.8)
    img = glow(img, 860, 470, 300, "#fff1c9", 0.95)
    d = ImageDraw.Draw(img)
    d.polygon([(0, 520), (200, 380), (420, 470), (640, 360), (900, 480), (1200, 400), (1200, 900), (0, 900)], fill="#c9775c")
    d.polygon([(0, 600), (300, 520), (600, 590), (1200, 520), (1200, 900), (0, 900)], fill="#a35a4a")
    d.polygon([(520, 560), (680, 560), (1100, 900), (100, 900)], fill="#4b3a3d")
    for k in range(6):
        y = 600 + k * 50
        d.rectangle([596 - k * 2, y, 604 + k * 2, y + 24 + k * 4], fill="#f3dca2")
    couple(d, 300, 820, 300, "#2a1a1d")
    return img


def beach():
    img = sky(W, H, "#f4a6a0", "#ffd9b0", 1.1)
    img = glow(img, 600, 520, 380, "#fff0c0", 0.95)
    d = ImageDraw.Draw(img)
    d.ellipse([540, 460, 660, 580], fill="#fff4d6")
    d.rectangle([0, 520, W, 700], fill="#e48e86")
    for k in range(14):
        y = 530 + k * 12
        d.line([(600 - 60 - k * 22, y), (600 + 60 + k * 22, y)], fill="#ffe3bd", width=3)
    d.polygon([(0, 700), (W, 660), (W, H), (0, H)], fill="#f2c79e")
    couple(d, 760, 820, 330, "#3a2228")
    return img


def snow():
    img = sky(W, H, "#24324f", "#7d8db0")
    d = ImageDraw.Draw(img)
    for x0, s in [(80, 1.0), (260, 0.8), (980, 1.1), (1120, 0.7)]:
        for t in range(4):
            y = 360 + t * 90 * s
            wdt = (60 + t * 45) * s
            d.polygon([(x0, y - 120 * s), (x0 - wdt, y + 60 * s), (x0 + wdt, y + 60 * s)], fill="#1a2a3a")
    d.polygon([(0, 700), (W, 650), (W, H), (0, H)], fill="#eef2fb")
    img = glow(img, 600, 600, 300, "#ffd9a0", 0.35)
    d = ImageDraw.Draw(img)
    r = random.Random(4)
    for _ in range(420):
        x, y, s = r.randint(0, W), r.randint(0, H), r.choice([2, 3, 3, 4, 5])
        d.ellipse([x, y, x + s, y + s], fill="#ffffff")
    couple(d, 600, 760, 300, "#1c2234")
    return img


def picnic():
    img = sky(W, H, "#8fc3ea", "#e4f1fb")
    d = ImageDraw.Draw(img)
    for cx, cy, s in [(220, 170, 1), (820, 120, 1.3), (1050, 230, 0.8)]:
        for dx, dy, rr in [(-60, 10, 50), (0, -10, 70), (70, 10, 55)]:
            d.ellipse([cx + dx * s - rr * s, cy + dy * s - rr * s, cx + dx * s + rr * s, cy + dy * s + rr * s], fill="#ffffff")
    d.ellipse([-300, 560, 900, 1300], fill="#7fb06a")
    d.ellipse([400, 600, 1600, 1300], fill="#6aa058")
    d.rectangle([905, 330, 935, 640], fill="#5a4030")
    d.ellipse([780, 180, 1070, 450], fill="#4f8a48")
    d.polygon([(330, 760), (620, 740), (660, 830), (300, 860)], fill="#e8a0b4")
    couple(d, 470, 790, 280, "#2b3a2a")
    return img


def ferris():
    img = sky(W, H, "#3b2c5c", "#f2a28a", 1.3)
    d = ImageDraw.Draw(img)
    cx, cy, R = 760, 400, 300
    d.ellipse([cx - R, cy - R, cx + R, cy + R], outline="#2a1e33", width=10)
    for k in range(16):
        a = k * math.pi / 8
        x, y = cx + R * math.cos(a), cy + R * math.sin(a)
        d.line([(cx, cy), (x, y)], fill="#2a1e33", width=4)
        d.ellipse([x - 14, y - 14, x + 14, y + 14], fill="#ffd38a")
    d.polygon([(cx, cy), (cx - 180, H - 160), (cx - 150, H - 160)], fill="#2a1e33")
    d.polygon([(cx, cy), (cx + 180, H - 160), (cx + 150, H - 160)], fill="#2a1e33")
    d.rectangle([0, H - 160, W, H], fill="#2a1e33")
    couple(d, 300, H - 160, 300, "#140e1a")
    return img


def rain():
    img = sky(W, H, "#5b6878", "#a7b2bd")
    d = ImageDraw.Draw(img)
    for i in range(10):
        bx = i * 130; bh = 260 + (i * 73) % 220
        d.rectangle([bx, H - 220 - bh, bx + 110, H - 220], fill="#6c7886")
    d.rectangle([0, H - 220, W, H], fill="#3c4450")
    for k in range(18):
        d.line([(k * 70, H - 120), (k * 70 + 50, H - 120)], fill="#5c6878", width=3)
    r = random.Random(7)
    for _ in range(500):
        x, y = r.randint(0, W), r.randint(0, H)
        d.line([(x, y), (x - 6, y + 26)], fill="#d8dee6", width=1)
    couple(d, 600, H - 180, 330, "#20242c", umbrella="#c25a7c")
    return img


def summit():
    img = sky(W, H, "#f7c7b6", "#fdf0e4")
    img = glow(img, 300, 300, 260, "#fff6dd", 0.9)
    d = ImageDraw.Draw(img)
    layers = [("#d7a8b4", 420), ("#b98095", 520), ("#8e5e78", 620), ("#5e3e58", 720)]
    for li, (c, base) in enumerate(layers):
        pts = [(0, H)]
        for x in range(0, W + 100, 100):
            pts.append((x, base - 120 * abs(math.sin(x / 210 + li * 1.7))))
        pts.append((W, H))
        d.polygon(pts, fill=c)
    couple(d, 820, 640, 230, "#2c1c2a")
    return img


def lanterns():
    img = sky(W, H, "#120f2a", "#3d2346")
    d = ImageDraw.Draw(img)
    r = random.Random(9)
    for _ in range(60):
        x, y, s = r.randint(0, W), r.randint(0, H - 250), r.uniform(0.4, 1.4)
        img = glow(img, x, y, 40 * s, "#ffb36b", 0.35)
        d = ImageDraw.Draw(img)
        d.rounded_rectangle([x - 9 * s, y - 13 * s, x + 9 * s, y + 13 * s], radius=4 * s, fill="#ffcf8a")
    d.rectangle([0, H - 220, W, H], fill="#1a1226")
    for k in range(12):
        d.ellipse([k * 110 - 30, H - 260, k * 110 + 90, H - 180], fill="#1a1226")
    couple(d, 560, H - 200, 300, "#0a0812")
    return img


def stars():
    img = sky(W, H, "#070a1c", "#26244a")
    d = ImageDraw.Draw(img)
    r = random.Random(11)
    for _ in range(700):
        x, y = r.randint(0, W), r.randint(0, 640)
        s = r.choice([1, 1, 1, 2, 2, 3])
        d.ellipse([x, y, x + s, y + s], fill=r.choice(["#ffffff", "#ffe9d6", "#dfe6ff"]))
    for k in range(260):  # milky way band
        t = r.random()
        x = t * W; y = 520 - t * 420 + r.gauss(0, 40)
        d.ellipse([x, y, x + 2, y + 2], fill="#f3ead8")
    d.polygon([(0, 700), (300, 600), (650, 680), (1000, 590), (1200, 640), (1200, 900), (0, 900)], fill="#0c0b18")
    couple(d, 620, 690, 220, "#03030a")
    return img


def blossoms():
    img = sky(W, H, "#fde8ee", "#fff7f2")
    d = ImageDraw.Draw(img)
    d.polygon([(250, 900), (290, 420), (330, 900)], fill="#5c3b3b")
    d.line([(290, 520), (520, 300)], fill="#5c3b3b", width=22)
    d.line([(290, 600), (90, 380)], fill="#5c3b3b", width=18)
    r = random.Random(13)
    for _ in range(90):
        x, y, rr = r.gauss(330, 230), r.gauss(330, 130), r.randint(30, 80)
        d.ellipse([x - rr, y - rr, x + rr, y + rr], fill=r.choice(["#f4b6c6", "#f7c7d3", "#eea2b6", "#fbd9e1"]))
    d.rectangle([0, 760, W, H], fill="#e9d9cf")
    for _ in range(200):
        x, y = r.randint(0, W), r.randint(0, H)
        d.ellipse([x, y, x + 7, y + 5], fill="#f2a9bd")
    couple(d, 800, 820, 320, "#4a2f36")
    return img


def rooftop():
    img = sky(W, H, "#f08f72", "#fbd2a4", 0.9)
    img = glow(img, 900, 560, 340, "#fff0c4", 0.8)
    d = ImageDraw.Draw(img)
    r = random.Random(17)
    x = 0
    while x < W:
        bw = r.randint(40, 120); bh = r.randint(120, 380)
        d.rectangle([x, 640 - bh, x + bw, 700], fill="#8a4a52")
        x += bw + r.randint(0, 10)
    d.rectangle([0, 700, W, H], fill="#3b2a30")
    d.rectangle([0, 680, W, 700], fill="#2c1f24")
    for k in range(30):
        xx = k * 42; yy = 200 + 30 * math.sin(k / 4)
        d.ellipse([xx - 6, yy - 6, xx + 6, yy + 6], fill="#fff1c9")
    couple(d, 420, 830, 320, "#1f1418")
    return img


SCENES = [
    ("photo-01.jpg", city_night),
    ("photo-02.jpg", road_trip),
    ("photo-03.jpg", beach),
    ("photo-04.jpg", snow),
    ("photo-05.jpg", picnic),
    ("photo-06.jpg", ferris),
    ("photo-07.jpg", rain),
    ("photo-08.jpg", summit),
    ("photo-09.jpg", lanterns),
    ("photo-10.jpg", stars),
    ("photo-11.jpg", blossoms),
    ("photo-12.jpg", rooftop),
]


def make_photos():
    for name, fn in SCENES:
        finish(fn(), name)


# ---------- song: an original music-box waltz ----------
SR = 44100


def note_freq(n):
    return 440.0 * 2 ** ((n - 69) / 12)


def bell(freq, dur, amp):
    t = np.arange(int(SR * dur)) / SR
    env = np.exp(-t * 3.2) * (1 - np.exp(-t * 400))
    sig = (np.sin(2 * np.pi * freq * t) + 0.45 * np.sin(2 * np.pi * freq * 2.0 * t) * np.exp(-t * 4)
           + 0.22 * np.sin(2 * np.pi * freq * 3.01 * t) * np.exp(-t * 7) + 0.1 * np.sin(2 * np.pi * freq * 4.2 * t) * np.exp(-t * 9))
    return sig * env * amp


def pad(freqs, dur, amp):
    t = np.arange(int(SR * dur)) / SR
    env = np.minimum(1, t / 0.4) * np.minimum(1, (dur - t) / 0.5).clip(0)
    sig = sum(np.sin(2 * np.pi * f * t) + 0.3 * np.sin(2 * np.pi * f * 2 * t) for f in freqs)
    return sig * env * amp


def make_song(path_mp3):
    bpm = 84
    beat = 60 / bpm
    # chords (root midi) and melodies per bar in 3/4: (offset_beats, midi, length)
    C, Am, F, G, Em, Dm = [60, 64, 67], [57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59], [50, 53, 57]
    prog = [C, Am, F, G, C, Em, F, G, Am, F, C, G, Dm, G, C, C]
    mel = [
        [(0, 76, 1), (1, 79, 1), (2, 77, 1)], [(0, 76, 2), (2, 72, 1)], [(0, 74, 1), (1, 76, 1), (2, 77, 1)], [(0, 79, 3)],
        [(0, 76, 1), (1, 79, 1), (2, 84, 1)], [(0, 83, 2), (2, 79, 1)], [(0, 81, 1), (1, 79, 1), (2, 77, 1)], [(0, 74, 3)],
        [(0, 72, 1), (1, 76, 1), (2, 81, 1)], [(0, 81, 1.5), (1.5, 79, 0.5), (2, 77, 1)], [(0, 76, 1), (1, 79, 1), (2, 84, 1)], [(0, 83, 3)],
        [(0, 81, 1), (1, 77, 1), (2, 74, 1)], [(0, 79, 1), (1, 77, 1), (2, 74, 1)], [(0, 72, 3)], [(0, 76, 1), (1, 79, 1.0), (2, 84, 1)],
    ]
    bars = len(prog)
    reps = 3
    total = int(SR * (bars * 3 * beat * reps + 4))
    out = np.zeros(total)
    for rep in range(reps):
        for b in range(bars):
            t0 = (rep * bars + b) * 3 * beat
            ch = prog[b]
            i0 = int(t0 * SR)
            p = pad([note_freq(n - 12) for n in ch], 3 * beat, 0.035)
            out[i0 : i0 + len(p)] += p
            bs = bell(note_freq(ch[0] - 12), 2.5, 0.22)
            out[i0 : i0 + len(bs)] += bs
            for k in (1, 2):
                for n in ch[1:]:
                    s = bell(note_freq(n), 1.2, 0.06)
                    j = int((t0 + k * beat) * SR)
                    out[j : j + len(s)] += s
            for off, n, ln in mel[b]:
                transp = 12 if rep == 1 else 0
                s = bell(note_freq(n + transp - (12 if rep == 1 else 0)), max(1.6, ln * beat * 1.6), 0.28)
                j = int((t0 + off * beat) * SR)
                out[j : j + len(s)] += s[: max(0, total - j)]
    # simple reverb
    for delay, g in [(0.031, 0.35), (0.047, 0.3), (0.071, 0.25), (0.113, 0.2), (0.19, 0.12)]:
        dd = int(delay * SR)
        out[dd:] += out[:-dd] * g
    out /= np.max(np.abs(out)) * 1.15
    tail = int(SR * 3)
    out[-tail:] *= np.linspace(1, 0, tail)
    wav = path_mp3.replace(".mp3", ".wav")
    with wave.open(wav, "w") as f:
        f.setnchannels(1); f.setsampwidth(2); f.setframerate(SR)
        f.writeframes((out * 32767).astype(np.int16).tobytes())
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-b:a", "96k", path_mp3], check=True)
    os.remove(wav)
    print("wrote", os.path.basename(path_mp3))


def make_video(song):
    picks = ["photo-03.jpg", "photo-06.jpg", "photo-11.jpg", "photo-09.jpg", "photo-10.jpg"]
    seg = 4.0
    inputs, filters = [], []
    for i, p in enumerate(picks):
        inputs += ["-loop", "1", "-t", str(seg + 1), "-i", os.path.join(OUT, p)]
        filters.append(
            f"[{i}:v]scale=1600:1200,zoompan=z='min(zoom+0.0009,1.12)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d={int((seg + 1) * 25)}:s=1280x720:fps=25,setsar=1,format=yuv420p[v{i}]"
        )
    chain, last = [], "v0"
    for i in range(1, len(picks)):
        out = f"x{i}"
        chain.append(f"[{last}][v{i}]xfade=transition=fade:duration=1:offset={i * seg}[{out}]")
        last = out
    total = seg * len(picks) + 1
    fc = ";".join(filters + chain) + f";[{last}]fade=t=in:st=0:d=0.8,fade=t=out:st={total - 1}:d=1[vout]"
    fc += f";[{len(picks)}:a]atrim=0:{total},afade=t=in:d=1,afade=t=out:st={total - 1.5}:d=1.5,volume=0.8[aout]"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", *inputs, "-i", song, "-filter_complex", fc, "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", "slow", "-crf", "28", "-movflags", "+faststart", "-c:a", "aac", "-b:a", "96k",
           os.path.join(OUT, "memory.mp4")]
    subprocess.run(cmd, check=True)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", os.path.join(OUT, "photo-03.jpg"), "-vf", "scale=1280:720:force_original_aspect_ratio=increase,crop=1280:720", "-q:v", "4", os.path.join(OUT, "memory-poster.jpg")], check=True)
    print("wrote memory.mp4")


if __name__ == "__main__":
    make_photos()
    song = os.path.join(OUT, "our-song.mp3")
    make_song(song)
    make_video(song)
