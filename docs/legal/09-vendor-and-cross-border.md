# 09 Vendors and cross-border transfers

As of 21 Nov 2026.

## 1. Vendors (Data Processors under DPDP s.8(2))

| Vendor | Service | Data | Contract | Action |
|---|---|---|---|---|
| Google LLC / Google Cloud (Firebase Authentication, Cloud Firestore, Cloud Functions, Cloud Logging, hosting platform) | Auth, DB, backend | email, uid, profile, scores, logs | Google Cloud/Firebase Data Processing and Security Terms (DPA, accept in console under Cloud terms), Standard Contractual Clauses available | Owner: accept DPA, record date in this file; appoint billing/legal contact |
| Email sender for parent consent (not chosen yet) | transactional email | parent email (transient), child display name | DPA required | Choose a processor with India or adequate region; sign DPA |
| Google Fonts via `next/font` | fonts | none at runtime (fonts self-hosted at build) | n/a | Keep as is; do not link fonts.googleapis.com from the browser (would leak IPs) |
| Web hosting/CDN (not identified in repo) | static/SSR | request logs | DPA | Owner: record provider |

No analytics, ads, crash-reporting or social SDKs are present (package.json). Adding any requires counsel review (s.9(3)).

## 2. Region: what the repo uses and what to do

`firebase-applet-config.json`: projectId `seraphic-stone-014dk`, firestoreDatabaseId `ai-studio-eb2d7427-...` (a **named database created by Google AI Studio**), no storage use. The file does **not** state the Firestore location. **FLAG: location unverified.** AI Studio provisioned databases are frequently placed in a default multi-region/US location. Firestore location cannot be changed after creation.

Recommendation: asia-south1 (Mumbai) for Firestore and Cloud Functions (and Cloud Logging buckets, Secret Manager replication), because (a) data stays in India for DPDP s.16/CERT-In log-in-India expectations and latency, (b) it simplifies the notice.

Owner steps:
1. Console > Firestore > Databases: read the location of `ai-studio-...` (or `gcloud firestore databases describe`).
2. If not asia-south1: create a new named database in asia-south1, migrate (export/import is region-bound; use a one-off script), switch `firestoreDatabaseId`, delete the old one after verification and update 05.
3. Deploy Functions with `region: 'asia-south1'`; set the log bucket location to asia-south1 with 365-day retention (>= CERT-In 180 days).
4. Firebase Authentication data is stored globally and cannot be region-pinned; disclose this (02 section 9). Identity Platform with data residency is not generally selectable (VERIFY with Google).

## 3. Cross-border rule
DPDP s.16 allows transfer outside India except to countries the Government restricts by notification; Rule 15 and sectoral laws may impose more (VERIFY if any notification exists). No country has been restricted to our knowledge (VERIFY at launch). Keep a note of data locations and review at each release.

## 4. Vendor review checklist
Security certifications (ISO 27001/27017/27018, SOC 2); sub-processor list; breach notification time to us (Google: promptly, per DPA); deletion on termination; audit rights; no use of customer data for advertising.
