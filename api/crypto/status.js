// GET /api/crypto/status?id=END-C-...  -> { id, status, amountUgx, amountUsd, payCurrency }
const { sql } = require("../_lib/db");
const MESSAGES = {
  PAID: "Payment received. The café is preparing your order.",
  PENDING: "Waiting for the payment to confirm on the network.",
  FAILED_UNDERPAID: "The amount you sent was less than the invoice. The order is cancelled. Contact NOWPayments support with your payment ID for a refund.",
  EXPIRED: "The payment time ended. No money was taken. Start a new order.",
  FAILED: "The payment failed. No order was placed.",
  REFUNDED: "The payment was refunded.",
};
module.exports = async (req, res) => {
  const id = String((req.query && req.query.id) || "").slice(0, 40);
  if (!/^END-C-[A-Z0-9-]+$/.test(id)) return res.status(400).json({ error: "Bad order id" });
  const db = sql();
  if (!db) return res.status(200).json({ id, status: "PENDING", demo: true, message: MESSAGES.PENDING });
  const rows = await db`select id, status, amount_ugx, amount_usd, pay_currency, np_payment_id from crypto_orders where id = ${id}`;
  if (!rows[0]) return res.status(404).json({ error: "Not found" });
  const r = rows[0];
  res.setHeader("Cache-Control", "no-store");
  return res.status(200).json({ id: r.id, status: r.status, message: MESSAGES[r.status] || MESSAGES.PENDING,
    amountUgx: Number(r.amount_ugx), amountUsd: Number(r.amount_usd), payCurrency: r.pay_currency, paymentId: r.np_payment_id });
};
