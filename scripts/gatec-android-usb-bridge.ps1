# Gate C Android physical device test bridge.
# Local operator use only. Does not expose services over the LAN or internet.
# Opens reverse forwarding for ONLY app 3100 and isolated Supabase 54321.
# Never accesses port 3000, Production, or default database configuration.
param(
  [string]$AdbPath = 'C:\Android\platform-tools\adb.exe'
)
$ErrorActionPreference = 'Stop'

if (-not (Test-Path -LiteralPath $AdbPath -PathType Leaf)) {
  $found = Get-Command adb.exe -ErrorAction SilentlyContinue
  if ($null -eq $found) {
    throw 'ADB not found. Download official Android SDK Platform-Tools for Windows, extract to C:\Android\platform-tools, and retry.'
  }
  $AdbPath = $found.Source
}
$AdbPath = (Resolve-Path -LiteralPath $AdbPath).Path
function Require-Success([string]$action) {
  if ($LASTEXITCODE -ne 0) { throw "$action failed with exit code $LASTEXITCODE" }
}

# Guard the existing isolated app and backend. Do not use default env settings.
& npm run gatea:env:preflight
Require-Success 'Isolated Gate A preflight'

$devices = @(& $AdbPath devices)
Require-Success 'ADB device enumeration'
$authorized = @($devices | Where-Object { $_ -match '^\S+\s+device\s*$' })
$pending = @($devices | Where-Object { $_ -match '^\S+\s+(unauthorized|offline)\s*$' })
if ($pending.Count -gt 0) { throw 'Android device is unauthorized/offline. Unlock phone and approve the USB debugging dialog.' }
if ($authorized.Count -ne 1) { throw 'Connect exactly one authorized Android phone via USB, then retry.' }

& $AdbPath reverse tcp:3100 tcp:3100
Require-Success 'Isolated app USB reverse forwarding'
& $AdbPath reverse tcp:54321 tcp:54321
Require-Success 'Isolated Supabase USB reverse forwarding'
$routes = @(& $AdbPath reverse --list)
Require-Success 'USB reverse route listing'
if (-not ($routes | Where-Object { $_ -match 'tcp:3100\s+tcp:3100\s*$' })) { throw 'Isolated app port 3100 forwarding missing.' }
if (-not ($routes | Where-Object { $_ -match 'tcp:54321\s+tcp:54321\s*$' })) { throw 'Isolated Supabase port 54321 forwarding missing.' }

Write-Host 'Gate C Android USB bridge: PASS (only localhost 3100 and 54321).'
Write-Host 'On Android Chrome, open http://127.0.0.1:3100/login'
Write-Host 'Keep the USB cable connected during the test.'
