<#
  Builds "Claude (Dawn).exe" in the repository folder from launcher\ClaudeDawn.cs, using the C# compiler that ships
  with Windows (.NET Framework 4). Double-click the .exe to start Claude with the splash, or pin it / make a shortcut to it.
  Run launcher\make_shortcut.ps1 first if you want Claude's icon on the .exe (it extracts launcher\claude.ico);
  launcher\custom.ico, if present, is used instead.

  Usage (in the repository folder):
    powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\build-exe.ps1
#>
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework64\v4.0.30319\csc.exe'
if (-not (Test-Path -LiteralPath $csc)) { $csc = Join-Path $env:WINDIR 'Microsoft.NET\Framework\v4.0.30319\csc.exe' }
if (-not (Test-Path -LiteralPath $csc)) { throw 'The .NET Framework 4 C# compiler (csc.exe) was not found.' }
$src = Join-Path $root 'launcher\ClaudeDawn.cs'
$out = Join-Path $root 'Claude (Dawn).exe'
$cscArgs = @('/nologo', '/target:winexe', '/optimize+', '/codepage:65001', '/r:System.Windows.Forms.dll', '/r:System.Core.dll', '/r:System.Web.Extensions.dll', "/out:$out")
$ico = Join-Path $root 'launcher\custom.ico'
if (-not (Test-Path -LiteralPath $ico)) { $ico = Join-Path $root 'launcher\claude.ico' }
if (Test-Path -LiteralPath $ico) { $cscArgs += "/win32icon:$ico" } else { Write-Output 'No icon found (run launcher\make_shortcut.ps1 first to extract Claude''s icon); building without one.' }
& $csc @cscArgs $src
if ($LASTEXITCODE -ne 0) { throw "csc failed ($LASTEXITCODE)" }
Write-Output "built: $out"
