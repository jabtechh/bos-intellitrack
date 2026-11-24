# Gate C.4: operator-run guarded startup of ONLY isolated Supabase Storage.
# Do not run unless authorized for isolated Storage startup and bucket creation.
# Must be invoked from C:\Coding\bos-intellitrack.
$ErrorActionPreference = 'Stop'
$compose = 'specs/002-intellitrack-realignment-implementation/compose.gatec-storage.review.yaml'
$secrets = '.gatea/local-supabase/storage-secrets'
$expectedLedger = '465b74571f5ae62d308a3ef885f86a34'
$expectedContainers = @('supabase_auth_local-supabase', 'supabase_kong_local-supabase', 'supabase_db_local-supabase')

function Require-LastExit([string]$what) {
  if ($LASTEXITCODE -ne 0) { throw "$what failed ($LASTEXITCODE)." }
}
function Verify-ExistingServices {
  foreach ($name in $expectedContainers) {
    $state = (& docker inspect --format '{{.State.Running}}' $name).Trim()
    Require-LastExit "Docker inspection of $name"
    if ($state -ne 'true') { throw "Existing isolated service stopped: $name" }
  }
}
function Migration-Ledger {
  $sql = "BEGIN READ ONLY; SELECT md5(string_agg(id::text||'|'||name||'|'||hash, chr(10) ORDER BY id)) FROM storage.migrations; COMMIT;"
  $lines = @(& docker exec supabase_db_local-supabase psql -X -U postgres -d postgres -Atqc $sql)
  Require-LastExit 'Read-only isolated Storage migration check'
  return ($lines | Where-Object { $_ -match '^[0-9a-f]{32}$' } | Select-Object -First 1)
}
function Verify-Secret-Acl([string]$path) {
  $item = Get-Item -LiteralPath $path -Force
  if ($item.PSIsContainer -or $item.Length -le 0 -or ($item.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0) {
    throw 'Storage secret is missing, empty, or not an ordinary file.'
  }
  $acl = Get-Acl -LiteralPath $path
  if (-not $acl.AreAccessRulesProtected) { throw 'Storage secret ACL inheritance enabled.' }
  $ownerSid = [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value
  $allowed = @($ownerSid, 'S-1-5-32-544', 'S-1-5-18')
  foreach ($rule in $acl.Access) {
    $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
    if (($allowed -notcontains $sid) -or $rule.AccessControlType -ne 'Allow') {
      throw 'Storage secret ACL contains an unauthorized entry.'
    }
  }
}
if (-not (Test-Path -LiteralPath $compose -PathType Leaf)) { throw 'Reviewed Compose definition missing.' }
foreach ($name in @('db-url', 'jwt-secret')) { Verify-Secret-Acl (Join-Path $secrets $name) }
Write-Host 'Gate C: isolated credentials present with restricted Windows ACLs.'

& npm run gatea:env:preflight
Require-LastExit 'Gate A isolated environment preflight'
& cmd /c 'set GATEA_VERIFY_TAGGED_ONLY=1&& npm run gatea:fixtures:verify'
Require-LastExit 'Protected E6 verification'
Verify-ExistingServices
& docker compose -f $compose config --quiet
Require-LastExit 'Reviewed Compose validation'
$ledgerBefore = Migration-Ledger
if ($ledgerBefore -ne $expectedLedger) { throw 'Storage migration ledger changed; refusing startup.' }

$already = @(& docker ps -a --filter 'name=^/supabase_storage_local-supabase$' --format '{{.Names}}')
Require-LastExit 'Existing Storage inventory'
if ($already.Count -gt 0) { throw 'A Storage container already exists. Inspect manually instead of recreating it.' }
$vol = @(& docker volume ls --filter 'name=^gatec_storage_files_local-supabase$' --format '{{.Name}}')
Require-LastExit 'Storage volume inventory'
if ($vol.Count -gt 0) { throw 'A Storage volume already exists. Inspect manually instead of reusing it.' }

Write-Host 'Launching ONLY isolated Storage; no existing services will be restarted.'
& docker compose -f $compose up -d --no-deps --no-build --pull never storage
Require-LastExit 'Isolated Storage launch'

$ready = $false
for ($attempt = 0; $attempt -lt 20; $attempt++) {
  Start-Sleep -Seconds 2
  $state = (& docker inspect --format '{{.State.Running}}' supabase_storage_local-supabase).Trim()
  if ($LASTEXITCODE -ne 0 -or $state -ne 'true') { break }
  $status = (& curl.exe --silent --output NUL --write-out '%{http_code}' 'http://127.0.0.1:54321/storage/v1/status')
  if ($LASTEXITCODE -eq 0 -and $status -eq '200') { $ready = $true; break }
}
$ledgerAfter = Migration-Ledger
Verify-ExistingServices
& cmd /c 'set GATEA_VERIFY_TAGGED_ONLY=1&& npm run gatea:fixtures:verify'
Require-LastExit 'Post-start protected E6 verification'

if ($ledgerAfter -ne $ledgerBefore -or -not $ready) {
  Write-Warning 'Storage startup did not pass readiness/ledger checks. Stopping ONLY Storage (not removing volume).'
  & docker stop supabase_storage_local-supabase | Out-Null
  throw 'Storage activation did not pass; do not create buckets. Review Storage logs with sensitive values redacted.'
}
Write-Host 'Storage HTTP health and protected migration/E6 checks PASS.'
& node scripts/gatec-create-private-buckets.mjs
Require-LastExit 'Private bucket creation and verification'
& cmd /c 'set GATEA_VERIFY_TAGGED_ONLY=1&& npm run gatea:fixtures:verify'
Require-LastExit 'Post-bucket protected E6 verification'
$ledgerFinal = Migration-Ledger
if ($ledgerFinal -ne $ledgerBefore) { throw 'Post-bucket migration ledger mismatch; investigate.' }
Write-Host 'Gate C.4 isolated Storage activation: PASS. No upload objects were created.'
