// MUDA Pay (https://payments-doc.muda.tech): mobile money collections (PULL) for client bills.
// Env (Vercel): MUDA_API_KEY, MUDA_SECRET_KEY (Muda dashboard > Settings > API keys).
// Optional: MUDA_API_URL (default https://api.muda.tech), MUDA_PRODUCT_<CUR> (force a product id, for example MUDA_PRODUCT_UGX=10012).
// The browser never sees the keys. A webhook is only a signal: a payment is marked paid only after we ask Muda for the transaction ourselves.
import crypto from "node:crypto";

const BASE = () => String(process.env.MUDA_API_URL || "https://api.muda.tech").replace(/\/$/, "");
export const mudaReady = () => !!(process.env.MUDA_API_KEY && process.env.MUDA_SECRET_KEY);

let fetchFn = (...a) => fetch(...a);
export function setMudaFetch(fn) { fetchFn = fn; tok = null; prod = null; }     // tests plug in a fake Muda

let tok = null;                                            // { value, until } cached per warm server
async function token() {
  if (tok && tok.until > Date.now() + 60000) return tok.value;
  const key = String(process.env.MUDA_API_KEY || "").trim(), secret = String(process.env.MUDA_SECRET_KEY || "").trim();
  if (!key || !secret) throw new Error("Muda sign in: the API key or the secret key is empty");
  const r = await call("POST", "/v1/clients/oauth/token", { api_key: key, secret_key: secret }, true);
  const d = (r && typeof r.data === "object" && r.data) || r || {}, dd = (d && typeof d.data === "object" && d.data) || {};
  const v = d.access_token || d.accessToken || d.token || d.jwt || dd.access_token || dd.accessToken || dd.token || (typeof r.data === "string" && r.data.split(".").length === 3 ? r.data : "");
  if (!v) {   // say what Muda answered, without values that could be secret
    const shape = o => o && typeof o === "object" ? Object.keys(o).map(k => k + (o[k] && typeof o[k] === "object" ? "{" + Object.keys(o[k]).join(",") + "}" : "")).join(", ") : typeof o;
    throw new Error("Muda sign in failed: " + String(r.message || r.error || d.message || "no token in the answer").slice(0, 200) + (r.status !== undefined ? " (status " + r.status + ")" : "") + ". Answer fields: " + shape(r));
  }
  tok = { value: v, until: Date.now() + (Number(d.expires_in || dd.expires_in) || 3600) * 1000 };
  return v;
}
async function call(method, path, payload, noAuth) {
  const h = { "Content-Type": "application/json", Accept: "application/json" };
  if (!noAuth) h.Authorization = "Bearer " + await token();
  const r = await fetchFn(BASE() + path, { method, headers: h, body: payload ? JSON.stringify(payload) : undefined, signal: AbortSignal.timeout(20000) });
  const text = await r.text(); let j = {}; try { j = text ? JSON.parse(text) : {}; } catch (e) { j = { message: text.slice(0, 200) }; }
  if (r.status === 401 && !noAuth) tok = null;            // token ended early: the next call signs in again
  if (r.status >= 400) { const e = new Error("Muda: " + String(j.message || j.error || r.status).slice(0, 200)); e.status = r.status; e.body = j; throw e; }
  return j;
}

/* Products: which product id collects (PULL) mobile money in a currency. Cached for 30 minutes. */
let prod = null;
export async function products() {
  if (prod && prod.until > Date.now()) return prod.list;
  const r = await call("GET", "/v1/payment/products");
  const list = Array.isArray(r.data) ? r.data : [];
  prod = { list, until: Date.now() + 30 * 60000 };
  return list;
}
export async function pullProduct(currency) {
  const cur = String(currency).toUpperCase(), forced = process.env["MUDA_PRODUCT_" + cur];
  const list = await products();
  const p = list.find(x => String(x.product_id) === String(forced || "")) ||
    list.find(x => x.status === "active" && String(x.currency).toUpperCase() === cur && x.transaction_type === "PULL" && /MOBILE/i.test(x.channel || x.product_code || ""));
  return p || null;
}

/* Phone numbers: international digits only, no "+" (Muda example 2547...). Local Uganda "07..." becomes "2567...". */
const CC = { UGX: "256", KES: "254", TZS: "255", GHS: "233", NGN: "234", XOF: "", XAF: "" };
export function msisdn(phone, currency) {
  let d = String(phone || "").replace(/[^\d]/g, ""); const cc = CC[String(currency).toUpperCase()] || "";
  if (d.startsWith("00")) d = d.slice(2);
  if (cc && d.startsWith("0") && d.length >= 9) d = cc + d.slice(1);
  if (cc && !d.startsWith(cc) && d.length === 9) d = cc + d;
  return /^\d{9,15}$/.test(d) ? d : "";
}
/* The network of a number, from Muda's list of prefixes (for example UG 25677 = MTN). */
let nets = null;
export async function networkOf(number, currency) {
  if (!nets || nets.until < Date.now()) { const r = await call("GET", "/v1/payment/mobile-network-operators").catch(() => ({ data: [] })); nets = { list: Array.isArray(r.data) ? r.data : [], until: Date.now() + 6 * 3600000 }; }
  const cur = String(currency).toUpperCase();
  for (const op of nets.list) if (String(op.currency_code).toUpperCase() === cur && (op.prefixes || []).some(p => number.startsWith(String(p.prefix)))) return String(op.operator_name || "");
  return "";
}

/* Start a collection: the client gets a prompt on the phone to approve. */
export async function collect({ reference, amount, currency, productId, phone }) {
  const r = await call("POST", "/v1/payment/direct-collection", { reference_id: reference, amount, trans_type: "PULL", currency, product_id: String(productId), account_number: phone, extra_data: {} });
  return read(r);
}
/* Second step for some currencies (XOF, XAF): the client types an OTP from the provider. */
export async function confirmOtp(transId, otp) { return read(await call("POST", "/v1/payment/direct-collection-processing", { trans_id: transId, otp })); }
/* The truth about a payment: always asked from Muda by our own reference. */
export async function byReference(reference) { return read(await call("GET", "/v1/payment/transactionReferenceId/" + encodeURIComponent(reference))); }
export async function balance() { const r = await call("GET", "/v1/payment/balance"); return Array.isArray(r.data) ? r.data : []; }

function read(r) {
  const d = r && typeof r.data === "object" && r.data && !Array.isArray(r.data) ? { ...r, ...r.data } : (r || {});
  const pc = d.payment_confirmation || {};
  return { status: String(d.status || "").toUpperCase(), transId: String(d.trans_id || d.transaction_id || ""), reference: String(d.reference_id || ""), amount: d.amount === undefined ? null : Number(d.amount),
    currency: String(d.currency || "").toUpperCase(), transType: String(d.trans_type || "").toUpperCase(), fee: d.fee === undefined ? null : Number(d.fee), otp: pc.otp === true || pc.otp === "true", message: String(d.message || r.message || "").slice(0, 300), raw: r };
}
export const isPaid = s => /^(SUCCESS|SUCCESSFUL|COMPLETED|PAID)$/.test(String(s).toUpperCase());
export const isFailed = s => /^(FAILED|FAIL|REJECTED|DECLINED|CANCELLED|CANCELED|EXPIRED|REVERSED|ERROR)$/.test(String(s).toUpperCase());

/* Webhook signature (optional at Muda): X-Signature = hex HMAC-SHA256(api_key, "<X-Timestamp>.<JSON body>"), X-Timestamp in ms, max 5 minutes old.
   Returns "valid", "invalid", "old" or "none". We never trust the body alone: the caller asks Muda for the transaction before any change. */
export function checkSignature(headers, rawBody, now = Date.now()) {
  const sig = String(headers["x-signature"] || ""), ts = String(headers["x-timestamp"] || "");
  if (!sig || !ts) return "none";
  if (!(Math.abs(now - Number(ts)) <= 5 * 60000)) return "old";
  const want = crypto.createHmac("sha256", String(process.env.MUDA_API_KEY || "")).update(ts + "." + rawBody).digest("hex");
  const a = Buffer.from(want), b = Buffer.from(sig.toLowerCase());
  return a.length === b.length && crypto.timingSafeEqual(a, b) ? "valid" : "invalid";
}
