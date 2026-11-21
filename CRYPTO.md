# Crypto checkout (white-label, NOWPayments API on the server)

The customer never sees the provider. The checkout runs on the Endiro page:
coin picker, amount, address, QR code (made on our server), memo when needed, timer, live status.
The browser only calls `/api/pay/*` and `/api/crypto/coins`. It never calls the provider. No customer email goes to the provider.

- All coins enabled in the account. Coins below their minimum for this order are disabled in the list.
- The customer pays the fees (`is_fee_paid_by_user`). Fixed rate for about 20 minutes.
- Menu in UGX. Price in USD at the live rate (open.er-api.com, free), cached 1 hour in Neon. Fallback `UGX_PER_USD`, then 3700.
- Underpayment (`partially_paid`) = order rejected (`FAILED_UNDERPAID`), Telegram alert, do not prepare.
- Status: webhook `/api/hooks/crypto`, plus polling from `/api/crypto/status` as a backup.
- `tools/brand-check.js` runs on every Vercel build (`npm run build`). The build fails if the provider name can reach a customer.
- `.vercelignore` keeps docs, scripts and SQL off the public site.

| Endpoint | Use |
|---|---|
| `GET /api/pay/config` | Live UGX per USD, crypto ready, test mode, minimum USD |
| `GET /api/crypto/coins?usd=` | Coins, labels, minimums, `ok` per coin |
| `POST /api/pay/start` | `method:"crypto"`, `coin` -> address, amount, memo, QR, expiry |
| `GET /api/pay/status?order=&method=crypto` | Status and customer message (polls the provider as a backup) |
| `POST /api/hooks/crypto` | Webhook (HMAC-SHA512 check) |

Front end: crypto part of `js/checkout.js` + `css/crypto-pay.css`. Page source: `checkout()` in `tools/build.py`.

Env (set by `bash setup-crypto.sh`): `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_SANDBOX`, `DATABASE_URL`.
Optional: `CRYPTO_MIN_USD` (default 3), `UGX_PER_USD`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
