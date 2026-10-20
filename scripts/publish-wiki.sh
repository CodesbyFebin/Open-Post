#!/usr/bin/env bash
# Mirror docs/*.md (including _Sidebar.md and _Footer.md) to the GitHub Wiki.
# The wiki git repo only exists after the first page is saved in the web UI.
set -euo pipefail
REPO="${1:-CodesbyFebin/Open-Post}"
TMP="$(mktemp -d)"
git clone -q "https://github.com/${REPO}.wiki.git" "$TMP"
cp docs/*.md "$TMP/"
cd "$TMP"
git add -A
git commit -qm "Sync wiki from docs/" || { echo "Wiki already up to date"; exit 0; }
git push -q origin HEAD
echo "Wiki updated: https://github.com/${REPO}/wiki"
