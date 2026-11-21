# endirocoffee

Endiro Coffee concept site (Uganda). Static pages (made by `tools/build.py`) and Vercel functions in `api/`. Free stack: Vercel Hobby, Neon free tier.

- Mobile money: MUDA Pay (MTN, Airtel).
- Crypto: paid on the checkout page, many coins. Provider details: `CRYPTO.md` (not deployed).

## Deploy
First time: `bash setup-crypto.sh` (Vercel login and link, keys typed hidden into Vercel, Neon tables, production deploy).
After that: every push to `main` deploys. Change a page: edit `tools/build.py`, run `python3 tools/build.py`, push.

The Vercel build runs `node tools/brand-check.js`. It stops the deploy if the crypto provider name can reach a customer.
