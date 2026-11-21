// One place that moves a crypto order between states (used by the webhook and by status polling).
const FINAL = new Set(["PAID", "FAILED_UNDERPAID", "EXPIRED", "FAILED", "REFUNDED"]);

async function telegram(text) {
  const t = process.env.TELEGRAM_BOT_TOKEN, c = process.env.TELEGRAM_CHAT_ID;
  if (!t || !c) return;
  await fetch(`https://api.telegram.org/bot${t}/sendMessage`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: c, text }),
  }).catch(() => {});
}

// p = gateway payload (payment_status, price_amount, actually_paid, pay_currency, payment_id)
async function applyStatus(db, orderId, p, mapStatus) {
  const rows = await db`select status, amount_usd from crypto_orders where id = ${orderId}`;
  if (!rows[0]) return { error: "unknown order" };
  const cur = rows[0];
  let status = mapStatus(p.payment_status);
  if (p.price_amount != null && Math.abs(Number(p.price_amount) - Number(cur.amount_usd)) > 0.01) status = "FAILED";
  const allowed = !FINAL.has(cur.status) || (cur.status === "PAID" && status === "REFUNDED");
  if (!allowed || cur.status === status) {
    await db`update crypto_orders set gw_status = ${String(p.payment_status || "")}, updated_at = now() where id = ${orderId}`;
    return { status: cur.status, changed: false };
  }
  await db`update crypto_orders set status = ${status}, gw_status = ${String(p.payment_status || "")},
           actually_paid = ${p.actually_paid != null ? String(p.actually_paid) : null}, updated_at = now()
           where id = ${orderId}`;
  if (status === "PAID") await telegram(`Endiro crypto order PAID: ${orderId}, USD ${cur.amount_usd}, ${String(p.pay_currency || "").toUpperCase()}. Prepare it.`);
  if (status === "FAILED_UNDERPAID") await telegram(`Endiro crypto order UNDERPAID, rejected: ${orderId}. Paid ${p.actually_paid} ${String(p.pay_currency || "").toUpperCase()}. Do not prepare.`);
  return { status, changed: true };
}

module.exports = { applyStatus, FINAL };
