// GET /api/crypto/coins?usd=7.03 -> { coins:[{code,label,minUsd,ok}] } . ok=false when the order is below that coin's minimum.
const gw = require("../_lib/gateway");
const DEMO = [{ code: "usdttrc20", label: "USDT (TRON)", minUsd: 1 }, { code: "btc", label: "Bitcoin (BTC)", minUsd: 5 }, { code: "eth", label: "Ethereum (ETH)", minUsd: 3 }];
module.exports = async (req, res) => {
  const usd = Number((req.query && req.query.usd) || 0);
  let list = DEMO;
  if (gw.configured()) {
    try { list = await gw.coins(); } catch (_) { return res.status(502).json({ error: "Crypto payment is not available now. Use mobile money." }); }
  }
  res.setHeader("Cache-Control", "public, max-age=600");
  return res.status(200).json({ demo: !gw.configured(), coins: list.map((c) => ({ ...c, ok: !c.minUsd || !usd || usd >= c.minUsd * 1.05 })) });
};
