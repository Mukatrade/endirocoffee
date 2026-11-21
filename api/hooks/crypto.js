// POST /api/hooks/crypto  (crypto gateway webhook). Signature check, then order status update.
import * as gw from "../_lib/gateway.js";
import { sql } from "../_lib/db.js";
import { applyStatus } from "../_lib/orders.js";
import { send, rawBody } from "../_lib/common.js";

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "POST only" });
  const raw = req.body && typeof req.body === "object" ? JSON.stringify(req.body) : await rawBody(req);
  if (!gw.verifyIpn(raw, req.headers["x-nowpayments-sig"])) return send(res, 401, { error: "bad signature" });
  let p; try { p = JSON.parse(raw); } catch { return send(res, 400, { error: "bad json" }); }
  const db = sql();
  if (!db) return send(res, 500, { error: "no database" });
  const out = await applyStatus(db, String(p.order_id || ""), p, gw.mapStatus);
  return send(res, out.error ? 404 : 200, out);
}
