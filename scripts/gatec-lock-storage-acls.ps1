# Gate C.3: Restrict local-only Storage secret files and their directory.
# Explicit Windows local-operator invocation; no credential contents are read.
# Run from C:\Coding\bos-intellitrack:
#   powershell -NoProfile -ExecutionPolicy Bypass -File scripts/gatec-lock-storage-acls.ps1
$ErrorActionPreference = 'Stop'

$root = (Resolve-Path '.gatea/local-supabase').Path
$dir = Join-Path $root 'storage-secrets'
$names = @('db-url', 'jwt-secret')
if (-not (Test-Path -LiteralPath $dir -PathType Container)) { throw 'Expected isolated Storage secrets directory missing.' }
foreach ($name in $names) {
  $file = Join-Path $dir $name
  if (-not (Test-Path -LiteralPath $file -PathType Leaf)) { throw "Expected Storage secret file missing: $name" }
  $entry = Get-Item -LiteralPath $file -Force
  if (($entry.Attributes -band [System.IO.FileAttributes]::ReparsePoint) -ne 0 -or $entry.Length -le 0) {
    throw "Unsafe or empty Storage secret file: $name"
  }
}
$current = [System.Security.Principal.WindowsIdentity]::GetCurrent().User
if (-not $current) { throw 'Cannot resolve current Windows account.' }
$allowed = @($current, [System.Security.Principal.SecurityIdentifier]'S-1-5-32-544', [System.Security.Principal.SecurityIdentifier]'S-1-5-18')
$rights = [System.Security.AccessControl.FileSystemRights]::FullControl
$allow = [System.Security.AccessControl.AccessControlType]::Allow

function Restrict-Acl([string]$path, [bool]$isDirectory) {
  $acl = Get-Acl -LiteralPath $path
  $acl.SetAccessRuleProtection($true, $false)
  foreach ($rule in @($acl.Access)) { $acl.RemoveAccessRuleSpecific($rule) | Out-Null }
  $inherit = if ($isDirectory) {
    [System.Security.AccessControl.InheritanceFlags]'ContainerInherit, ObjectInherit'
  } else { [System.Security.AccessControl.InheritanceFlags]::None }
  foreach ($principal in $allowed) {
    $rule = [System.Security.AccessControl.FileSystemAccessRule]::new(
      $principal, $rights, $inherit,
      [System.Security.AccessControl.PropagationFlags]::None, $allow
    )
    $acl.AddAccessRule($rule)
  }
  Set-Acl -LiteralPath $path -AclObject $acl
}
# Restrict each secret file first, then the parent directory.
foreach ($name in $names) { Restrict-Acl (Join-Path $dir $name) $false }
Restrict-Acl $dir $true

# Verify with SID identity, not localized group display names.
$permitted = @($allowed | ForEach-Object { $_.Value })
foreach ($path in (@($names | ForEach-Object { Join-Path $dir $_ }) + @($dir))) {
  $acl = Get-Acl -LiteralPath $path
  if (-not $acl.AreAccessRulesProtected) { throw 'Inherited permissions remain enabled.' }
  foreach ($rule in $acl.Access) {
    $sid = $rule.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value
    if ($permitted -notcontains $sid -or $rule.AccessControlType -ne $allow) {
      throw 'Unexpected access-control entry remains.'
    }
  }
}
Write-Host 'Gate C Storage secret Windows ACLs restricted and verified. No credentials displayed.'
Write-Host 'Next: independently review startup side effects before isolated Storage activation.'
