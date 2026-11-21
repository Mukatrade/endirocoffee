// POST /api/hooks/crypto  (gateway webhook). Signature check, then order status update.
const gw = require("../_lib/gateway");
const { sql } = require("../_lib/db");
const { applyStatus } = require("../_lib/orders");
const readRaw = (req) => new Promise((ok, no) => { let d = ""; req.on("data", (c) => (d += c)); req.on("end", () => ok(d)); req.on("error", no); });

const handler = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const raw = typeof req.body === "string" ? req.body : req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : await readRaw(req);
  if (!gw.verifyIpn(raw, req.headers["x-nowpayments-sig"])) return res.status(401).json({ error: "bad signature" });
  let p; try { p = JSON.parse(raw); } catch { return res.status(400).json({ error: "bad json" }); }
  const db = sql();
  if (!db) return res.status(500).json({ error: "no database" });
  const out = await applyStatus(db, String(p.order_id || ""), p, gw.mapStatus);
  return res.status(out.error ? 404 : 200).json(out);
};
handler.config = { api: { bodyParser: false } };
module.exports = handler;
