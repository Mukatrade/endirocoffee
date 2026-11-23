#!/usr/bin/env bash
# Set the UGX per USD rate for crypto prices yourself, or go back to the live rate.
# Usage:  bash set-rate.sh 3750    -> fixed rate 1 USD = 3,750 UGX
#         bash set-rate.sh live    -> live rate again (free rate API, updated every hour)
# Takes about 1 minute (saves the rate in Vercel, then redeploys).
set -euo pipefail
cd "$(dirname "$0")"
V="npx --yes vercel@latest"
ARG="${1:-}"
[ -f .vercel/project.json ] || { echo "Run bash deploy.sh once first."; exit 1; }
$V env rm UGX_PER_USD_FIXED production --yes >/dev/null 2>&1 || true
if [ "$ARG" = "live" ]; then
  echo "Live rate again."
elif [[ "$ARG" =~ ^[0-9]{4}(\.[0-9]+)?$ ]]; then
  printf '%s' "$ARG" | $V env add UGX_PER_USD_FIXED production >/dev/null
  echo "Rate set: 1 USD = $ARG UGX."
else
  echo "Usage: bash set-rate.sh 3750   or   bash set-rate.sh live"; exit 1
fi
node tools/build-public.js >/dev/null
URL=$($V deploy --prod --yes | tail -n 1)
echo "Live: $URL  (check: $URL/api/pay/config)"
