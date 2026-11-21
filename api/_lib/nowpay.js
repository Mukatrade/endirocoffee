// NOWPayments client for the Endiro site. Same flow as Goldigger (lib/nowpayments.ts), plus:
// sandbox switch, all coins (no pay_currency), customer pays the fees, fixed rate.
const crypto = require("crypto");

const SANDBOX = String(process.env.NOWPAYMENTS_SANDBOX || "true").toLowerCase() === "true";
const API_BASE = SANDBOX ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
const API_KEY = (process.env.NOWPAYMENTS_API_KEY || "").trim();
const IPN_SECRET = (process.env.NOWPAYMENTS_IPN_SECRET || "").trim();

function configured() {
  return Boolean(API_KEY && IPN_SECRET);
}

async function createInvoice({ orderId, amountUsd, description, successUrl, cancelUrl, ipnUrl }) {
  if (!API_KEY) throw new Error("NOWPAYMENTS_API_KEY is missing");
  const payload = {
    price_amount: Number(amountUsd.toFixed(2)),
    price_currency: "usd",
    // No pay_currency: the customer picks any coin on the NOWPayments page.
    order_id: orderId,
    order_description: description,
    ipn_callback_url: ipnUrl,
    success_url: successUrl,
    cancel_url: cancelUrl,
    is_fee_paid_by_user: true,
    is_fixed_rate: true,
  };
  const res = await fetch(`${API_BASE}/v1/invoice`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.invoice_url) {
    throw new Error(json.message || `NOWPayments error ${res.status}`);
  }
  return { invoiceId: String(json.id || ""), invoiceUrl: json.invoice_url };
}

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") {
    return Object.keys(v).sort().reduce((o, k) => ((o[k] = sortDeep(v[k])), o), {});
  }
  return v;
}

function safeEqual(a, b) {
  const x = Buffer.from(String(a).toLowerCase());
  const y = Buffer.from(String(b).trim().toLowerCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}

// NOWPayments signs the body with keys sorted A to Z, HMAC-SHA512 with the IPN secret,
// header x-nowpayments-sig. We accept the sorted form (official) or the raw body (Goldigger form).
function verifyIpn(rawBody, signature, secret = IPN_SECRET) {
  if (!secret || !signature) return false;
  const hmac = (s) => crypto.createHmac("sha512", secret).update(s).digest("hex");
  let sorted = null;
  try { sorted = JSON.stringify(sortDeep(JSON.parse(rawBody))); } catch { return false; }
  return safeEqual(hmac(sorted), signature) || safeEqual(hmac(rawBody), signature);
}

// NOWPayments status -> Endiro order status. Underpayment is rejected (Yaron, 2026-11-21).
function mapStatus(np) {
  switch (String(np || "").toLowerCase()) {
    case "finished":
    case "confirmed":
    case "sending":
      return "PAID";
    case "partially_paid":
      return "FAILED_UNDERPAID";
    case "expired":
      return "EXPIRED";
    case "failed":
      return "FAILED";
    case "refunded":
      return "REFUNDED";
    default:
      return "PENDING"; // waiting, confirming
  }
}

module.exports = { SANDBOX, API_BASE, configured, createInvoice, verifyIpn, mapStatus, sortDeep };
