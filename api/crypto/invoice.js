// POST /api/crypto/invoice  { lines:[{id,qty}], name, phone, branch, mode, time }
// -> { orderId, invoiceUrl, amountUgx, amountUsd, ugxPerUsd, sandbox }
const crypto = require("crypto");
const np = require("../_lib/nowpay");
const { sql } = require("../_lib/db");
const { ugxPerUsd } = require("../_lib/fx");
const { priceCart } = require("../_lib/menu");

const clean = (v, n = 120) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, "").slice(0, n);

function siteUrl(req) {
  const env = (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "");
  if (env) return env;
  const host = req.headers["x-forwarded-host"] || req.headers.host;
  return `https://${host}`;
}

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};

  let cart;
  try { cart = priceCart(body.lines); } catch (e) { return res.status(400).json({ error: e.message }); }

  const { rate, source } = await ugxPerUsd();
  const amountUsd = Math.ceil((cart.amountUgx / rate) * 100) / 100;
  const minUsd = Number(process.env.CRYPTO_MIN_USD || 3);
  if (amountUsd < minUsd) {
    return res.status(400).json({ error: `Crypto needs an order of at least USD ${minUsd}. Use mobile money for small orders.` });
  }

  const orderId = `END-C-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const base = siteUrl(req);

  // Demo mode: no keys yet. Nothing is charged.
  if (!np.configured()) {
    return res.status(200).json({ orderId, demo: true, invoiceUrl: `${base}/checkout.html?crypto=demo&order=${orderId}`,
      amountUgx: cart.amountUgx, amountUsd, ugxPerUsd: rate, rateSource: source });
  }

  const db = sql();
  if (!db) return res.status(500).json({ error: "DATABASE_URL is missing. Crypto needs the Neon store." });

  await db`insert into crypto_orders (id, name, phone, branch, mode, pickup_time, lines, amount_ugx, amount_usd, ugx_per_usd, rate_source, sandbox, status)
           values (${orderId}, ${clean(body.name)}, ${clean(body.phone, 30)}, ${clean(body.branch)}, ${clean(body.mode, 20)}, ${clean(body.time, 40)},
                   ${JSON.stringify(cart.lines)}, ${cart.amountUgx}, ${amountUsd}, ${rate}, ${source}, ${np.SANDBOX}, 'PENDING')`;

  try {
    const inv = await np.createInvoice({
      orderId,
      amountUsd,
      description: `Endiro Coffee order ${orderId}`,
      successUrl: `${base}/checkout.html?crypto=success&order=${orderId}`,
      cancelUrl: `${base}/checkout.html?crypto=cancel&order=${orderId}`,
      ipnUrl: `${base}/api/hooks/nowpayments`,
    });
    await db`update crypto_orders set invoice_id = ${inv.invoiceId}, updated_at = now() where id = ${orderId}`;
    return res.status(201).json({ orderId, invoiceUrl: inv.invoiceUrl, amountUgx: cart.amountUgx, amountUsd,
      ugxPerUsd: rate, rateSource: source, sandbox: np.SANDBOX });
  } catch (e) {
    await db`update crypto_orders set status = 'FAILED', np_status = ${clean(e.message, 200)}, updated_at = now() where id = ${orderId}`.catch(() => {});
    return res.status(502).json({ error: "Could not open the crypto payment. Try again or use mobile money." });
  }
};
