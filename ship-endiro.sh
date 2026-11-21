#!/usr/bin/env bash
# Adds the Endiro site files to github.com/Mukatrade/endirocoffee (the crypto kit is already there).
# Usage (on your Mac):  bash ship-endiro.sh [path to endiro-site.zip or the endiro-site folder]
set -euo pipefail
SRC="${1:-$HOME/Downloads/endiro-site.zip}"
DEST="$HOME/sites/endirocoffee"
REPO_URL="https://github.com/Mukatrade/endirocoffee.git"

if [ ! -e "$SRC" ]; then
  FOUND=$(find "$HOME/Downloads" "$HOME/Desktop" "$HOME/sites" "$HOME/Documents" -maxdepth 3 \( -name 'endiro-site*.zip' -o -type d -name 'endiro-site' \) 2>/dev/null | head -n 1 || true)
  [ -n "$FOUND" ] || { echo "Cannot find endiro-site.zip. Run: bash ship-endiro.sh /path/to/endiro-site.zip"; exit 1; }
  SRC="$FOUND"
fi
echo "Site source: $SRC"

if [ -d "$SRC" ]; then
  TOP="$SRC"
else
  TMP=$(mktemp -d); unzip -q "$SRC" -d "$TMP"
  MENU=$(find "$TMP" -name menu.json -path '*/data/*' | head -n 1)
  [ -n "$MENU" ] || { echo "No data/menu.json in the zip. Wrong file?"; exit 1; }
  TOP=$(dirname "$(dirname "$MENU")")
fi

mkdir -p "$HOME/sites"
[ -d "$DEST/.git" ] || git clone "$REPO_URL" "$DEST"
cd "$DEST" && git pull --ff-only
# Site files in. Files from the crypto kit are kept (the kit replaces the old Supabase NOWPayments hook).
rsync -a --ignore-existing --exclude .git --exclude .vercel --exclude node_modules "$TOP"/ "$DEST"/
git add -A
git commit -q -m "Add Endiro site files" || { echo "Nothing new to add."; exit 0; }
git push origin main
echo
echo "Pushed to https://github.com/Mukatrade/endirocoffee  (folder: $DEST)"
echo "Tell Claude: pushed. Claude then wires the checkout page to the new crypto API."
