// The truth about a payment. Mobile money: ask MUDA Pay by our own reference (no database needed).
// Crypto: read the Neon order (the webhook updates it) and ask the gateway as a backup.
import { send, getOrder, setStatus, notify } from "../_lib/common.js";
import { mudaReady, byReference, isPaid, isFailed } from "../_lib/muda.js";
import * as gw from "../_lib/gateway.js";
import { sql } from "../_lib/db.js";
import { applyStatus } from "../_lib/orders.js";

const CRYPTO_MSG = {
  PENDING: "Waiting for your payment.",
  CONFIRMING: "Payment seen. Waiting for the network to confirm.",
  PAID: "Payment received.",
  FAILED_UNDERPAID: "You sent less than the order amount, so the order is cancelled. Contact Endiro with your order number for a refund.",
  EXPIRED: "The time for this payment ended. No money was taken. Start again.",
  FAILED: "The crypto payment did not complete.",
  REFUNDED: "The payment was refunded.",
};
async function cryptoStatus(id) {
  const db = sql();
  if (!db || !gw.configured()) return { status: "PENDING" };
  let rows = await db`select status, gw_payment_id, updated_at, created_at from crypto_orders where id = ${id}`;
  if (!rows[0]) return { status: "PENDING" };
  const r = rows[0], last = new Date(r.updated_at || r.created_at).getTime();
  if (["PENDING", "CONFIRMING"].includes(r.status) && r.gw_payment_id && Date.now() - last > 20000) {
    try { await applyStatus(db, id, await gw.getPayment(r.gw_payment_id), gw.mapStatus); } catch (_) {}
    rows = await db`select status from crypto_orders where id = ${id}`;
  }
  const st = rows[0].status;
  return { status: st, message: CRYPTO_MSG[st] || CRYPTO_MSG.PENDING };
}

export default async function handler(req, res) {
  const u = new URL(req.url, "http://x"), id = String(u.searchParams.get("order") || ""), method = u.searchParams.get("method");
  if (!/^E-[A-Z0-9]{6,12}$/.test(id)) return send(res, 400, { error: "Bad order number" });
  try {
    if (method !== "crypto" && mudaReady()) {
      const t = await byReference(id);
      if (isPaid(t.status)) {
        const o = await getOrder(id);
        if (o && o.status !== "PAID") { await setStatus(id, "PAID", { pay_ref: t.transId }); await notify(`Paid order ${id} (${o.pickup}) at ${o.branch_name}: UGX ${o.amount}`); }
        return send(res, 200, { status: "PAID" });
      }
      if (isFailed(t.status)) { await setStatus(id, "FAILED"); return send(res, 200, { status: "FAILED" }); }
      return send(res, 200, { status: "PENDING" });
    }
    if (method === "crypto") return send(res, 200, await cryptoStatus(id));
    const o = await getOrder(id);
    return send(res, 200, { status: o ? o.status : "PENDING" });
  } catch (e) {
    return send(res, 200, { status: "PENDING" });
  }
}
