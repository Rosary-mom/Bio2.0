#!/bin/sh
# One worktree per PC role. Run from a clone of Rosary-mom/Bio2.0.
set -e
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"
git fetch origin
for pair in "pc-home:main" "pc-office:main" "pc-vault:main" "pc-preview:v2-2026"; do
  name=${pair%%:*}
  branch=${pair##*:}
  dest="../Bio2.0-$name"
  if [ ! -d "$dest" ]; then
    git worktree add "$dest" "origin/$branch"
  fi
  echo "$name -> $dest ($branch)"
done
echo "memory: $root/memory/esg-multipc.json"
echo "aid: python3 memory/workflows/decide.py"
