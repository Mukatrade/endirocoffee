#!/usr/bin/env bash
# Copies the Endiro photos from endirocoffee.com's image host into img/remote/, so the site does not depend on the old site.
# The build then uses the local copies automatically.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p img/remote
python3 - <<'PY' > /tmp/endiro-images.txt
import importlib.util, os
spec = importlib.util.spec_from_file_location("b", "tools/build.py"); b = importlib.util.module_from_spec(spec); spec.loader.exec_module(b)
for k, v in b.REMOTE.items(): print(k, b.SQ + v + "?format=1500w")
PY
while read -r key url; do
  [ -s "img/remote/$key.jpg" ] && continue
  echo "get $key"; curl -fsSL "$url" -o "img/remote/$key.jpg" || echo "could not get $key"
done < /tmp/endiro-images.txt
echo "Photos are in img/remote/."
