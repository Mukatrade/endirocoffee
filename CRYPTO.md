# Crypto checkout (NOWPayments)

- Hosted invoice page. All coins. The customer pays the NOWPayments and network fees. Fixed rate.
- Menu in UGX. Invoice in USD at the live rate (open.er-api.com, free), cached 1 hour in Neon. Fallback: `UGX_PER_USD`, then 3700.
- Underpayment (`partially_paid`) = order rejected (`FAILED_UNDERPAID`). Staff gets a Telegram alert. Do not prepare the order.
- Orders: Neon table `crypto_orders` (schema in `db/schema.sql`).
- `NOWPAYMENTS_SANDBOX=true` uses api-sandbox.nowpayments.io. Set `false` for live.

| Endpoint | Use |
|---|---|
| `POST /api/crypto/invoice` | `{lines:[{id,qty}], name, phone, branch, mode, time}` -> `invoiceUrl` |
| `GET /api/crypto/status?id=` | Order status and a customer message |
| `GET /api/crypto/rate` | UGX per USD, minimum USD, sandbox, live |
| `POST /api/hooks/nowpayments` | IPN webhook (HMAC-SHA512 check) |

Env vars (set by `bash setup-crypto.sh`): `NOWPAYMENTS_API_KEY`, `NOWPAYMENTS_IPN_SECRET`, `NOWPAYMENTS_SANDBOX`, `DATABASE_URL`.
Optional: `CRYPTO_MIN_USD` (default 3), `UGX_PER_USD`, `PUBLIC_SITE_URL`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`.
