<#
  Downloads the character art this splash plays, by cloning the original project into third_party\.

  The art (character images, Live2D eye-opening video, icons) belongs to the authors of
  Firefade0329/claude-desktop-splash and Inanis404/claude-desktop-splash. It is NOT covered by the MIT
  license and is not part of this repository; this script only fetches it onto your own computer.
  Ask those authors before using the art anywhere else.

  Usage (in the repository folder):
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\get-art.ps1
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\get-art.ps1 -Repo Firefade0329/claude-desktop-splash
  -Repo     GitHub repository to fetch (default: Inanis404/claude-desktop-splash, which has both artworks)
  -Update   fetch again even if third_party\claude-desktop-splash already exists
#>
param(
  [string]$Repo = 'Inanis404/claude-desktop-splash',
  [switch]$Update
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$dest = Join-Path $root 'third_party\claude-desktop-splash'
if ((Test-Path -LiteralPath (Join-Path $dest 'assets\claude-closed.js')) -and -not $Update) {
  Write-Output "Art is already there: $dest  (use -Update to fetch again)"
  exit 0
}
New-Item -ItemType Directory -Force (Join-Path $root 'third_party') | Out-Null
if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Recurse -Force }

$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) {
  Write-Output "git clone https://github.com/$Repo ..."
  & git clone --depth 1 "https://github.com/$Repo.git" $dest
  if ($LASTEXITCODE -ne 0) { throw "git clone failed ($LASTEXITCODE)" }
} else {
  # No git: download the default branch as a zip
  $zip = Join-Path $env:TEMP ('claude-splash-art-' + [guid]::NewGuid().ToString('N').Substring(0, 8) + '.zip')
  $tmp = $zip + '.d'
  Write-Output "Downloading https://github.com/$Repo (zip) ..."
  Invoke-WebRequest -UseBasicParsing -Uri "https://github.com/$Repo/archive/HEAD.zip" -OutFile $zip
  Expand-Archive -LiteralPath $zip -DestinationPath $tmp
  $inner = Get-ChildItem -LiteralPath $tmp -Directory | Select-Object -First 1
  Move-Item -LiteralPath $inner.FullName -Destination $dest
  Remove-Item -LiteralPath $zip, $tmp -Recurse -Force -ErrorAction SilentlyContinue
}
if (-not (Test-Path -LiteralPath (Join-Path $dest 'assets\claude-closed.js'))) { throw "No assets\claude-closed.js in $Repo - is it the right repository?" }
Write-Output "Done: $dest"
Write-Output 'Reminder: the art is not MIT-licensed. Use it on your own computer; ask its authors before sharing it.'
