#!/usr/bin/env bash
# Mirror docs/*.md to the GitHub Wiki.
# GitHub only creates the wiki git repo after the first page is saved in the web UI
# (Wiki tab → "Create the first page" → Save). Run this script after that.
set -euo pipefail
REPO="${1:-CodesbyFebin/Open-Post}"
TMP="$(mktemp -d)"
git clone -q "https://github.com/${REPO}.wiki.git" "$TMP"
cp docs/*.md "$TMP/"
cat > "$TMP/_Sidebar.md" <<'MD'
**Open Post**

- [[Home]]
- [[Installation]]
- [[Configuration]]
- [[Channels]]
- [[Autopilot]]
- [[API]]
- [[Deployment]]
- [[FAQ]]
MD
cd "$TMP"
git add -A
git commit -qm "Sync wiki from docs/" || { echo "Wiki already up to date"; exit 0; }
git push -q origin HEAD
echo "Wiki updated: https://github.com/${REPO}/wiki"
