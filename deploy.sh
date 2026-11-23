#!/usr/bin/env bash
# Deploy the Endiro concept site to Vercel (free Hobby plan). Works without keys (demo mode).
# Usage:  bash deploy.sh            -> production deploy (live link)
#         bash deploy.sh --preview  -> private preview link only
#         bash deploy.sh --no-photos -> skip copying the Endiro photos into img/remote
set -euo pipefail
cd "$(dirname "$0")"
PROD="--prod"; LOCALIZE=1
for a in "$@"; do case "$a" in --preview) PROD="";; --no-photos) LOCALIZE="";; esac; done
V="npx --yes vercel@latest"
# The *.html pages are made by tools/build.py. Drop local rebuilds, then take the newest code from GitHub.
if [ -d .git ]; then
  git checkout -- $(git ls-files '*.html') 2>/dev/null || true
  git pull --ff-only -q || { echo "git pull failed. Run: git status"; exit 1; }
fi
command -v node >/dev/null || { echo "Install Node.js 20 or newer first: https://nodejs.org"; exit 1; }
command -v python3 >/dev/null || { echo "Install Python 3 first."; exit 1; }
if [ -n "$LOCALIZE" ]; then
  bash tools/localize-images.sh >/dev/null   # copies Endiro's photos into img/remote (once), so the site does not load them from the old site
  if [ -n "$(git status --porcelain img/remote 2>/dev/null)" ]; then
    git add img/remote && git commit -q -m "Add Endiro photos (local copies)" && git push -q && echo "Photos saved in the repo."
  fi
fi
python3 tools/build.py >/dev/null
node tools/build-public.js
if grep -rl $'\xe2\x80\x94' --include=*.html --include=*.js --include=*.css . >/dev/null 2>&1; then echo "Em dash found. Fix it first."; exit 1; fi
$V whoami >/dev/null 2>&1 || $V login
[ -f .vercel/project.json ] || $V link --yes --project endirocoffee
$V git connect --yes >/dev/null 2>&1 || true   # after this, each push to main deploys
URL=$($V deploy $PROD --yes | tail -n 1)
echo
echo "LIVE: $URL"
echo "Crypto and mobile money run in demo mode until you add the keys: bash setup-crypto.sh"
command -v open >/dev/null && open "$URL" || true
