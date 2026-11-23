# Coordinated deploy and rollback

```powershell
.\scripts\deploy.ps1                 # DRY-RUN (default): runs local checks, prints deploy commands
.\scripts\deploy.ps1 -Live -Confirm  # real deploy; also asks you to type the project id
```
```bash
scripts/deploy.sh                    # dry-run
scripts/deploy.sh --live --confirm --app-url=https://numbercraft.example.com
```
The project id comes from `firebase-applet-config.json`. Dry-run never contacts Google; the lint/tsc/unit/build/emulator steps run locally.

## Order and why
1. **Functions first.** The server-side score/moderation endpoints must exist before anything requires them.
2. **Rules and indexes second.** Once rules deny direct client writes to `gameScores`, any client still writing directly breaks. Deploying rules before functions means no valid write path exists.
3. **Client last.** New client calls the function path. During the gap between steps 2 and 3, the *old* client's score saves fail (rules deny) but nothing else breaks (guests are unaffected: they never touch Firebase).
4. **Score kill switch:** `lib/firebase.ts` reads `NEXT_PUBLIC_CLIENT_SCORE_WRITES` at build time. Default (unset or any value but `off`) = scores post through the `startRound`/`submitScore` callables. `off` stops the client posting scores at all (rollback if the functions misbehave). The legacy direct client write path no longer exists; rules deny it.
5. Enforce App Check (runbook 1.4) only after the new client has been live for days.

Indexes: the leaderboard queries are single-field equality or a single-field range on `dateKey` plus `limit`, and `uid ==` on its own. These use automatic single-field indexes, so `firestore.indexes.json` is empty. Add composite entries only if a query gains `orderBy` on a second field.

## Host choice (middleware needs a Node runtime)
| Host | Notes |
|---|---|
| Vercel | simplest; middleware runs on the edge runtime, all `NEXT_PUBLIC_*` set in project env |
| Cloud Run | `output: 'standalone'` is already configured; `gcloud run deploy numbercraft --source . --region asia-south1` |
| Firebase App Hosting | managed Next on Cloud Run; `firebase apphosting:rollouts:create` |
| Classic Firebase Hosting (static) | **not supported**: no middleware, so no nonce and no CSP |

## Post-deploy smoke checks (automated at the end of the script)
CSP present, no `unsafe-inline` in script-src, nonce differs between two requests, HSTS present, and an unauthenticated REST read of `gameScores` returns 401/403.

## Rollback
- **Rules:** the script saves the previous rules to `.deploy/rules-before-*.rules`. Restore: `cp .deploy/rules-before-<ts>.rules firestore.rules && npx firebase deploy --only firestore:rules --project $PROJECT_ID`. Or Console > Firestore > Rules > History > pick an earlier release > Publish.
- **Functions:** `firebase functions:list --project $PROJECT_ID`; redeploy the previous git tag (`git checkout <tag> && firebase deploy --only functions`). For a v2 function, Cloud Run keeps revisions: `gcloud run services update-traffic <fn> --region asia-south1 --to-revisions=<prev>=100`.
- **App:** Vercel `vercel rollback`; Cloud Run `gcloud run services update-traffic numbercraft --to-revisions=<prev>=100`; App Hosting: roll back in Console > App Hosting > Rollouts.
- **Order for rollback:** app first, then rules, then functions (reverse of deploy).
