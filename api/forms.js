// Job, internship and wholesale forms. Saved to Supabase (free) and sent to Telegram if those are set.
// Without them the form still answers OK, and the message goes to the Vercel log.
import { readJson, send, sb, storeReady, notify } from "./_lib/common.js";

const KINDS = ["job", "internship", "wholesale"];

export default async function handler(req, res) {
  if (req.method !== "POST") return send(res, 405, { error: "Use POST" });
  const b = await readJson(req);
  const kind = KINDS.includes(b.kind) ? b.kind : null;
  if (!kind || !b.data || typeof b.data !== "object") return send(res, 400, { error: "Bad form" });
  const data = {};
  for (const [k, v] of Object.entries(b.data).slice(0, 30)) data[String(k).slice(0, 40)] = String(v).slice(0, 4000);
  const row = { kind, data, created_at: new Date().toISOString() };
  try {
    if (storeReady()) await sb("POST", "forms", row); else console.log("form", JSON.stringify(row));
    const who = data.org || [data.first, data.last].filter(Boolean).join(" ") || data.name || "";
    await notify(`New ${kind} form: ${who} ${data.phone || ""} ${data.email || ""}`.trim());
    return send(res, 200, { ok: true });
  } catch (e) {
    console.error("forms", e.message);
    return send(res, 502, { error: "Not saved" });
  }
}
