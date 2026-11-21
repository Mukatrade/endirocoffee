// GET /api/crypto/coins?usd=7.03 -> { coins:[{code,label,minUsd,ok}] }. ok=false: order below that coin's minimum.
import * as gw from "../_lib/gateway.js";
import { send } from "../_lib/common.js";
const DEMO = [{ code: "usdttrc20", label: "USDT (TRON)", minUsd: 1 }, { code: "usdcsol", label: "USDC (Solana)", minUsd: 1 }, { code: "btc", label: "Bitcoin (BTC)", minUsd: 5 }, { code: "eth", label: "Ethereum (ETH)", minUsd: 3 }];
export default async function handler(req, res) {
  const usd = Number(new URL(req.url, "http://x").searchParams.get("usd") || 0);
  let list = DEMO;
  if (gw.configured()) {
    try { list = await gw.coins(); } catch (_) { return send(res, 502, { error: "Crypto payment is not available now. Use mobile money." }); }
  }
  return send(res, 200, { demo: !gw.configured(), coins: list.map((c) => ({ ...c, ok: !c.minUsd || !usd || usd >= c.minUsd * 1.05 })) });
}
