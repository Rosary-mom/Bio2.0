# Hermes Sync Master for the next home-network PC.
Set-Location (Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path))
git fetch origin
git checkout v2-2026
git pull origin v2-2026
git merge --no-edit origin/main
if (git diff --name-only --diff-filter=U) { throw "conflicts remain" }
Write-Output ("Hermes sync at " + (git rev-parse --short HEAD))
python memory/workflows/decide.py memory/patterns/anon-preemptive-veto-2026-09.json
