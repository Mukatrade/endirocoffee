// GET /api/crypto/rate -> { ugxPerUsd, source, minUsd, sandbox, live }
const { ugxPerUsd } = require("../_lib/fx");
const gw = require("../_lib/gateway");
module.exports = async (_req, res) => {
  const { rate, source } = await ugxPerUsd();
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json({ ugxPerUsd: rate, source, minUsd: Number(process.env.CRYPTO_MIN_USD || 3),
    sandbox: gw.SANDBOX, live: gw.configured() });
};
