// Start a payment. Mobile money: MUDA Pay sends a PIN prompt to the phone (same flow as Buy2Africa).
// Crypto: the customer pays on this site (address + QR). Many coins. Without keys the order runs in demo mode.
import { readJson, send, priceOrder, branch, newOrderId, pickupNumber, saveOrder } from "../_lib/common.js";
import { mudaReady, pullProduct, collect, msisdn } from "../_lib/muda.js";
import QR from "qrcode";
import * as gw from "../_lib/gateway.js";
import { sql } from "../_lib/db.js";
import { ugxPerUsd as liveRate } from "../_lib/fx.js";

const qrSvg = (t) => QR.toString(t, { type: "svg", margin: 1, color: { dark: "#3A1E12", light: "#FBF6EC" } });

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  const b = await readJson(req);
  const mode = b.mode === "delivery" ? "delivery" : "pickup";
  const br = branch(String(b.branch || ""));
  if (!br) return send(res, 400, { error: "Choose a café." });
  const { lines, amount } = priceOrder(mode, b.lines);
  if (!lines.length || amount < 500) return send(res, 400, { error: "Your order is empty." });
  const name = String(b.name || "").trim().slice(0, 80), phone = String(b.phone || "").trim().slice(0, 30);
  if (name.length < 2 || phone.replace(/\D/g, "").length < 9) return send(res, 400, { error: "Fill in your name and a phone number." });
  const method = ["mtn", "airtel", "crypto"].includes(b.method) ? b.method : "mtn";
  const id = newOrderId(), pickup = pickupNumber(id);
  const host = "https://" + (req.headers["x-forwarded-host"] || req.headers.host);
  const order = { id, pickup, mode, branch: br.id, branch_name: br.name, time: String(b.time || "").slice(0, 40), name, phone, method, lines, amount, currency: "UGX", status: "PENDING", created_at: new Date().toISOString() };

  try {
    if (method === "crypto") {
      const coin = String(b.coin || "").toLowerCase();
      if (!/^[a-z0-9]{2,20}$/.test(coin)) return send(res, 400, { error: "Pick a coin." });
      const { rate, source } = await liveRate();
      const usd = Math.ceil((amount / rate) * 100) / 100;
      const minUsd = Number(process.env.CRYPTO_MIN_USD || 3);
      if (usd < minUsd) return send(res, 400, { error: `Crypto needs an order of at least USD ${minUsd}. Use mobile money for this order.` });
      const base = { id, pickup, amount, usd, coin, coinLabel: gw.label(coin), ticker: gw.ticker(coin) };
      if (!gw.configured()) {
        const addr = "DEMO-ADDRESS-NO-MONEY-IS-TAKEN";
        return send(res, 200, { ...base, demo: true, payAmount: usd.toFixed(2), payAddress: addr, extraId: null,
          expiresAt: new Date(Date.now() + 20 * 60000).toISOString(), qrSvg: await qrSvg(addr) });
      }
      const db = sql();
      if (!db) return send(res, 503, { error: "Crypto payment is not set up yet. Use mobile money." });
      await db`insert into crypto_orders (id, pickup, name, phone, branch, branch_name, mode, pickup_time, lines, amount_ugx, amount_usd, ugx_per_usd, rate_source, sandbox, status, pay_currency)
               values (${id}, ${pickup}, ${name}, ${phone}, ${br.id}, ${br.name}, ${mode}, ${order.time}, ${JSON.stringify(lines)}, ${amount}, ${usd}, ${rate}, ${source}, ${gw.SANDBOX}, 'PENDING', ${coin})`;
      let p;
      try {
        p = await gw.createPayment({ orderId: id, amountUsd: usd, coin, ipnUrl: host + "/api/hooks/crypto", description: `Endiro ${br.name} order ${id}` });
      } catch (e) {
        console.error("crypto start", e.message);
        await db`update crypto_orders set status = 'FAILED', gw_status = ${String(e.message).slice(0, 200)}, updated_at = now() where id = ${id}`.catch(() => {});
        const small = /minimal|less than|too small/i.test(e.message);
        return send(res, 502, { error: small ? "This order is too small for that coin. Pick another coin." : "Could not start the crypto payment. Try another coin or use mobile money." });
      }
      await db`update crypto_orders set gw_payment_id = ${p.paymentId}, pay_address = ${p.payAddress}, pay_amount = ${p.payAmount},
               extra_id = ${p.extraId}, expires_at = ${p.expiresAt}, updated_at = now() where id = ${id}`;
      return send(res, 200, { ...base, payAmount: p.payAmount, payAddress: p.payAddress, extraId: p.extraId,
        expiresAt: p.expiresAt || new Date(Date.now() + 20 * 60000).toISOString(), qrSvg: await qrSvg(p.payAddress) });
    }
    if (!mudaReady()) { await saveOrder({ ...order, demo: true }); return send(res, 200, { id, pickup, amount, demo: true }); }
    const num = msisdn(b.payPhone || phone, "UGX");
    if (!num) return send(res, 400, { error: "Type a Ugandan mobile money number, for example 0772 123 456." });
    const prod = await pullProduct("UGX");
    if (!prod) return send(res, 503, { error: "Mobile money is not ready. Try crypto or pay in the café." });
    await saveOrder({ ...order, pay_phone: num });
    const c = await collect({ reference: id, amount, currency: "UGX", productId: prod.product_id, phone: num });
    return send(res, 200, { id, pickup, amount, status: c.status || "PENDING" });
  } catch (e) {
    console.error("pay/start", e.message);
    return send(res, 502, { error: "The payment service did not answer. Try again in a minute." });
  }
}
