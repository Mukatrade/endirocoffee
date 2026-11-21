// MUDA Pay webhook. A webhook is only a signal: we ask Muda for the transaction before we change an order.
import { getOrder, setStatus, notify } from "../_lib/common.js";
import { checkSignature, byReference, isPaid, isFailed } from "../_lib/muda.js";

// Web handler: the raw body is needed for the signature check.
export async function POST(request) {
  const raw = await request.text();
  const sig = checkSignature(Object.fromEntries(request.headers), raw);
  if (sig === "invalid" || sig === "old") return Response.json({ error: "bad signature" }, { status: 401 });
  let j = {}; try { j = JSON.parse(raw); } catch (e) {}
  const d = (j && j.data) || j || {};
  const ref = String(d.reference_id || d.referenceId || "");
  if (!/^E-[A-Z0-9]{6,12}$/.test(ref)) return Response.json({ ok: true });
  try {
    const t = await byReference(ref), o = await getOrder(ref);
    if (isPaid(t.status) && o && o.status !== "PAID" && Number(t.amount) >= Number(o.amount)) {
      await setStatus(ref, "PAID", { pay_ref: t.transId });
      await notify(`Paid order ${ref} (${o.pickup}) at ${o.branch_name}: UGX ${o.amount}`);
    } else if (isFailed(t.status)) await setStatus(ref, "FAILED");
  } catch (e) { console.error("hook muda", e.message); }
  return Response.json({ ok: true });
}
