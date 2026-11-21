// GET /api/crypto/status?id=END-C-...  -> { id, status, message }. Polls the gateway as a backup to the webhook.
const gw = require("../_lib/gateway");
const { sql } = require("../_lib/db");
const { applyStatus } = require("../_lib/orders");
const MESSAGES = {
  PENDING: "Waiting for your payment.",
  CONFIRMING: "Payment seen. Waiting for network confirmation.",
  PAID: "Payment received. The café is preparing your order.",
  FAILED_UNDERPAID: "The amount you sent was less than the order amount, so the order is cancelled. Contact Endiro with your order number for a refund.",
  EXPIRED: "The payment time ended. No money was taken. Start a new order.",
  FAILED: "The payment failed. No order was placed.",
  REFUNDED: "The payment was refunded.",
};
module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  const id = String((req.query && req.query.id) || "").slice(0, 40);
  if (!/^END-C-[A-Z0-9-]+$/.test(id)) return res.status(400).json({ error: "Bad order id" });
  const db = sql();
  if (!db || !gw.configured()) return res.status(200).json({ id, status: "PENDING", demo: true, message: MESSAGES.PENDING });
  let rows = await db`select status, gw_payment_id, updated_at, created_at from crypto_orders where id = ${id}`;
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  const r = rows[0];
  const last = new Date(r.updated_at || r.created_at).getTime();
  if (["PENDING", "CONFIRMING"].includes(r.status) && r.gw_payment_id && Date.now() - last > 20000) {
    try { await applyStatus(db, id, await gw.getPayment(r.gw_payment_id), gw.mapStatus); } catch (_) {}
    rows = await db`select status from crypto_orders where id = ${id}`;
  }
  const status = rows[0].status;
  return res.status(200).json({ id, status, message: MESSAGES[status] || MESSAGES.PENDING });
};
