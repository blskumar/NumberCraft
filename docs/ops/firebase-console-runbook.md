# Firebase / Google Cloud hardening runbook

Owner-run. Nothing here is executed by CI or by the deploy script. Every step has a **Verify** and a **Rollback**.

```bash
# One-time shell setup (bash; PowerShell: $env:PROJECT_ID="..." etc.)
export PROJECT_ID=seraphic-stone-014dk            # from firebase-applet-config.json
export PROJECT_NUMBER=788374142966                 # messagingSenderId
export DB_ID=ai-studio-eb2d7427-0e3d-4e1f-ae8f-1222697a9655
export WEB_APP_ID=1:788374142966:web:4275f560b3e95f084f11d7
export REGION=asia-south1                          # Firestore + functions region (confirm in step 7)
gcloud auth login && gcloud config set project "$PROJECT_ID"
export TOKEN=$(gcloud auth print-access-token)     # re-run when it expires (1h)
```

Recommended order: 1 App Check (monitor) -> 2 API key -> 3 Auth settings -> 4 password policy -> 5 domains -> 6 templates -> 7 budgets/logs/backups -> deploy the app with the site key -> watch metrics 3-7 days -> 1.4 enforce.

---

## 1. App Check (reCAPTCHA Enterprise)

### 1.1 Enable APIs and create the reCAPTCHA Enterprise key
```bash
gcloud services enable recaptchaenterprise.googleapis.com firebaseappcheck.googleapis.com
# Replace the example hosts with the real prod/staging hosts. Keep localhost only for dev.
gcloud recaptcha keys create --display-name="numbercraft-web" --web \
  --domains="numbercraft.example.com,staging.numbercraft.example.com,localhost" \
  --integration-type=score
gcloud recaptcha keys list          # copy the key id
export SITE_KEY=<key id>
```
**Verify:** `gcloud recaptcha keys describe $SITE_KEY` lists your domains.
**Rollback:** `gcloud recaptcha keys delete $SITE_KEY`.

### 1.2 Register the web app with App Check
```bash
curl -sS -X PATCH \
 "https://firebaseappcheck.googleapis.com/v1/projects/$PROJECT_NUMBER/apps/$WEB_APP_ID/recaptchaEnterpriseConfig?updateMask=siteKey,tokenTtl" \
 -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" -H "Content-Type: application/json" \
 -d "{\"siteKey\":\"$SITE_KEY\",\"tokenTtl\":\"3600s\"}"
```
**Verify:** `curl -sS "https://firebaseappcheck.googleapis.com/v1/projects/$PROJECT_NUMBER/apps/$WEB_APP_ID/recaptchaEnterpriseConfig" -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID"` returns the site key.
**Rollback:** same URL with `-X DELETE` (only while nothing is enforced).

### 1.3 Ship the client key (monitoring mode)
Set `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY=$SITE_KEY` at **build time** in the host's env and redeploy the app. Without it the client never loads App Check (guests are unaffected either way; the SDK is dynamically imported only after sign-in/cloud use).
Local dev: set `NEXT_PUBLIC_APPCHECK_DEBUG_TOKEN=true`, open the app, copy the token printed in the console, register it under Console > App Check > Apps > Manage debug tokens. Never set this in production builds.
**Verify:** DevTools Network shows `firebaseappcheck.googleapis.com ... exchangeRecaptchaEnterpriseToken` returning 200; Console > App Check > APIs shows "Verified requests" growing.
**Rollback:** unset the env var and redeploy.

### 1.4 Enforce (only after about 95% of requests are verified for several days)
Console > App Check > APIs > Cloud Firestore / Authentication > **Enforce**. Or REST:
```bash
for SVC in firestore.googleapis.com identitytoolkit.googleapis.com; do
  curl -sS -X PATCH "https://firebaseappcheck.googleapis.com/v1/projects/$PROJECT_NUMBER/services/$SVC?updateMask=enforcementMode" \
   -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" -H "Content-Type: application/json" \
   -d '{"enforcementMode":"ENFORCED"}'
done
```
Functions: enforce in code (`onCall({ enforceAppCheck: true })`, owned by workstream E).
**Verify:** a raw REST call without an App Check token fails: `curl -s -o /dev/null -w "%{http_code}\n" "https://firestore.googleapis.com/v1/projects/$PROJECT_ID/databases/$DB_ID/documents/gameScores"` returns 401/403.
**Rollback (instant):** same PATCH with `{"enforcementMode":"UNENFORCED"}`. If real users are blocked, roll back first, investigate second.

---

## 2. API key restriction (HTTP referrer + API allow-list)

The web API key is public by design; restriction limits abuse from other origins.
```bash
gcloud services api-keys list --format="table(name,displayName,uid)"
export KEY_ID=<uid of the browser key>
gcloud services api-keys describe $KEY_ID > key-backup.json      # rollback material
gcloud services api-keys update $KEY_ID \
  --allowed-referrers="http://localhost:3000/*,http://localhost:3106/*,https://staging.numbercraft.example.com/*,https://numbercraft.example.com/*,https://$PROJECT_ID.firebaseapp.com/*,https://$PROJECT_ID.web.app/*" \
  --api-target=service=identitytoolkit.googleapis.com \
  --api-target=service=securetoken.googleapis.com \
  --api-target=service=firestore.googleapis.com \
  --api-target=service=firebaseappcheck.googleapis.com \
  --api-target=service=firebaseinstallations.googleapis.com
```
Drop the localhost entries on the production project. The `firebaseapp.com` entry is needed by the auth handler.
**Verify:** `curl -s -o /dev/null -w "%{http_code}\n" -H "Referer: https://evil.example/" -H "Content-Type: application/json" -d '{}' "https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=<API_KEY>"` returns 403 (`API_KEY_HTTP_REFERRER_BLOCKED`); sign-in from the real site still works.
**Rollback:** `gcloud services api-keys update $KEY_ID --clear-restrictions`, then re-apply values from `key-backup.json`.

## 3. Auth: quotas, sign-up abuse, email-enumeration protection
Upgrade to Identity Platform first (Console > Authentication > Upgrade) so the admin config API is available.
```bash
# 3.1 Read current config (save for rollback)
curl -sS "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config" \
 -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" | tee auth-config-backup.json

# 3.2 Email-enumeration protection ON, sign-up quota 50 per hour (per project)
curl -sS -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config?updateMask=emailPrivacyConfig,quotaConfig" \
 -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" -H "Content-Type: application/json" \
 -d '{"emailPrivacyConfig":{"enableImprovedEmailPrivacy":true},
      "quotaConfig":{"signUpQuotaConfig":{"quota":50,"startTime":"2026-01-01T00:00:00Z","quotaDuration":"3600s"}}}'
```
The client already shows generic errors, so enabling this causes no UX change.
Optional: blocking functions (`beforeUserCreated`) to reject disposable email domains; deploy through workstream E, then register via `updateMask=blockingFunctions`. Keep only Email/Password enabled (Console > Authentication > Sign-in method).
Request quotas: Console > IAM & Admin > Quotas, filter `identitytoolkit`, lower per-minute limits, add an alert at 70%.
**Verify:** repeat the GET; `emailPrivacyConfig.enableImprovedEmailPrivacy` is `true`. Sign up with an existing email: response must not reveal that it exists.
**Rollback:** PATCH the values from `auth-config-backup.json` (`"enableImprovedEmailPrivacy":false`, remove the quota).

## 4. Password policy
```bash
curl -sS -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config?updateMask=passwordPolicyConfig" \
 -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" -H "Content-Type: application/json" \
 -d '{"passwordPolicyConfig":{"passwordPolicyEnforcementState":"ENFORCE",
   "passwordPolicyVersions":[{"customStrengthOptions":{
     "minPasswordLength":10,"maxPasswordLength":128,
     "containsLowercaseCharacter":true,"containsUppercaseCharacter":true,"containsNumericCharacter":true}}]}}'
```
Use `"CHECK_ONLY"` first to observe without blocking. Accounts are for children and guardians: prefer length over symbol rules, and make sure the sign-up form copy matches the policy.
**Verify:** sign up with a 6-character password fails with `auth/password-does-not-meet-requirements`.
**Rollback:** set `"passwordPolicyEnforcementState":"OFF"`.

## 5. Authorized domains
```bash
curl -sS -X PATCH "https://identitytoolkit.googleapis.com/admin/v2/projects/$PROJECT_ID/config?updateMask=authorizedDomains" \
 -H "Authorization: Bearer $TOKEN" -H "x-goog-user-project: $PROJECT_ID" -H "Content-Type: application/json" \
 -d "{\"authorizedDomains\":[\"localhost\",\"$PROJECT_ID.firebaseapp.com\",\"$PROJECT_ID.web.app\",\"numbercraft.example.com\",\"staging.numbercraft.example.com\"]}"
```
Remove `localhost` in production.
**Verify:** GET config shows the list. **Rollback:** PATCH the previous list from the backup (a missing domain breaks verify and reset links).

## 6. Email templates
Console > Authentication > Templates: verify-email, password reset, email change. Set sender name "Numbercraft", a monitored reply-to, plain child-friendly subjects. There is no stable REST for template text; screenshot before/after as the rollback. For deliverability, set up SPF/DKIM via Templates > customize domain.
**Verify:** send a reset to a test mailbox and check the headers show SPF and DKIM pass.

## 7. Budget alerts, region, backups/PITR, log retention
```bash
gcloud billing accounts list                                   # note BILLING_ID
gcloud billing budgets create --billing-account=$BILLING_ID --display-name="numbercraft" \
  --budget-amount=20USD --filter-projects="projects/$PROJECT_ID" \
  --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0
```
Budgets alert; they do not cap spend. **Verify:** `gcloud billing budgets list --billing-account=$BILLING_ID`. **Rollback:** `gcloud billing budgets delete <name> --billing-account=$BILLING_ID`.

**Firestore region note:** a database location is immutable. Confirm it is `asia-south1`:
`gcloud firestore databases describe --database=$DB_ID --format="value(locationId)"`.
Functions that touch Firestore must run in the same region (`setGlobalOptions({region:'asia-south1'})`), and `connect-src` already allows `https://*.cloudfunctions.net` and `https://*.run.app`.

**PITR and scheduled backups:**
```bash
gcloud firestore databases update --database=$DB_ID --enable-pitr
gcloud firestore backups schedules create --database=$DB_ID --recurrence=daily --retention=14d
```
**Verify:** `gcloud firestore databases describe --database=$DB_ID --format="value(pointInTimeRecoveryEnablement)"` prints `POINT_IN_TIME_RECOVERY_ENABLED`; `gcloud firestore backups schedules list --database=$DB_ID`.
**Restore drill (quarterly):** `gcloud firestore databases clone --source-database=projects/$PROJECT_ID/databases/$DB_ID --snapshot-time=<RFC3339 within 7 days> --destination-database=restore-test`, check it, then delete the clone.
**Rollback:** `--no-enable-pitr`; `gcloud firestore backups schedules delete`.

**Log retention:**
```bash
gcloud logging buckets update _Default --location=global --retention-days=30
```
**Verify:** `gcloud logging buckets describe _Default --location=global --format="value(retentionDays)"` prints 30. **Rollback:** set it back to the previous value (default 30). Data Access audit logs for Firestore and Identity Toolkit cost money; enable them only if you need them.
