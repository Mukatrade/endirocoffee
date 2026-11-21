// POST /api/hooks/nowpayments  (NOWPayments IPN). Signature check, then order status update.
const np = require("../_lib/nowpay");
const { sql } = require("../_lib/db");

module.exports.config = { api: { bodyParser: false } };

function readRaw(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

async function telegram(text) {
  const t = process.env.TELEGRAM_BOT_TOKEN, c = process.env.TELEGRAM_CHAT_ID;
  if (!t || !c) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: c, text }),
  }).catch(() => {});
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).end();
  const raw = typeof req.body === "string" ? req.body : req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : await readRaw(req);
  if (!np.verifyIpn(raw, req.headers["x-nowpayments-sig"])) return res.status(401).json({ error: "Invalid signature" });

  let p;
  try { p = JSON.parse(raw); } catch { return res.status(400).json({ error: "Invalid JSON" }); }
  const orderId = String(p.order_id || "");
  const status = np.mapStatus(p.payment_status);
  const db = sql();
  if (!db) return res.status(500).json({ error: "No database" });

  const rows = await db`select status, amount_usd from crypto_orders where id = ${orderId}`;
  if (!rows[0]) return res.status(404).json({ error: "Unknown order" });
  const cur = rows[0];

  // Guard: the invoice price must match what we stored.
  if (p.price_amount != null && Math.abs(Number(p.price_amount) - Number(cur.amount_usd)) > 0.01) {
    await db`update crypto_orders set status = 'FAILED', np_status = 'price_mismatch', updated_at = now() where id = ${orderId}`;
    return res.status(200).json({ ok: false, reason: "price mismatch" });
  }

  // Final states do not go back. PAID can only become REFUNDED.
  const FINAL = new Set(["PAID", "FAILED_UNDERPAID", "EXPIRED", "FAILED", "REFUNDED"]);
  const allowed = !FINAL.has(cur.status) || (cur.status === "PAID" && status === "REFUNDED");
  if (!allowed || cur.status === status) {
    await db`update crypto_orders set np_status = ${String(p.payment_status || "")}, updated_at = now() where id = ${orderId}`;
    return res.status(200).json({ ok: true, unchanged: true });
  }

  await db`update crypto_orders set status = ${status}, np_status = ${String(p.payment_status || "")},
           np_payment_id = ${String(p.payment_id || "")}, pay_currency = ${String(p.pay_currency || "")},
           actually_paid = ${p.actually_paid != null ? String(p.actually_paid) : null}, updated_at = now()
           where id = ${orderId}`;

  if (status === "PAID") await telegram(`Endiro crypto order PAID: ${orderId}, USD ${cur.amount_usd}, ${p.pay_currency || ""}`);
  if (status === "FAILED_UNDERPAID") await telegram(`Endiro crypto order UNDERPAID, rejected: ${orderId}. Paid ${p.actually_paid} ${p.pay_currency}. Do not prepare.`);
  return res.status(200).json({ ok: true, status });
};
