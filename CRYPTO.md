# Crypto checkout (white-label, NOWPayments API on the server)

The customer never sees the provider. The checkout runs on the Endiro page:
coin picker, amount, address, QR code (made on our server), memo when needed, timer, live status.
The browser only calls `/api/crypto/*`. It never calls the provider. No customer email goes to the provider.

- All coins enabled in the account. Coins below their minimum for this order are disabled in the list.
- The customer pays the fees (`is_fee_paid_by_user`). Fixed rate for about 20 minutes.
- Menu in UGX. Price in USD at the live rate (open.er-api.com, free), cached 1 hour in Neon. Fallback `UGX_PER_USD`, then 3700.
- Underpayment (`partially_paid`) = order rejected (`FAILED_UNDERPAID`), Telegram alert, do not prepare.
- Status: webhook `/api/hooks/crypto`, plus polling from `/api/crypto/status` as a backup.
- `tools/brand-check.sh` runs on every Vercel build (`npm run build`). The build fails if the provider name can reach a customer.
- `.vercelignore` keeps docs, scripts and SQL off the public site.

| Endpoint | Use |
|---|---|
| `GET /api/crypto/rate` | UGX per USD, minimum USD, sandbox, live |
| `GET /api/crypto/coins?usd=` | Coins, labels, minimums, `ok` per coin |
| `POST /api/crypto/pay` | `{lines:[{id,qty}], coin, name, phone, branch, mode, time}` -> address, amount, QR |
| `GET /api/crypto/status?id=` | Order status and a customer message |
| `POST /api/hooks/crypto` | Webhook (HMAC-SHA512 check) |

Front end: `js/crypto-pay.js` + `css/crypto-pay.css`. `EndiroCrypto.mount(el, {lines, amountUgx, name, phone, branch, mode, time, onPaid})`.

Env (set by `bash setup-crypto.sh`): `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_SANDBOX`, `DATABASE_URL`.
Optional: `CRYPTO_MIN_USD` (default 3), `UGX_PER_USD`, `PUBLIC_SITE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
