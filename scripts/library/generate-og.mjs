// Renders the 1200x630 share thumbnails (WhatsApp, Telegram, Facebook, X, Google) for every library page.
// Needs Chrome/Edge installed locally; run `node scripts/library/generate-og.mjs` after the library data changes.
// Output: public/og/library/<year>.jpg, <year>-<subject>.jpg, outline-<dept>.jpg (committed, so builds need no browser).
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { countFiles } from "../../src/lib/libraryMeta.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const registry = JSON.parse(fs.readFileSync(path.join(root, "src/data/libraries.json"), "utf8"));
const outDir = path.join(root, "public/og/library");
fs.mkdirSync(outDir, { recursive: true });

const CHROME = [process.env.CHROME_PATH, "C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe", "/usr/bin/google-chrome", "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"]
  .filter(Boolean).find((p) => fs.existsSync(p));
if (!CHROME) throw new Error("Chrome/Edge not found. Set CHROME_PATH.");

const PALETTE = [
  ["#0f766e", "#134e4a"], ["#1d4ed8", "#1e3a8a"], ["#6d28d9", "#4c1d95"], ["#be185d", "#831843"], ["#b45309", "#78350f"],
  ["#047857", "#064e3b"], ["#0369a1", "#0c4a6e"], ["#4338ca", "#312e81"], ["#a21caf", "#701a75"], ["#9a3412", "#431407"],
];
const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function html({ tag, title, subtitle, chip, palette }) {
  const size = title.length > 34 ? 52 : title.length > 22 ? 64 : title.length > 13 ? 76 : 104;
  return `<!doctype html><html><head><meta charset="utf-8"><style>
*{box-sizing:border-box;margin:0}
body{width:1200px;height:630px;overflow:hidden;font-family:"Segoe UI",Helvetica,Arial,sans-serif;color:#fff;
 background:radial-gradient(900px 500px at 85% 15%,rgba(255,255,255,.16),transparent 60%),linear-gradient(135deg,${palette[0]},${palette[1]})}
.wrap{position:relative;width:100%;height:100%;padding:56px 70px}
.ring{position:absolute;right:-140px;top:-120px;width:620px;height:620px;border-radius:50%;border:70px solid rgba(255,255,255,.07)}
.ring.two{right:60px;top:240px;width:330px;height:330px;border-width:34px;border-color:rgba(255,255,255,.06)}
.brand{display:flex;align-items:center;gap:14px;font-weight:800;letter-spacing:.18em;font-size:22px;text-transform:uppercase;opacity:.95}
.logo{width:44px;height:44px;border-radius:12px;background:#fff;color:${palette[0]};display:flex;align-items:center;justify-content:center;font-size:26px}
.tag{display:inline-block;margin-top:70px;padding:9px 22px;border-radius:999px;background:rgba(255,255,255,.18);border:2px solid rgba(255,255,255,.35);font-weight:800;letter-spacing:.14em;font-size:24px;text-transform:uppercase}
h1{font-family:Georgia,"Times New Roman",serif;font-size:${size}px;line-height:1.04;margin-top:26px;max-width:760px;font-weight:700;text-shadow:0 4px 24px rgba(0,0,0,.25)}
.sub{margin-top:22px;font-size:32px;font-weight:600;opacity:.95;max-width:700px;line-height:1.25}
.chip{position:absolute;right:70px;bottom:130px;padding:16px 30px;border-radius:20px;background:#fff;color:${palette[1]};font-weight:800;font-size:34px;box-shadow:0 10px 30px rgba(0,0,0,.25)}
.foot{position:absolute;left:70px;right:70px;bottom:44px;display:flex;justify-content:space-between;align-items:center;font-size:24px;font-weight:600;border-top:2px solid rgba(255,255,255,.28);padding-top:20px}
.foot b{font-weight:800}
.stack{position:absolute;right:92px;top:92px;width:230px;height:250px}
.card{position:absolute;width:170px;height:215px;border-radius:16px;background:rgba(255,255,255,.92);box-shadow:0 14px 34px rgba(0,0,0,.28)}
.card.a{left:60px;top:0;transform:rotate(9deg);opacity:.55}.card.b{left:30px;top:16px;transform:rotate(3deg);opacity:.75}.card.c{left:0;top:34px;transform:rotate(-4deg)}
.card i{position:absolute;left:22px;right:22px;height:11px;border-radius:6px;background:${palette[0]};opacity:.85}
</style></head><body><div class="wrap"><div class="ring"></div><div class="ring two"></div>
<div class="brand"><span class="logo">📚</span>Ompath Study</div>
<div class="stack"><div class="card a"></div><div class="card b"></div><div class="card c"><i style="top:34px;right:70px"></i><i style="top:62px"></i><i style="top:88px;opacity:.5"></i><i style="top:114px"></i><i style="top:140px;opacity:.5;right:60px"></i></div></div>
<div class="tag">${esc(tag)}</div><h1>${esc(title)}</h1><div class="sub">${esc(subtitle)}</div>
${chip ? `<div class="chip">${esc(chip)}</div>` : ""}
<div class="foot"><span>Used at MKU &amp; other universities</span><span><b>${esc((registry.thumbnailCredit ?? registry.credit))}</b></span></div>
</div></body></html>`;
}

const jobs = [];
for (const lib of registry.libraries) {
  const data = JSON.parse(fs.readFileSync(path.join(root, "public/data", lib.dataFile), "utf8"));
  const total = data.d.reduce((s, n) => s + countFiles(n), 0);
  jobs.push({ name: `${lib.slug}.jpg`, tag: `${lib.label} · MBChB`, title: lib.title, subtitle: lib.tagline, chip: `${total.toLocaleString("en")} files`, palette: PALETTE[hash(lib.slug) % PALETTE.length] });
  for (const subject of data.d) {
    const types = (subject.d ?? []).map((t) => t.n).join(" · ");
    jobs.push({
      name: `${lib.slug}-${subject.s}.jpg`, tag: `${lib.label} · ${lib.rootLabel === "departments" ? "Department" : "Subject"}`,
      title: subject.n, subtitle: "Notes · Slides · Past Papers · Books", chip: `${countFiles(subject).toLocaleString("en")} files`,
      palette: PALETTE[hash(`${lib.slug}-${subject.s}`) % PALETTE.length], note: types,
    });
  }
}
for (const o of registry.outlines) {
  jobs.push({ name: `outline-${o.slug}.jpg`, tag: `Year ${o.year} · Course outline`, title: o.department, subtitle: `${o.tagline} — tick off topics as you revise`, chip: "Progress tracker", palette: PALETTE[hash(o.slug) % PALETTE.length] });
}
for (const y of registry.timetables.years) {
  jobs.push({ name: `timetable-${y.slug}.jpg`, tag: `Year ${y.year} · ${registry.timetables.term}`, title: `Year ${y.year} Timetable`, subtitle: `${registry.timetables.period} · units, venues & lecturers`, chip: "MKU MBChB", palette: PALETTE[hash(`tt-${y.slug}`) % PALETTE.length] });
}
jobs.push({ name: "outline-all.jpg", tag: "Years 1–4 · MBChB", title: "Course Outlines", subtitle: "Every unit across Years 1–4 with a tick-off tracker", chip: `${registry.outlines.length} outlines + checklists`, palette: PALETTE[3] });

// One browser for every image: drive it over the DevTools protocol and save compressed JPEGs (~60-80 KB each).
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "og-"));
const chrome = spawn(CHROME, ["--headless=new", "--remote-debugging-port=9444", `--user-data-dir=${path.join(tmp, "profile")}`, "--window-size=1200,630", "--hide-scrollbars", "--force-device-scale-factor=1", "--no-first-run", "--disable-gpu", "about:blank"], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl = null;
for (let i = 0; i < 40 && !wsUrl; i++) {
  try { wsUrl = (await (await fetch("http://127.0.0.1:9444/json")).json()).find((t) => t.type === "page")?.webSocketDebuggerUrl ?? null; } catch { /* starting */ }
  if (!wsUrl) await sleep(500);
}
if (!wsUrl) { chrome.kill(); throw new Error("Chrome did not start"); }
const ws = new WebSocket(wsUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const waiting = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && waiting.has(msg.id)) { waiting.get(msg.id)(msg.result ?? msg.error); waiting.delete(msg.id); } };
const send = (method, params = {}) => new Promise((res) => { const i = ++id; waiting.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 1200, height: 630, deviceScaleFactor: 1, mobile: false });

let done = 0;
for (const job of jobs) {
  const page = path.join(tmp, "page.html");
  fs.writeFileSync(page, html(job));
  await send("Page.navigate", { url: `file:///${page.replace(/\\/g, "/")}` });
  await sleep(450);
  const shot = await send("Page.captureScreenshot", { format: "jpeg", quality: 84, clip: { x: 0, y: 0, width: 1200, height: 630, scale: 1 } });
  if (!shot.data) { console.error("FAILED", job.name); continue; }
  fs.writeFileSync(path.join(outDir, job.name), Buffer.from(shot.data, "base64"));
  done++;
}
ws.close(); chrome.kill();
console.log(`thumbnails written: ${done}/${jobs.length} -> public/og/library`);
