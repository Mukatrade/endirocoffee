#!/usr/bin/env bash
# Fails if the payment provider name can reach a customer. Runs on every Vercel build (npm run build).
set -uo pipefail
cd "$(dirname "$0")/.."
BAD=0
# 1) Anything served as a page or asset.
HITS=$(grep -rIil "nowpayments" --exclude-dir=.git --exclude-dir=node_modules --exclude-dir=api --exclude-dir=db --exclude-dir=tools \
  --exclude='*.md' --exclude='*.sh' --exclude='.env*' --exclude=package.json --exclude=package-lock.json --exclude=.vercelignore . || true)
[ -n "$HITS" ] && { echo "Provider name in customer-facing files:"; echo "$HITS"; BAD=1; }
# 2) Server code: only env names, the API host, the signature header and comments may say it.
LEAK=$(grep -rIin "nowpayments" api | grep -viE 'process\.env\.NOWPAYMENTS_|api(-sandbox)?\.nowpayments\.io|x-nowpayments-sig|^\S+:[0-9]+:\s*//' || true)
[ -n "$LEAK" ] && { echo "Provider name in server text that can reach a customer:"; echo "$LEAK"; BAD=1; }
# 3) Docs and scripts must not be served (they name the provider).
for p in '*.md' '*.sh' 'db'; do grep -qxF "$p" .vercelignore 2>/dev/null || { echo ".vercelignore must list $p"; BAD=1; }; done
[ $BAD = 0 ] && echo "Brand check OK: the provider name is not shown anywhere." || exit 1
