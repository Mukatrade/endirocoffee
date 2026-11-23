#!/usr/bin/env bash
# One-time setup of the NOWPayments crypto checkout on Vercel, then a production deploy.
# Run from the repo root on your Mac:   bash setup-crypto.sh
# The keys are typed hidden. They go only to Vercel. They are never saved in a file or in git.
set -euo pipefail
cd "$(dirname "$0")"
V="npx --yes vercel@latest"

command -v node >/dev/null || { echo "Install Node.js 20 or newer first."; exit 1; }
[ -f data/menu.json ] || { echo "data/menu.json is missing. Put the site files in this repo first."; exit 1; }

echo "== 1/5 Vercel login and project link"
$V whoami >/dev/null 2>&1 || $V login
[ -f .vercel/project.json ] || $V link --yes --project endirocoffee
$V git connect --yes >/dev/null 2>&1 || echo "   (GitHub link: do it once in Vercel > Project > Settings > Git if this step failed)"

printf '\e[?2004l'   # turn off bracketed paste, so pasted text has no hidden codes
trap "printf '\\e[?2004h'" EXIT
ask() { # ask NAME "label" hidden(1/0). Cleans paste codes, quotes, spaces and line ends.
  local v
  if [ "$3" = "1" ]; then read -r -s -p "   $2: " v </dev/tty; echo >&2; else read -r -p "   $2: " v </dev/tty; fi
  v=$(printf '%s' "$v" | LC_ALL=C sed -e 's/\x1b\[20[01]~//g' -e $'s/\x1b//g' -e 's/\[20[01]~//g' | tr -d '\r\n\t ' | sed -e "s/^[\"']//" -e "s/[\"']$//")
  printf '%s' "$v"
}
setenv() { # setenv NAME VALUE  -> production
  for env in production; do
    $V env rm "$1" "$env" --yes >/dev/null 2>&1 || true
    printf '%s' "$2" | $V env add "$1" "$env" >/dev/null
  done
  echo "   set $1"
}

echo "== 2/5 NOWPayments keys (sandbox: account-sandbox.nowpayments.io, live: account.nowpayments.io)"
MODE=$(ask MODE "Mode, type sandbox or live [sandbox]" 0); MODE=${MODE:-sandbox}
API_KEY=$(ask K "NOWPayments API key (hidden)" 1)
IPN=$(ask S "NOWPayments IPN secret (hidden)" 1)
[ -n "$API_KEY" ] && [ -n "$IPN" ] || { echo "Key or secret is empty. Stop."; exit 1; }
echo "   key: ${#API_KEY} characters, starts ${API_KEY:0:3}...   secret: ${#IPN} characters"

echo "== 3/5 Neon database (neon.tech > project > Connection string, pooled)"
DBURL=$(ask D "Neon DATABASE_URL (hidden)" 1)
case "$DBURL" in postgres*://*:?*@*) ;; postgres*://*) echo "The URL has no password. In Neon, turn on Show password, copy again, run again."; exit 1;; *) echo "That is not a Postgres URL (it must start with postgresql://). Stop."; exit 1;; esac

echo "== 4/5 Save to Vercel and create the Neon tables"
setenv NOWPAYMENTS_API_KEY "$API_KEY"
setenv NOWPAYMENTS_IPN_SECRET "$IPN"
setenv NOWPAYMENTS_SANDBOX "$([ "$MODE" = live ] && echo false || echo true)"
setenv DATABASE_URL "$DBURL"
npm install --silent --no-audit --no-fund
DATABASE_URL="$DBURL" node tools/migrate.js
unset API_KEY IPN DBURL

node tools/build-public.js
echo "== 5/5 Production deploy"
URL=$($V deploy --prod --yes | tail -n 1)
echo
echo "Done: $URL"
echo "Put this IPN URL in NOWPayments > Settings > Payments > IPN:"
echo "   $URL/api/hooks/crypto"
echo "Check: $URL/api/crypto/rate  (live:true means the keys work)"
echo "Switch to live later: bash setup-crypto.sh again and type live."
