#!/bin/sh
# Hermes Sync Master: update this PC from origin and record the handoff.
set -e
cd "$(dirname "$0")/.."
git fetch origin
git checkout v2-2026
git pull --ff-only origin v2-2026 || git pull origin v2-2026
git merge --no-edit origin/main || true
if git diff --name-only --diff-filter=U | grep -q .; then
  echo "conflicts remain; resolve, then commit"
  git diff --name-only --diff-filter=U
  exit 1
fi
sha=$(git rev-parse --short HEAD)
echo "Hermes sync at $sha"
python3 memory/workflows/decide.py memory/patterns/anon-preemptive-veto-2026-09.json
echo "LAN: python3 scripts/serve-esg-lan.py"
echo "ESG Paywall: syncing Magnifica Humanitas page (Bio20/commit593e86a) + Vercel app + full Woo snippet"
cp -f artifacts/ESG-Paywall-Magnifica-Page-Bio2.9.html . 2>/dev/null || true
cp -f artifacts/ESG-Paywall-Magnifica-Page-Bio2.9.html ESG-Paywall-Magnifica-Page-Bio20.html 2>/dev/null || true
echo "Paywall page + upload for Pandämie, FlugDF1073, Regeländerung IMK, 9/11 included"
