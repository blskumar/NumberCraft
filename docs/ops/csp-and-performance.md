# CSP: nonce-based, no `'unsafe-inline'` for scripts

`middleware.ts` generates a fresh nonce per request and sets `Content-Security-Policy` on the response and on the forwarded request (Next 15 reads the request header and stamps its own bootstrap/flight scripts). `app/layout.tsx` reads `x-nonce` via `headers()` and applies it to the theme-init script. Other security headers stay static in `next.config.ts`.

| Directive | Value | Why |
|---|---|---|
| script-src | `'self' 'nonce-N' 'strict-dynamic'` + recaptcha hosts | strict-dynamic lets nonced code load chunks and the lazily injected reCAPTCHA script; hosts are only a fallback for old browsers. No `'unsafe-inline'` (dev adds `'unsafe-eval'` for React refresh). |
| style-src | `'self' 'nonce-N'` | `<style>` elements need the nonce. Dev adds `'unsafe-inline'` for HMR only. |
| style-src-attr | `'unsafe-inline'` | **Unavoidable**: `motion` and Tailwind arbitrary values emit `style="..."` attributes, which cannot carry a nonce. This only permits style attributes, not `<style>` blocks or scripts. |
| connect-src | self, identitytoolkit, securetoken, firestore, firebaseappcheck, `*.cloudfunctions.net`, `*.run.app`, recaptcha | what the lazy SDK needs. Tighten the functions entry to the exact `https://<region>-<project>.cloudfunctions.net` once workstream E fixes the region (CSP allows a wildcard only as the whole leftmost label, so use the full host). |
| frame-src | auth domain, recaptcha | auth handler iframe, reCAPTCHA challenge |
| object-src / base-uri / form-action / frame-ancestors | `none` / `self` / `self` / `none` | |
| other | `upgrade-insecure-requests`; `report-uri` only if env `CSP_REPORT_URI` is set (placeholder) | |

The middleware matcher skips `_next/static`, `_next/image`, favicon and prefetches.

## Performance implication
A nonce must differ per response, so HTML can no longer be prerendered and cached (`/` went from "static" to "dynamic" in the build table; the CDN cannot cache the HTML either). JS/CSS/fonts under `/_next/static` are still immutable-cached. Local measurement, same machine, `next start`, 60 sequential requests (noisy, other builds were running):

| | TTFB p50 | p95 |
|---|---|---|
| before (static HTML, unsafe-inline) | 6-10 ms | 11 ms |
| after (dynamic + middleware nonce) | 16-47 ms | 38-112 ms |

Expect roughly +10-30 ms server time per HTML request; on a serverless host add cold starts. Mitigations if needed: keep the host warm, or move to hash-based CSP for the few static inline scripts (the app has one: the theme init) and give up per-request nonces for Next's own scripts (not recommended: Next's inline flight payload scripts change per page).

## Verify
```bash
npm run build && node .next/standalone/server.js   # or: npx next start -p 3106
curl -sI http://localhost:3106/ | grep -i content-security     # twice: nonce must differ
node ../e2e/ev10-fixG-csp.mjs http://localhost:3106            # 0 violations expected
```
Rollback: restore the old static `Content-Security-Policy` entry in `next.config.ts` (`script-src 'self' 'unsafe-inline'`) and delete `middleware.ts`.
