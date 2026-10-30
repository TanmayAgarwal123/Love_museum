// End-to-end check of the acceptance flow. Run against a running server:
//   npm run build && npm start   (in another terminal)
//   node scripts/e2e.mjs [baseUrl] [outDir]
// Uses the Playwright package + Chromium (set CHROME_PATH to use a specific binary).
import { mkdirSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const BASE = process.argv[2] || "http://localhost:3000";
const OUT = process.argv[3] || "e2e-shots";
const ROOT = path.dirname(path.dirname(new URL(import.meta.url).pathname));
mkdirSync(OUT, { recursive: true });

const results = [];
const errors = [];
const check = (name, ok, extra = "") => {
  results.push({ name, ok: !!ok, extra });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? `  (${extra})` : ""}`);
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const browser = await chromium.launch({
  executablePath: process.env.CHROME_PATH || undefined,
  args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--autoplay-policy=no-user-gesture-required"],
});

function watch(page, label) {
  page.on("console", (m) => {
    if (m.type() === "error") errors.push(`[${label}] console: ${m.text()}`);
  });
  page.on("pageerror", (e) => errors.push(`[${label}] pageerror: ${e.message}`));
}

const st = (page) => page.evaluate(() => {
  const m = window.__museum;
  const s = m.store.getState();
  return { x: m.sim.x, z: m.sim.z, room: s.room, near: s.near?.kind ?? null, focused: s.focusedPhotoId, sitting: s.sitting, dancing: s.dancing, letter: s.letterOpen, song: s.songPlaying, video: s.videoPlaying, panel: s.panel };
});
const setPos = (page, x, z, yaw) => page.evaluate(([x, z, yaw]) => {
  const { sim } = window.__museum;
  Object.assign(sim, { x, z, camYaw: yaw, avatarYaw: yaw, target: null });
  Object.assign(sim.partner, { x: x + 0.8, z });
}, [x, z, yaw]);
// The headless software renderer can run at 1-5 fps, so wait on state rather than fixed sleeps.
const until = (page, fn, arg, timeout = 60000) =>
  page.waitForFunction(fn, arg, { timeout, polling: 150 }).then(() => true, () => false);
const waitState = (page, expr, timeout) =>
  until(page, (e) => { const m = window.__museum; return new Function("s", "sim", `return (${e});`)(m.store.getState(), m.sim); }, expr, timeout);
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);

async function decodeQR(page, selector) {
  const { PNG } = require(process.env.PNGJS || "pngjs");
  const jsQR = require(process.env.JSQR || "jsqr");
  const url = await page.$eval(selector, (c) => c.toDataURL("image/png"));
  const png = PNG.sync.read(Buffer.from(url.split(",")[1], "base64"));
  const res = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  return res?.data ?? null;
}

async function enterMuseum(page, prefix) {
  await page.goto(`${BASE}/m/demo?enter=1`);
  await page.getByLabel("Digit 1").fill("1234");
  await page.waitForFunction(() => !!window.__museum, null, { timeout: 15000 });
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 20000 }).catch(() => {});
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/${prefix}-museum-entrance.png` });
}

// ---------------- desktop ----------------
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  watch(page, "desktop");

  await page.goto(BASE);
  await page.getByRole("button", { name: "Enter our museum" }).waitFor({ state: "visible" });
  await sleep(4200);
  await page.screenshot({ path: `${OUT}/desktop-home.png` });
  check("home: no horizontal overflow", !(await overflow(page)));
  const homeQR = await decodeQR(page, "canvas[role=img]");
  check("home: heart QR decodes to the demo link", homeQR?.endsWith("/m/demo"), homeQR ?? "no decode");

  await page.getByRole("button", { name: "Enter our museum" }).click();
  await page.waitForURL(/\/m\/demo/);
  await page.getByLabel("Digit 1").fill("0000");
  check("passcode: wrong code rejected", await page.getByText("Not quite").isVisible());
  await page.getByLabel("Digit 1").fill("1234");
  await page.waitForSelector("canvas", { timeout: 15000 });
  await page.waitForFunction(() => !!window.__museum);
  await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 20000 }).catch(() => {});
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/desktop-museum-entrance.png` });
  check("museum: canvas rendered after reveal + passcode", await page.locator("canvas").count());

  // walk with the keyboard through the first doorway
  const z0 = (await st(page)).z;
  await page.keyboard.down("KeyW");
  await waitState(page, `sim.z < ${z0 - 2}`, 60000);
  let s = await st(page);
  check("move: W walks forward", s.z < z0 - 2, `z ${z0.toFixed(1)} -> ${s.z.toFixed(1)}`);
  await waitState(page, "s.room === 'gallery'", 90000);
  await page.keyboard.up("KeyW");
  s = await st(page);
  check("move: walked through the doorway into the gallery", s.room === "gallery", `z=${s.z.toFixed(1)} room=${s.room}`);
  await page.screenshot({ path: `${OUT}/desktop-gallery-walk.png` });

  // collision: walk into the west wall
  await setPos(page, -5, -5, Math.PI / 2);
  await page.keyboard.down("KeyW");
  await waitState(page, "sim.x < -7", 20000);
  await page.keyboard.up("KeyW");
  s = await st(page);
  check("collision: can't walk through walls", s.x > -6.6 && s.x < -6.2, `stopped at x=${s.x.toFixed(2)}, wall face at -6.85`);

  // mouse drag to look
  const yaw0 = await page.evaluate(() => window.__museum.sim.camYaw);
  await page.mouse.move(700, 450);
  await page.mouse.down();
  await page.mouse.move(820, 450, { steps: 8 });
  await page.mouse.up();
  const yaw1 = await page.evaluate(() => window.__museum.sim.camYaw);
  check("look: mouse drag turns the camera", Math.abs(yaw1 - yaw0) > 0.2);

  // click a frame in the canvas: stand facing the west wall frame at z=-6.4
  await setPos(page, -3.2, -6.4, Math.PI / 2);
  await page.evaluate(() => window.__museum.store.getState().set({ view: "first" }));
  await sleep(5000);
  await page.screenshot({ path: `${OUT}/desktop-before-frame-click.png` });
  await page.mouse.click(720, 420);
  await sleep(1400);
  s = await st(page);
  check("photo: clicking a frame focuses it", !!s.focused, `focused=${s.focused}`);
  await page.screenshot({ path: `${OUT}/desktop-photo-focus-1.png` });
  await page.getByRole("button", { name: "Next photo" }).click();
  await sleep(1300);
  const f2 = (await st(page)).focused;
  await page.getByRole("button", { name: "Next photo" }).click();
  await sleep(1300);
  const f3 = (await st(page)).focused;
  await page.screenshot({ path: `${OUT}/desktop-photo-focus-3.png` });
  check("photo: focused 3 different photos", new Set([s.focused, f2, f3]).size === 3, [s.focused, f2, f3].join(","));
  await page.keyboard.press("Escape");
  await sleep(300);
  check("photo: Esc returns control", !(await st(page)).focused);
  await page.evaluate(() => window.__museum.store.getState().set({ view: "third" }));

  // proximity + E on a photo
  await setPos(page, 5.6, -10, -Math.PI / 2);
  await waitState(page, "s.near?.kind === 'photo'", 20000);
  s = await st(page);
  check("photo: walking close shows a prompt", s.near === "photo" && (await page.getByRole("button", { name: /View photo/ }).isVisible()));
  await page.keyboard.press("KeyE");
  await sleep(400);
  check("photo: E opens the near photo", !!(await st(page)).focused);
  await page.keyboard.press("Escape");

  // map teleport through every room
  for (const [name, id] of [["Entrance Hall", "entrance"], ["Photo Gallery", "gallery"], ["Cinema Room", "cinema"], ["Dance & Letter Room", "dance"]]) {
    await page.getByRole("button", { name: "Map" }).click();
    await page.getByRole("dialog", { name: "Map" }).getByRole("button", { name: new RegExp(name.replace("&", "&")) }).click();
    await sleep(1400);
    s = await st(page);
    check(`map: teleport to ${name}`, s.room === id);
    await page.screenshot({ path: `${OUT}/desktop-room-${id}.png` });
  }

  // cinema: sit & watch
  await setPos(page, 1.0, -22, -Math.PI / 2);
  await waitState(page, "s.near?.kind === 'bench'", 20000);
  check("cinema: bench prompt appears", (await st(page)).near === "bench");
  await page.keyboard.press("KeyE");
  await waitState(page, "s.videoPlaying", 20000);
  await sleep(2500);
  s = await st(page);
  check("cinema: E sits both avatars", s.sitting);
  check("cinema: memory video plays", s.video);
  await page.screenshot({ path: `${OUT}/desktop-cinema-sitting.png` });
  await page.getByRole("button", { name: /^Pause$/ }).click();
  await waitState(page, "!s.videoPlaying", 5000);
  check("cinema: video pauses", !(await st(page)).video);
  await page.getByRole("button", { name: /^Play$/ }).click();
  await waitState(page, "s.videoPlaying", 5000);
  check("cinema: video resumes", (await st(page)).video);
  await page.getByRole("button", { name: /Stand up/ }).click();
  await sleep(600);
  check("cinema: stand up", !(await st(page)).sitting);

  // dance
  await setPos(page, 0, -32.2, 0);
  await waitState(page, "s.near?.kind === 'dance'", 20000);
  check("dance: prompt appears on the dance floor", (await st(page)).near === "dance");
  await page.keyboard.press("KeyE");
  await waitState(page, "s.dancing && !document.querySelector('audio').paused", 15000);
  await sleep(3500);
  s = await st(page);
  check("dance: E starts dancing", s.dancing);
  check("dance: our song plays", s.song && (await page.evaluate(() => !document.querySelector("audio").paused)));
  await page.screenshot({ path: `${OUT}/desktop-dancing.png` });
  await page.keyboard.press("KeyE");
  await sleep(500);
  check("dance: E stops", !(await st(page)).dancing);
  await page.getByRole("button", { name: "Pause our song" }).click();

  // letter
  await setPos(page, 0, -38.4, 0);
  await waitState(page, "s.near?.kind === 'letter'", 20000);
  check("letter: prompt appears by the pedestal", (await st(page)).near === "letter");
  await page.keyboard.press("KeyE");
  await sleep(700);
  check("letter: opens", await page.getByRole("dialog", { name: /A letter for/ }).isVisible());
  await page.screenshot({ path: `${OUT}/desktop-letter.png` });
  await page.keyboard.press("Escape");
  await sleep(200);
  check("letter: Esc closes", !(await st(page)).letter);

  // share
  await page.getByRole("button", { name: "Share" }).click();
  await sleep(500);
  const shareQR = await decodeQR(page, '[role=dialog] canvas[role=img]');
  check("share: heart QR decodes to museum link", shareQR?.endsWith("/m/demo"), shareQR ?? "no decode");
  await page.screenshot({ path: `${OUT}/desktop-share.png` });
  await page.keyboard.press("Escape");

  // photos grid
  await page.getByRole("button", { name: "All photos" }).click();
  await sleep(500);
  await page.screenshot({ path: `${OUT}/desktop-photos-grid.png` });
  await page.keyboard.press("Escape");

  // 2D gallery
  await page.goto(`${BASE}/m/demo/gallery`);
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/desktop-gallery-2d.png` });
  check("2D gallery: 12 photos", (await page.locator("section[aria-labelledby^=room-] figure img").count()) === 12);
  check("2D gallery: no overflow", !(await overflow(page)));

  // builder
  await page.goto(`${BASE}/create`);
  await page.screenshot({ path: `${OUT}/desktop-create.png` });
  await page.getByLabel("Your name").fill("Sam");
  await page.getByLabel("Their name").fill("Alex");
  await page.getByLabel("Together since").fill("2024-02-14");
  await page.getByLabel("Choose photos").setInputFiles(["photo-03.jpg", "photo-05.jpg", "photo-11.jpg"].map((f) => path.join(ROOT, "public/demo", f)));
  await page.getByLabel("Title for photo 1").fill("Beach day");
  await page.getByLabel("Caption for photo 1").fill("Sunburnt and happy.");
  await page.getByLabel("Move photo 2 later").click();
  await page.getByLabel("Video file").setInputFiles(path.join(ROOT, "public/demo/memory.mp4"));
  await page.getByLabel("Audio file").setInputFiles(path.join(ROOT, "public/demo/our-song.mp3"));
  await page.getByLabel("Your letter").fill("Alex,\n\nHappy anniversary.\n\nSam");
  await page.getByText("Midnight", { exact: true }).click();
  await page.screenshot({ path: `${OUT}/desktop-create-filled.png`, fullPage: true });
  await page.getByRole("button", { name: "Create our museum" }).click();
  await page.getByRole("heading", { name: "Your museum is ready" }).waitFor({ timeout: 20000 });
  const link = await page.getByLabel("Shareable link").inputValue();
  check("builder: museum created with a slug link", /\/m\/sam-and-alex-[a-z0-9]{4}$/.test(link), link);
  const newQR = await decodeQR(page, "canvas[role=img]");
  check("builder: heart QR decodes to the new link", newQR === link, newQR ?? "no decode");
  await page.screenshot({ path: `${OUT}/desktop-create-success.png` });
  await page.goto(newQR || link);
  await page.getByRole("button", { name: "Enter our museum" }).waitFor({ state: "visible", timeout: 10000 });
  await page.getByRole("button", { name: "Skip the intro" }).click().catch(() => {});
  await page.getByRole("button", { name: "Enter our museum" }).click();
  await page.waitForFunction(() => !!window.__museum, null, { timeout: 15000 });
  await page.waitForFunction(() => !document.querySelector('[role="status"]'), null, { timeout: 20000 }).catch(() => {});
  await sleep(1500);
  await setPos(page, 0, 6, 0);
  await sleep(1200);
  await page.screenshot({ path: `${OUT}/desktop-new-museum.png` });
  const titles = await page.evaluate(() => window.__museum.store.getState().room);
  check("builder: new museum opens in 3D via its link/QR", titles === "entrance");
  await ctx.close();
}

// ---------------- mobile ----------------
{
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const page = await ctx.newPage();
  watch(page, "mobile");
  await page.goto(BASE);
  await sleep(4300);
  await page.screenshot({ path: `${OUT}/mobile-home.png` });
  check("mobile home: no overflow", !(await overflow(page)));
  await page.goto(`${BASE}/create`);
  await sleep(500);
  await page.screenshot({ path: `${OUT}/mobile-create.png` });
  check("mobile create: no overflow", !(await overflow(page)));

  await enterMuseum(page, "mobile");
  check("mobile: joystick visible", await page.getByRole("application", { name: /joystick/ }).isVisible());
  const z0 = (await st(page)).z;
  const box = await page.getByRole("application", { name: /joystick/ }).boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  await page.mouse.move(cx, cy);
  await page.mouse.down();
  await page.mouse.move(cx, cy - 50, { steps: 4 });
  await waitState(page, `sim.z < ${z0 - 1.6}`, 40000);
  await page.mouse.up();
  const s = await st(page);
  check("mobile: joystick walks forward", s.z < z0 - 1.5, `z ${z0.toFixed(1)} -> ${s.z.toFixed(1)}`);
  await page.screenshot({ path: `${OUT}/mobile-walking.png` });

  // HUD overlap check: top bar elements must not intersect
  const boxes = await page.evaluate(() => {
    const r = (el) => el && el.getBoundingClientRect();
    const title = r(document.querySelector(".display")?.closest("div"));
    const nav = r(document.querySelector('nav[aria-label="Museum controls"]'));
    return { title, nav, w: innerWidth };
  });
  check("mobile: title and HUD buttons don't overlap", boxes.title.right <= boxes.nav.left + 1 && boxes.nav.right <= boxes.w);

  await setPos(page, 5.6, -10, -Math.PI / 2);
  await waitState(page, "s.near?.kind === 'photo'", 20000);
  await page.getByRole("button", { name: /View photo/ }).click();
  await sleep(1500);
  await page.screenshot({ path: `${OUT}/mobile-photo.png` });
  check("mobile: photo card fits the screen", await page.evaluate(() => { const a = document.querySelector("aside[role=dialog]").getBoundingClientRect(); return a.left >= 0 && a.right <= innerWidth && a.bottom <= innerHeight; }));
  await page.getByRole("button", { name: "Back to walking" }).click();

  await setPos(page, 1.0, -22, -Math.PI / 2);
  await waitState(page, "s.near?.kind === 'bench'", 20000);
  await page.getByRole("button", { name: /Sit & watch/ }).click();
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/mobile-cinema.png` });
  check("mobile: sit & watch via tap", (await st(page)).sitting);
  await page.getByRole("button", { name: /Stand up/ }).click();

  await setPos(page, 0, -32.2, 0);
  await waitState(page, "s.near?.kind === 'dance'", 20000);
  await page.getByRole("button", { name: /^Dance/ }).click();
  await sleep(2500);
  await page.screenshot({ path: `${OUT}/mobile-dance.png` });
  check("mobile: dance via tap", (await st(page)).dancing);
  await page.getByRole("button", { name: /Stop dancing/ }).click();

  await setPos(page, 0, -38.4, 0);
  await waitState(page, "s.near?.kind === 'letter'", 20000);
  await page.getByRole("button", { name: /Read the letter/ }).click();
  await sleep(700);
  await page.screenshot({ path: `${OUT}/mobile-letter.png` });
  check("mobile: letter opens", (await st(page)).letter);
  check("mobile museum: no overflow", !(await overflow(page)));

  await page.goto(`${BASE}/m/demo/gallery`);
  await sleep(1000);
  await page.screenshot({ path: `${OUT}/mobile-gallery-2d.png` });
  check("mobile 2D gallery: no overflow", !(await overflow(page)));
  await ctx.close();
}

await browser.close();
check("no console errors", errors.length === 0, errors.slice(0, 5).join(" | "));
const failed = results.filter((r) => !r.ok).length;
console.log(`\n${results.length - failed}/${results.length} checks passed`);
process.exit(failed ? 1 : 0);
