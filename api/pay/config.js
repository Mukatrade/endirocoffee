import { send, ugxPerUsd, sampleRate } from "../_lib/common.js";
import { mudaReady } from "../_lib/muda.js";
import { npReady } from "../_lib/nowpayments.js";

export default function handler(req, res) {
  send(res, 200, { ugxPerUsd: ugxPerUsd(), sampleRate: sampleRate(), momo: mudaReady(), crypto: npReady() });
}
