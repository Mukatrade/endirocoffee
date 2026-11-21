// Start a payment. Mobile money: MUDA Pay sends a PIN prompt to the phone (same flow as Buy2Africa).
// Crypto: a NOWPayments invoice in USDT (same as Goldigger). Without keys the order runs in demo mode.
import { readJson, send, priceOrder, branch, newOrderId, pickupNumber, ugxPerUsd, saveOrder, storeReady } from "../_lib/common.js";
import { mudaReady, pullProduct, collect, msisdn } from "../_lib/muda.js";
import { npReady, createInvoice } from "../_lib/nowpayments.js";

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
      if (!npReady()) { await saveOrder({ ...order, demo: true }); return send(res, 200, { id, pickup, amount, demo: true }); }
      if (!storeReady()) return send(res, 503, { error: "Crypto payments need the order store (Supabase). See README." });
      const usd = amount / ugxPerUsd();
      const inv = await createInvoice({ orderId: id, usd, description: `Endiro ${br.name} order ${id}`, ipnUrl: host + "/api/hooks/nowpayments", successUrl: host + "/checkout.html?paid=" + id, cancelUrl: host + "/checkout.html" });
      await saveOrder({ ...order, pay_ref: inv.id });
      return send(res, 200, { id, pickup, amount, invoiceUrl: inv.url });
    }
    if (!mudaReady()) { await saveOrder({ ...order, demo: true }); return send(res, 200, { id, pickup, amount, demo: true }); }
    const num = msisdn(b.payPhone || phone, "UGX");
    if (!num) return send(res, 400, { error: "Type a Ugandan mobile money number, for example 0772 123 456." });
    const prod = await pullProduct("UGX");
    if (!prod) return send(res, 503, { error: "Mobile money is not ready. Try USDT or pay in the café." });
    await saveOrder({ ...order, pay_phone: num });
    const c = await collect({ reference: id, amount, currency: "UGX", productId: prod.product_id, phone: num });
    return send(res, 200, { id, pickup, amount, status: c.status || "PENDING" });
  } catch (e) {
    console.error("pay/start", e.message);
    return send(res, 502, { error: "The payment service did not answer. Try again in a minute." });
  }
}
