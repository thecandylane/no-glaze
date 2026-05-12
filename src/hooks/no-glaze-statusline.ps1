# no-glaze statusline (Windows) — renders [NO-GLAZE:<MODE>] badge.

$ErrorActionPreference = 'SilentlyContinue'

$configDir = if ($env:CLAUDE_CONFIG_DIR) { $env:CLAUDE_CONFIG_DIR } else { "$env:USERPROFILE\.claude" }
$flagFile = Join-Path $configDir '.no-glaze-active'

if (-not (Test-Path $flagFile -PathType Leaf)) { return }

# Refuse symlinks.
$item = Get-Item $flagFile -Force
if ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) { return }

$raw = Get-Content $flagFile -Raw -ErrorAction SilentlyContinue
if (-not $raw) { return }
$mode = $raw.Trim()

switch ($mode) {
  'lite'   { Write-Host -NoNewline "[NO-GLAZE:LITE]" -ForegroundColor DarkGray }
  'full'   { Write-Host -NoNewline "[NO-GLAZE:FULL]" -ForegroundColor Yellow }
  'brutal' { Write-Host -NoNewline "[NO-GLAZE:BRUTAL]" -ForegroundColor Red }
  default  { return }
}
