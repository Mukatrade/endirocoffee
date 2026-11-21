// NOWPayments (crypto) as used in Goldigger: hosted invoice in USDT, IPN webhook signed with HMAC-SHA512.
// Env: NOWPAYMENTS_API_KEY, NOWPAYMENTS_IPN_SECRET, optional NOWPAYMENTS_PAY_CURRENCY (default usdttrc20).
import crypto from "node:crypto";

const BASE = () => (process.env.NOWPAYMENTS_API_BASE || "https://api.nowpayments.io").replace(/\/$/, "");
export const npReady = () => !!process.env.NOWPAYMENTS_API_KEY;

export async function createInvoice({ orderId, usd, description, ipnUrl, successUrl, cancelUrl }) {
  const r = await fetch(BASE() + "/v1/invoice", {
    method: "POST",
    headers: { "x-api-key": process.env.NOWPAYMENTS_API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ price_amount: Number(usd.toFixed(2)), price_currency: "usd", pay_currency: (process.env.NOWPAYMENTS_PAY_CURRENCY || "usdttrc20").toLowerCase(),
      order_id: orderId, order_description: description, ipn_callback_url: ipnUrl, success_url: successUrl, cancel_url: cancelUrl }),
    signal: AbortSignal.timeout(20000)
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.invoice_url) throw new Error("NOWPayments: " + String(j.message || r.status).slice(0, 200));
  return { id: String(j.id), url: j.invoice_url };
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") return Object.keys(v).sort().reduce((o, k) => { o[k] = sortDeep(v[k]); return o; }, {});
  return v;
}
/* NOWPayments signs the JSON body with keys sorted. Some setups sign the raw body. Both are accepted. */
export function verifyIpn(raw, sig) {
  const secret = process.env.NOWPAYMENTS_IPN_SECRET;
  if (!secret || !sig) return false;
  const want = String(sig).trim().toLowerCase();
  const cands = [raw];
  try { cands.push(JSON.stringify(sortDeep(JSON.parse(raw)))); } catch (e) {}
  return cands.some(c => {
    const h = crypto.createHmac("sha512", secret).update(c).digest("hex");
    return h.length === want.length && crypto.timingSafeEqual(Buffer.from(h), Buffer.from(want));
  });
}
export const npPaid = s => /^(finished|confirmed)$/i.test(String(s));
export const npFailed = s => /^(failed|expired|refunded)$/i.test(String(s));
