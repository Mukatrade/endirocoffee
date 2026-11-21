// Shared helpers for the API: prices from data/menu.json, order ids, the optional Supabase store.
// Everything here runs free: Vercel Hobby functions, Supabase free tier (optional).
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

const ROOT = process.cwd();
let MENU = null, BRANCHES = null;
function load() {
  if (!MENU) MENU = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "menu.json"), "utf8"));
  if (!BRANCHES) BRANCHES = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "branches.json"), "utf8"));
}

/* The server prices every order again. The browser never sets a price. */
export function priceOrder(mode, lines) {
  load();
  const idx = {};
  const m = mode === "delivery" ? MENU.delivery : MENU.cafe;
  for (const g of Object.keys(m)) for (const s of m[g]) for (const it of s.items) for (const v of it.v) idx[v.k] = { name: it.name + (v.label ? ", " + v.label : ""), price: v.price };
  const out = [];
  for (const l of Array.isArray(lines) ? lines : []) {
    const it = idx[String(l.key)], q = Math.floor(Number(l.qty));
    if (!it || !(q > 0 && q <= 50)) continue;
    out.push({ key: String(l.key), name: it.name, price: it.price, qty: q });
  }
  return { lines: out, amount: out.reduce((a, l) => a + l.price * l.qty, 0) };
}
export function branch(id) { load(); return BRANCHES.find(b => b.id === id) || null; }

export function newOrderId() {
  const t = Date.now().toString(36).toUpperCase().slice(-5), r = crypto.randomBytes(2).toString("hex").toUpperCase();
  return "E-" + t + r;
}
export function pickupNumber(id) { return String(parseInt(crypto.createHash("sha1").update(id).digest("hex").slice(0, 6), 16) % 99 + 1); }

export const ugxPerUsd = () => Number(process.env.UGX_PER_USD || 3700);
export const sampleRate = () => !process.env.UGX_PER_USD;

/* Optional long-term memory: Supabase (free tier). Table SQL is in README.md.
   Without SUPABASE_URL and SUPABASE_SERVICE_KEY the site still works; orders are not kept. */
const SB = () => (process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SK = () => process.env.SUPABASE_SERVICE_KEY || "";
export const storeReady = () => !!(SB() && SK());
export async function sb(method, table, body, query = "") {
  if (!storeReady()) return null;
  const r = await fetch(`${SB()}/rest/v1/${table}${query}`, {
    method, headers: { apikey: SK(), Authorization: "Bearer " + SK(), "Content-Type": "application/json", Prefer: "return=representation" },
    body: body ? JSON.stringify(body) : undefined, signal: AbortSignal.timeout(10000)
  });
  const t = await r.text(); if (!r.ok) throw new Error("store " + r.status + ": " + t.slice(0, 200));
  return t ? JSON.parse(t) : null;
}
export async function saveOrder(o) { try { await sb("POST", "orders", o); } catch (e) { console.error("saveOrder", e.message); } }
export async function setStatus(id, status, extra = {}) {
  try { await sb("PATCH", "orders", { status, ...extra, updated_at: new Date().toISOString() }, "?id=eq." + encodeURIComponent(id)); } catch (e) { console.error("setStatus", e.message); }
}
export async function getOrder(id) {
  try { const r = await sb("GET", "orders", null, "?id=eq." + encodeURIComponent(id) + "&select=*"); return r && r[0] || null; } catch (e) { return null; }
}

/* Optional: tell the café about a paid order on Telegram (free). Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID. */
export async function notify(text) {
  const tok = process.env.TELEGRAM_BOT_TOKEN, chat = process.env.TELEGRAM_CHAT_ID;
  if (!tok || !chat) return;
  try { await fetch(`https://api.telegram.org/bot${tok}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chat, text }), signal: AbortSignal.timeout(8000) }); } catch (e) { console.error("notify", e.message); }
}

export async function readJson(req) {
  if (req.body && typeof req.body === "object") return req.body;
  const raw = await rawBody(req); try { return JSON.parse(raw || "{}"); } catch (e) { return {}; }
}
export function rawBody(req) {
  if (typeof req.body === "string") return Promise.resolve(req.body);
  return new Promise((ok, no) => { let d = ""; req.on("data", c => { d += c; if (d.length > 1e6) req.destroy(); }); req.on("end", () => ok(d)); req.on("error", no); });
}
export function send(res, code, obj) { res.statusCode = code; res.setHeader("Content-Type", "application/json"); res.setHeader("Cache-Control", "no-store"); res.end(JSON.stringify(obj)); }
