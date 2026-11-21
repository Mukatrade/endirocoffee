import { send } from "../_lib/common.js";
import { mudaReady } from "../_lib/muda.js";
import * as gw from "../_lib/gateway.js";
import { ugxPerUsd } from "../_lib/fx.js";

export default async function handler(req, res) {
  const { rate, source } = await ugxPerUsd();
  send(res, 200, { ugxPerUsd: rate, sampleRate: source === "fallback", momo: mudaReady(), crypto: gw.configured(),
    cryptoTest: gw.configured() && gw.SANDBOX, cryptoMinUsd: Number(process.env.CRYPTO_MIN_USD || 3) });
}
