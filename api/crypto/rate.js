// GET /api/crypto/rate -> { ugxPerUsd, source, minUsd, sandbox, live }
const { ugxPerUsd } = require("../_lib/fx");
const np = require("../_lib/nowpay");
module.exports = async (_req, res) => {
  const { rate, source } = await ugxPerUsd();
  res.setHeader("Cache-Control", "public, max-age=300");
  return res.status(200).json({ ugxPerUsd: rate, source, minUsd: Number(process.env.CRYPTO_MIN_USD || 3),
    sandbox: np.SANDBOX, live: np.configured() });
};
