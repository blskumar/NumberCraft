<#
 Coordinated deploy. DRY-RUN by default: prints every deploy command, runs nothing destructive.
 Real run needs BOTH switches:  .\scripts\deploy.ps1 -Live -Confirm
 Order: checks -> functions -> firestore rules/indexes -> app (placeholder) -> smoke checks.
 See docs/ops/deploy-and-rollback.md
#>
param([switch]$Live, [switch]$Confirm, [string]$AppUrl = $env:APP_URL, [switch]$SkipChecks)
$ErrorActionPreference = 'Stop'
Set-Location (Join-Path $PSScriptRoot '..')
$cfg = Get-Content firebase-applet-config.json -Raw | ConvertFrom-Json
$ProjectId = $cfg.projectId
$Dry = -not ($Live -and $Confirm)
if ($Live -and -not $Confirm) { Write-Host '-Live requires -Confirm. Staying in dry-run.' -ForegroundColor Yellow }

function Step($t) { Write-Host "`n=== $t" -ForegroundColor Cyan }
function Safe([string]$cmd) { Write-Host "+ $cmd"; Invoke-Expression $cmd; if ($LASTEXITCODE) { throw "failed: $cmd" } }
function Run([string]$cmd) { if ($Dry) { Write-Host "[dry-run] $cmd" } else { Safe $cmd } }
function Ask([string]$q) {
  if ($Dry) { Write-Host "[dry-run] would ask: $q"; return }
  if ((Read-Host "$q [y/N]") -ne 'y') { throw 'aborted' }
}

Write-Host "Project: $ProjectId   Mode: $(if ($Dry) {'DRY-RUN'} else {'LIVE'})"
if (-not $Dry) {
  if ((Read-Host "Type the project id ($ProjectId) to continue") -ne $ProjectId) { throw 'mismatch' }
  New-Item -ItemType Directory -Force .deploy | Out-Null
  try { firebase firestore:rules:get --project $ProjectId | Out-File ".deploy/rules-before-$(Get-Date -Format yyyyMMddHHmmss).rules" -Encoding utf8 }
  catch { Write-Host 'warn: could not snapshot current rules' -ForegroundColor Yellow }
}

if (-not $SkipChecks) {
  Step '1/6 lint + unit tests + build'
  Safe 'npm run lint'
  Safe 'npx tsc --noEmit'
  Safe 'npx tsx --test (Get-ChildItem lib/*.test.ts | ForEach-Object { $_.FullName })'
  Safe 'npm run build'
  Step '2/6 emulator rules + functions tests'
  Safe 'npx firebase emulators:exec --only firestore --project demo-nc-deploy "node --test firestore.rules.emu.test.mjs"'
  if (Test-Path functions/package.json) { Safe 'npm --prefix functions install --no-audit --no-fund'; Safe 'npm --prefix functions test --if-present' }
  else { Write-Host 'note: functions/ not present yet (workstream E)' }
}

Step '3/6 deploy functions (first: new endpoints must exist before rules/client require them)'
Ask "Deploy functions to $ProjectId?"
Run "npx firebase deploy --only functions --project $ProjectId"

Step '4/6 deploy firestore rules + indexes'
Ask "Deploy firestore rules/indexes to $ProjectId?"
Run "npx firebase deploy --only firestore:rules,firestore:indexes --project $ProjectId"

Step '5/6 app deployment (PLACEHOLDER; middleware.ts needs a Node runtime)'
Write-Host '  Vercel:               vercel deploy --prod   (set NEXT_PUBLIC_* env first)'
Write-Host '  Cloud Run:            gcloud run deploy numbercraft --source . --region asia-south1'
Write-Host "  Firebase App Hosting: firebase apphosting:rollouts:create <backendId> --project $ProjectId"
Write-Host '  Self-host:            node .next/standalone/server.js (copy .next/static and public)'
Write-Host '  Not supported: static export / classic Hosting without a Node backend (no middleware => no CSP nonce).'
Ask 'Have you deployed the app to your chosen host?'

Step '6/6 post-deploy smoke checks'
if ($AppUrl) {
  $h1 = (curl.exe -sSI "$AppUrl/") -join "`n"; $h2 = (curl.exe -sSI "$AppUrl/") -join "`n"
  $csp = ($h1 -split "`n" | Where-Object { $_ -match '^content-security-policy' }) -join ''
  if ($csp -notmatch 'script-src') { throw 'FAIL: no CSP' }
  if ($csp -match 'script-src[^;]*unsafe-inline') { throw 'FAIL: unsafe-inline in script-src' }
  $n1 = [regex]::Match($h1, 'nonce-[A-Za-z0-9+/=]+').Value; $n2 = [regex]::Match($h2, 'nonce-[A-Za-z0-9+/=]+').Value
  if (-not $n1 -or $n1 -eq $n2) { throw 'FAIL: nonce missing or not rotating' }
  if ($h1 -notmatch '(?i)strict-transport-security') { throw 'FAIL: HSTS missing' }
  Write-Host 'OK: CSP/nonce/HSTS'
} else { Write-Host 'pass -AppUrl https://host to run header checks' }
if ($Dry) { Write-Host '[dry-run] would probe unauthenticated gameScores read (expect 401/403)' }
else {
  $url = "https://firestore.googleapis.com/v1/projects/$ProjectId/databases/$($cfg.firestoreDatabaseId)/documents/gameScores"
  $code = curl.exe -s -o NUL -w '%{http_code}' $url
  Write-Host "unauthenticated gameScores read -> HTTP $code (expect 401/403)"
  if ($code -notin '401','403') { throw 'FAIL: anonymous read not denied' }
}
if ($Dry) { Write-Host "`nDRY-RUN complete. Nothing was deployed. Re-run with -Live -Confirm to deploy." }
