# Worktrees for Home, Office, Vault. Run in the Bio2.0 clone.
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
Set-Location $root
git fetch origin
$pairs = @{ "pc-home" = "main"; "pc-office" = "main"; "pc-vault" = "main"; "pc-preview" = "v2-2026" }
foreach ($name in $pairs.Keys) {
  $dest = Join-Path (Split-Path $root -Parent) "Bio2.0-$name"
  if (-not (Test-Path $dest)) {
    git worktree add $dest "origin/$($pairs[$name])"
  }
  Write-Output "$name -> $dest"
}
Write-Output "aid: python memory/workflows/decide.py"
