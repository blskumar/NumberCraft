#!/usr/bin/env bash
# Coordinated deploy. DRY-RUN by default: prints every command, runs nothing destructive.
# Real run needs BOTH flags:  scripts/deploy.sh --live --confirm
# Order matters: functions -> rules/indexes -> app. See docs/ops/deploy-and-rollback.md
set -euo pipefail

LIVE=0; CONFIRM=0; APP_URL="${APP_URL:-}"; SKIP_CHECKS=0
for a in "$@"; do case "$a" in
  --live) LIVE=1;; --confirm) CONFIRM=1;; --app-url=*) APP_URL="${a#*=}";; --skip-checks) SKIP_CHECKS=1;;
  --dry-run) LIVE=0;; *) echo "unknown arg $a"; exit 2;; esac; done

cd "$(dirname "$0")/.."
PROJECT_ID=$(node -p "require('./firebase-applet-config.json').projectId")
DRY=1; if [ "$LIVE" = 1 ] && [ "$CONFIRM" = 1 ]; then DRY=0; fi
if [ "$LIVE" = 1 ] && [ "$CONFIRM" = 0 ]; then echo "--live requires --confirm. Staying in dry-run."; fi

step() { echo; echo "=== $1"; }
run()  { if [ "$DRY" = 1 ]; then echo "[dry-run] $*"; else echo "+ $*"; "$@"; fi; }
# checks (lint/test/build/emulators) are always safe, so they run even in dry-run
safe() { echo "+ $*"; "$@"; }
ask()  { if [ "$DRY" = 1 ]; then echo "[dry-run] would ask: $1"; return; fi
         read -r -p "$1 [y/N] " r; [ "$r" = y ] || { echo "aborted"; exit 1; }; }

echo "Project: $PROJECT_ID   Mode: $([ $DRY = 1 ] && echo DRY-RUN || echo LIVE)"
if [ "$DRY" = 0 ]; then
  read -r -p "Type the project id ($PROJECT_ID) to continue: " t; [ "$t" = "$PROJECT_ID" ] || { echo "mismatch"; exit 1; }
  # Safety: record rollback anchors before changing anything
  mkdir -p .deploy
  firebase firestore:rules:get --project "$PROJECT_ID" > ".deploy/rules-before-$(date +%s).rules" 2>/dev/null || echo "warn: could not snapshot current rules"
fi

if [ "$SKIP_CHECKS" = 0 ]; then
  step "1/6 lint + unit tests + build"
  safe npm run lint
  safe npx tsc --noEmit
  safe npx tsx --test lib/*.test.ts
  safe npm run build
  step "2/6 emulator rules + functions tests"
  safe npx firebase emulators:exec --only firestore --project demo-nc-deploy "node --test firestore.rules.emu.test.mjs"
  if [ -f functions/package.json ]; then
    safe npm --prefix functions install --no-audit --no-fund
    safe npm --prefix functions test --if-present
  else echo "note: functions/ not present yet (workstream E)"; fi
fi

step "3/6 deploy functions (first: new endpoints must exist before rules/client require them)"
ask "Deploy functions to $PROJECT_ID?"
run npx firebase deploy --only functions --project "$PROJECT_ID"

step "4/6 deploy firestore rules + indexes"
ask "Deploy firestore rules/indexes to $PROJECT_ID?"
run npx firebase deploy --only firestore:rules,firestore:indexes --project "$PROJECT_ID"

step "5/6 app deployment (PLACEHOLDER, choose one host; needs a Node runtime for middleware.ts)"
echo "  Vercel:           vercel deploy --prod            (set NEXT_PUBLIC_* env first)"
echo "  Cloud Run:        gcloud run deploy numbercraft --source . --region asia-south1"
echo "  Firebase App Hosting: firebase apphosting:rollouts:create <backendId> --project $PROJECT_ID"
echo "  Self-host:        node .next/standalone/server.js  (copy .next/static and public)"
echo "  Not supported: static export / classic Firebase Hosting rewrites without a Node backend (no middleware => no CSP nonce)."
ask "Have you deployed the app to your chosen host?"

step "6/6 post-deploy smoke checks"
if [ -z "$APP_URL" ]; then echo "set --app-url=https://host to run header checks"; else
  H1=$(curl -sSI "$APP_URL/" | tr -d '\r'); H2=$(curl -sSI "$APP_URL/" | tr -d '\r')
  N1=$(echo "$H1" | grep -io "nonce-[A-Za-z0-9+/=]*" | head -1); N2=$(echo "$H2" | grep -io "nonce-[A-Za-z0-9+/=]*" | head -1)
  echo "$H1" | grep -i "^content-security-policy" | grep -q "script-src" || { echo "FAIL: no CSP"; exit 1; }
  echo "$H1" | grep -i "^content-security-policy" | grep -i "script-src[^;]*unsafe-inline" && { echo "FAIL: unsafe-inline in script-src"; exit 1; }
  [ -n "$N1" ] && [ "$N1" != "$N2" ] || { echo "FAIL: nonce missing or not rotating"; exit 1; }
  echo "$H1" | grep -qi "^strict-transport-security" || { echo "FAIL: HSTS missing"; exit 1; }
  echo "OK: CSP/nonce/HSTS"
fi
# Rules probe: unauthenticated REST read must be denied (live only; dry-run never calls Google)
if [ "$DRY" = 1 ]; then echo "[dry-run] would probe unauthenticated gameScores read (expect 401/403)"; else
DB_ID=$(node -p "require('./firebase-applet-config.json').firestoreDatabaseId")
CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/$DB_ID/documents/gameScores")
echo "unauthenticated gameScores read -> HTTP $CODE (expect 401/403)"
case "$CODE" in 401|403) echo "OK: rules deny anonymous read";; *) echo "FAIL: anonymous read not denied"; exit 1;; esac
fi
[ "$DRY" = 1 ] && echo && echo "DRY-RUN complete. Nothing was deployed. Re-run with --live --confirm to deploy."
