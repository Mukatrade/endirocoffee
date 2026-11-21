// Crypto gateway client (server only). Provider: NOWPayments API, white-label use:
// the customer stays on the Endiro page. We never redirect to the provider page,
// never pass the customer's email, and never send provider text to the browser.
import crypto from "node:crypto";

const SANDBOX = String(process.env.NOWPAYMENTS_SANDBOX || "true").toLowerCase() === "true";
const API_BASE = SANDBOX ? "https://api-sandbox.nowpayments.io" : "https://api.nowpayments.io";
const API_KEY = (process.env.NOWPAYMENTS_API_KEY || "").trim();
const IPN_SECRET = (process.env.NOWPAYMENTS_IPN_SECRET || "").trim();

const configured = () => Boolean(API_KEY && IPN_SECRET);

async function call(path, opts = {}) {
  if (!API_KEY) throw new Error("gateway key missing");
  const res = await fetch(`${API_BASE}${path}`, {
    signal: AbortSignal.timeout(20000),
    ...opts,
    headers: { "Content-Type": "application/json", "x-api-key": API_KEY, ...(opts.headers || {}) },
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) { const e = new Error(json.message || `gateway ${res.status}`); e.status = res.status; throw e; }
  return json;
}

// Short labels for common coins. Unknown codes show in upper case.
const LABELS = {
  btc: "Bitcoin (BTC)", eth: "Ethereum (ETH)", ltc: "Litecoin (LTC)", doge: "Dogecoin (DOGE)", xrp: "XRP",
  trx: "TRON (TRX)", sol: "Solana (SOL)", ton: "Toncoin (TON)", bnbbsc: "BNB (BNB Chain)", matic: "Polygon (POL)",
  usdttrc20: "USDT (TRON)", usdterc20: "USDT (Ethereum)", usdtbsc: "USDT (BNB Chain)", usdtsol: "USDT (Solana)",
  usdtton: "USDT (TON)", usdtmatic: "USDT (Polygon)", usdc: "USDC (Ethereum)", usdcbsc: "USDC (BNB Chain)",
  usdcsol: "USDC (Solana)", usdcmatic: "USDC (Polygon)", dai: "DAI (Ethereum)",
};
const label = (code) => LABELS[code] || code.toUpperCase();
const ticker = (code) => (/^(usdt|usdc|dai)/.exec(code) || [])[1]?.toUpperCase() || (code === "bnbbsc" ? "BNB" : code.toUpperCase());
const ORDER = ["usdttrc20", "usdtbsc", "usdtsol", "usdcsol", "usdterc20", "usdc", "btc", "eth", "ltc", "trx", "sol", "bnbbsc", "ton", "doge", "xrp"];

let coinCache = null; // { at, coins:[{code,label,minUsd}] }
async function coins() {
  if (coinCache && Date.now() - coinCache.at < 60 * 60 * 1000) return coinCache.coins;
  let codes = [];
  try { codes = (await call("/v1/merchant/coins")).selectedCurrencies || []; } catch (_) {}
  if (!codes.length) codes = ((await call("/v1/currencies?fixed_rate=true")).currencies || []);
  codes = codes.map((c) => String(c).toLowerCase())
    .sort((a, b) => ((ORDER.indexOf(a) + 1 || 999) - (ORDER.indexOf(b) + 1 || 999)) || a.localeCompare(b))
    .slice(0, 60);
  const list = await Promise.all(codes.map(async (code) => {
    try {
      const m = await call(`/v1/min-amount?currency_from=${encodeURIComponent(code)}&fiat_equivalent=usd&is_fixed_rate=true&is_fee_paid_by_user=true`);
      return { code, label: label(code), minUsd: Number(m.fiat_equivalent) || null };
    } catch (_) { return null; }
  }));
  coinCache = { at: Date.now(), coins: list.filter(Boolean) };
  return coinCache.coins;
}

async function createPayment({ orderId, amountUsd, coin, ipnUrl, description }) {
  const p = await call("/v1/payment", {
    method: "POST",
    body: JSON.stringify({
      price_amount: Number(amountUsd.toFixed(2)),
      price_currency: "usd",
      pay_currency: coin,
      order_id: orderId,
      order_description: description || `Endiro Coffee order ${orderId}`,
      ipn_callback_url: ipnUrl,
      is_fee_paid_by_user: true,
      is_fixed_rate: true,
    }),
  });
  return {
    paymentId: String(p.payment_id || ""),
    payAddress: p.pay_address,
    payAmount: String(p.pay_amount),
    payCurrency: String(p.pay_currency || coin).toLowerCase(),
    extraId: p.payin_extra_id || null,
    expiresAt: p.expiration_estimate_date || p.valid_until || null,
    status: p.payment_status,
  };
}

const getPayment = (paymentId) => call(`/v1/payment/${encodeURIComponent(paymentId)}`);

function sortDeep(v) {
  if (Array.isArray(v)) return v.map(sortDeep);
  if (v && typeof v === "object") return Object.keys(v).sort().reduce((o, k) => ((o[k] = sortDeep(v[k])), o), {});
  return v;
}
function safeEqual(a, b) {
  const x = Buffer.from(String(a).toLowerCase()), y = Buffer.from(String(b).trim().toLowerCase());
  return x.length === y.length && crypto.timingSafeEqual(x, y);
}
// IPN: HMAC-SHA512 of the body with keys sorted A to Z (official), or the raw body (Goldigger form).
function verifyIpn(rawBody, signature, secret = IPN_SECRET) {
  if (!secret || !signature) return false;
  const h = (s) => crypto.createHmac("sha512", secret).update(s).digest("hex");
  let sorted;
  try { sorted = JSON.stringify(sortDeep(JSON.parse(rawBody))); } catch { return false; }
  return safeEqual(h(sorted), signature) || safeEqual(h(rawBody), signature);
}

// Gateway status -> Endiro status. Underpayment is rejected (Yaron, 2026-11-21).
function mapStatus(s) {
  switch (String(s || "").toLowerCase()) {
    case "finished": case "confirmed": case "sending": return "PAID";
    case "partially_paid": return "FAILED_UNDERPAID";
    case "expired": return "EXPIRED";
    case "failed": return "FAILED";
    case "refunded": return "REFUNDED";
    case "confirming": return "CONFIRMING";
    default: return "PENDING";
  }
}

export { SANDBOX, configured, coins, createPayment, getPayment, verifyIpn, mapStatus, sortDeep, label, ticker };
