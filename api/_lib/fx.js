// Live UGX per USD. Free API (open.er-api.com, no key), cached 1 hour in memory and in Neon.
// Fallback: UGX_PER_USD env, then 3700.
const { sql } = require("./db");
const TTL_MS = 60 * 60 * 1000;
let mem = null; // { rate, at }

function fallback() {
  const n = Number(process.env.UGX_PER_USD);
  return Number.isFinite(n) && n > 1000 ? n : 3700;
}

async function fetchLive() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  const j = await res.json();
  const r = Number(j && j.rates && j.rates.UGX);
  if (!res.ok || !Number.isFinite(r) || r < 1000 || r > 10000) throw new Error("bad rate");
  return r;
}

async function ugxPerUsd() {
  const now = Date.now();
  if (mem && now - mem.at < TTL_MS) return { rate: mem.rate, source: "cache" };
  const db = sql();
  if (db) {
    try {
      const rows = await db`select rate, fetched_at from fx_rates where pair = 'USD_UGX'`;
      if (rows[0] && now - new Date(rows[0].fetched_at).getTime() < TTL_MS) {
        mem = { rate: Number(rows[0].rate), at: new Date(rows[0].fetched_at).getTime() };
        return { rate: mem.rate, source: "db" };
      }
    } catch (_) { /* table missing: go on */ }
  }
  try {
    const rate = await fetchLive();
    mem = { rate, at: now };
    if (db) {
      await db`insert into fx_rates (pair, rate, fetched_at) values ('USD_UGX', ${rate}, now())
               on conflict (pair) do update set rate = excluded.rate, fetched_at = excluded.fetched_at`.catch(() => {});
    }
    return { rate, source: "live" };
  } catch (_) {
    return { rate: mem ? mem.rate : fallback(), source: "fallback" };
  }
}

module.exports = { ugxPerUsd, fallback };
