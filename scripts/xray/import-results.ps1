param(
  [string]$ExecutionKey = 'XSP1-82',
  [ValidateSet('Results', 'Tests', 'Verify')]
  [string]$Mode = 'Results',
  [switch]$ResetCredentials
)

$ErrorActionPreference = 'Stop'

if ($env:OS -ne 'Windows_NT') {
  throw 'This credential helper requires Windows DPAPI. For CI, call scripts/xray/import-results.mjs with XRAY_CLIENT_ID and XRAY_CLIENT_SECRET environment variables.'
}

$repoRoot = Split-Path -Parent (Split-Path -Parent $PSScriptRoot)
$credentialPath = Join-Path $repoRoot '.xray-credentials.dpapi'
$previousClientId = $env:XRAY_CLIENT_ID
$previousClientSecret = $env:XRAY_CLIENT_SECRET
$previousExecutionKey = $env:XRAY_EXECUTION_KEY
$clientId = $null
$plainSecret = $null
$credentialPayload = $null
$secretPointer = [IntPtr]::Zero
$payloadPointer = [IntPtr]::Zero
$secureSecret = $null
$storedCredential = $null

try {
  if (-not $ResetCredentials -and ($previousClientId -or $previousClientSecret)) {
    if (-not ($previousClientId -and $previousClientSecret)) {
      throw 'Set both XRAY_CLIENT_ID and XRAY_CLIENT_SECRET, or clear both and use the saved credential.'
    }
    $clientId = $previousClientId
    $plainSecret = $previousClientSecret
  } elseif (-not $ResetCredentials -and (Test-Path -LiteralPath $credentialPath)) {
    $protectedPayload = (Get-Content -LiteralPath $credentialPath -Raw).Trim()
    $storedCredential = ConvertTo-SecureString -String $protectedPayload
    $payloadPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($storedCredential)
    $credentialPayload = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($payloadPointer)
    $separator = $credentialPayload.IndexOf("`n")
    if ($separator -lt 1) { throw 'The saved Xray credential is invalid. Run with -ResetCredentials to replace it.' }
    $clientId = $credentialPayload.Substring(0, $separator).TrimEnd("`r")
    $plainSecret = $credentialPayload.Substring($separator + 1).TrimEnd("`r", "`n")
  } else {
    $clientId = Read-Host 'Xray API Client ID'
    $secureSecret = Read-Host 'Xray API Client Secret (saved encrypted for this Windows user)' -AsSecureString
    if (-not $clientId -or $secureSecret.Length -eq 0) { throw 'Xray Client ID and Client Secret are required.' }

    $secretPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secureSecret)
    $plainSecret = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($secretPointer)
    $credentialPayload = "$clientId`n$plainSecret"
    $protectedCredential = ConvertTo-SecureString -String $credentialPayload -AsPlainText -Force | ConvertFrom-SecureString
    Set-Content -LiteralPath $credentialPath -Value $protectedCredential -Encoding ascii -NoNewline
    Write-Host 'Xray credentials saved encrypted with Windows DPAPI for this Windows user.'
  }

  $env:XRAY_CLIENT_ID = $clientId
  $env:XRAY_CLIENT_SECRET = $plainSecret
  $env:XRAY_EXECUTION_KEY = $ExecutionKey
  Push-Location $repoRoot
  try {
    $importScript = switch ($Mode) {
      'Tests' { 'scripts/xray/import-tests.mjs' }
      'Verify' { 'scripts/xray/verify-execution.mjs' }
      default { 'scripts/xray/import-results.mjs' }
    }
    & node $importScript
    if ($LASTEXITCODE -ne 0) { throw "Xray helper failed with exit code $LASTEXITCODE." }
  } finally {
    Pop-Location
  }
} finally {
  if ($secretPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($secretPointer) }
  if ($payloadPointer -ne [IntPtr]::Zero) { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($payloadPointer) }
  if ($secureSecret) { $secureSecret.Dispose() }
  if ($storedCredential) { $storedCredential.Dispose() }
  $plainSecret = $null
  $credentialPayload = $null
  $protectedPayload = $null
  $protectedCredential = $null
  $env:XRAY_CLIENT_ID = $previousClientId
  $env:XRAY_CLIENT_SECRET = $previousClientSecret
  $env:XRAY_EXECUTION_KEY = $previousExecutionKey
}
