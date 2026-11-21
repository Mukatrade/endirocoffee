// The truth about a payment. Mobile money: ask MUDA Pay by our own reference (no database needed).
// Crypto: read the order that the NOWPayments webhook updated.
import { send, getOrder, setStatus, notify } from "../_lib/common.js";
import { mudaReady, byReference, isPaid, isFailed } from "../_lib/muda.js";

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
    const o = await getOrder(id);
    return send(res, 200, { status: o ? o.status : "PENDING" });
  } catch (e) {
    return send(res, 200, { status: "PENDING" });
  }
}
