#!/usr/bin/env bash
# Deploy the Endiro concept site to Vercel (free Hobby plan).
# Usage:  bash deploy.sh            -> preview deploy (private link)
#         bash deploy.sh --prod     -> production deploy
#         bash deploy.sh --localize -> first copy the Endiro photos into img/remote, then deploy a preview
set -euo pipefail
cd "$(dirname "$0")"
PROD=""; LOCALIZE=""
for a in "$@"; do case "$a" in --prod) PROD="--prod";; --localize) LOCALIZE=1;; esac; done
command -v node >/dev/null || { echo "Install Node.js 20 or newer first."; exit 1; }
command -v python3 >/dev/null || { echo "Install Python 3 first."; exit 1; }
if [ -n "$LOCALIZE" ]; then bash tools/localize-images.sh; fi
python3 tools/build.py
node tools/brand-check.js
if grep -rl $'\xe2\x80\x94' --include=*.html --include=*.js --include=*.css . >/dev/null 2>&1; then echo "Em dash found. Fix it first."; exit 1; fi
npx --yes vercel@latest whoami >/dev/null 2>&1 || npx --yes vercel@latest login
npx --yes vercel@latest deploy $PROD --yes
echo
echo "Done. Add the keys from .env.example in Vercel > Settings > Environment Variables, then run: bash deploy.sh --prod"
echo "Muda webhook URL:       https://<your-domain>/api/hooks/muda"
echo "Crypto webhook URL:     https://<your-domain>/api/hooks/crypto"
