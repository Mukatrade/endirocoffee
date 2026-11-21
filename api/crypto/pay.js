// POST /api/crypto/pay  { lines:[{id,qty}], coin, name, phone, branch, mode, time }
// -> { orderId, coin, coinLabel, payAmount, payAddress, extraId, expiresAt, qrSvg, amountUgx, amountUsd }
const crypto = require("crypto");
const QR = require("qrcode");
const gw = require("../_lib/gateway");
const { sql } = require("../_lib/db");
const { ugxPerUsd } = require("../_lib/fx");
const { priceCart } = require("../_lib/menu");

const clean = (v, n = 120) => String(v == null ? "" : v).replace(/[\u0000-\u001f]/g, "").slice(0, n);
const siteUrl = (req) => (process.env.PUBLIC_SITE_URL || "").trim().replace(/\/$/, "") || `https://${req.headers["x-forwarded-host"] || req.headers.host}`;
const qr = (text) => QR.toString(text, { type: "svg", margin: 1, color: { dark: "#3A1E12", light: "#FBF6EC" } });

module.exports = async (req, res) => {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  let body = req.body;
  if (typeof body === "string") { try { body = JSON.parse(body); } catch { body = {}; } }
  body = body || {};
  const coin = clean(body.coin, 20).toLowerCase();
  if (!/^[a-z0-9]{2,20}$/.test(coin)) return res.status(400).json({ error: "Pick a coin." });

  let cart;
  try { cart = priceCart(body.lines); } catch (e) { return res.status(400).json({ error: e.message }); }
  const { rate, source } = await ugxPerUsd();
  const amountUsd = Math.ceil((cart.amountUgx / rate) * 100) / 100;
  const minUsd = Number(process.env.CRYPTO_MIN_USD || 3);
  if (amountUsd < minUsd) return res.status(400).json({ error: `Crypto needs an order of at least USD ${minUsd}. Use mobile money for small orders.` });

  const orderId = `END-C-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
  const base = { orderId, coin, coinLabel: gw.label(coin), ticker: gw.ticker(coin), amountUgx: cart.amountUgx, amountUsd, ugxPerUsd: rate };

  if (!gw.configured()) { // Demo mode: no keys yet. Nothing is charged.
    const addr = "DEMO-ADDRESS-NO-MONEY-IS-TAKEN";
    return res.status(200).json({ ...base, demo: true, payAmount: (amountUsd).toFixed(2), payAddress: addr, extraId: null,
      expiresAt: new Date(Date.now() + 20 * 60000).toISOString(), qrSvg: await qr(addr) });
  }

  const db = sql();
  if (!db) return res.status(500).json({ error: "Crypto payment is not set up yet. Use mobile money." });

  await db`insert into crypto_orders (id, name, phone, branch, mode, pickup_time, lines, amount_ugx, amount_usd, ugx_per_usd, rate_source, sandbox, status, pay_currency)
           values (${orderId}, ${clean(body.name)}, ${clean(body.phone, 30)}, ${clean(body.branch)}, ${clean(body.mode, 20)}, ${clean(body.time, 40)},
                   ${JSON.stringify(cart.lines)}, ${cart.amountUgx}, ${amountUsd}, ${rate}, ${source}, ${gw.SANDBOX}, 'PENDING', ${coin})`;
  try {
    const p = await gw.createPayment({ orderId, amountUsd, coin, ipnUrl: `${siteUrl(req)}/api/hooks/crypto` });
    await db`update crypto_orders set gw_payment_id = ${p.paymentId}, pay_address = ${p.payAddress}, pay_amount = ${p.payAmount},
             extra_id = ${p.extraId}, expires_at = ${p.expiresAt}, updated_at = now() where id = ${orderId}`;
    return res.status(201).json({ ...base, payAmount: p.payAmount, payAddress: p.payAddress, extraId: p.extraId,
      expiresAt: p.expiresAt || new Date(Date.now() + 20 * 60000).toISOString(), qrSvg: await qr(p.payAddress) });
  } catch (e) {
    await db`update crypto_orders set status = 'FAILED', gw_status = ${clean(e.message, 200)}, updated_at = now() where id = ${orderId}`.catch(() => {});
    const small = /minimal|less than|too small/i.test(e.message);
    return res.status(502).json({ error: small ? "This order is too small for that coin. Pick another coin." : "Could not start the crypto payment. Try another coin or use mobile money." });
  }
};
