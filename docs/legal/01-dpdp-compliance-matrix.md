# 01 DPDP and related compliance matrix

As of 21 Nov 2026. Section/Rule numbers come from secondary summaries cross-checked across several firms; verify pinpoints against the Gazette before relying on them. Items marked **(VERIFY)** are uncertain or pending.

Sources
- S1 PIB release and Rules PDF: https://static.pib.gov.in/WriteReadData/specificdocs/documents/2025/nov/doc20251117695301.pdf
- S2 Tribune India (phased commencement): https://www.tribuneindia.com/news/business/govt-notifies-digital-personal-data-protection-rules-rollout-in-phases-specified-obligations-for-data-fiduciaries
- S3 SCC Online key highlights: https://www.scconline.com/blog/post/2025/12/26/digital-personal-data-protection-rules-2025-key-highlights/
- S4 Legal500 18-month countdown: https://www.legal500.com/firms/237811-saga-legal/c-india/news-and-developments/the-privacy-timer-starts-now-analysing-the-dpdp-rules-and-its-18-month-countdown
- S5 Bar and Bench: https://www.barandbench.com/amp/story/law-firms/view-point/meity-notifies-final-digital-personal-data-protection-rules-2025
- S6 CERT-In Directions summary (Linklaters): https://www.linklaters.com/en/insights/blogs/digilinks/2022/may/india-new-and-onerous-cyber-security-framework-and-breach-reporting-obligations ; Khaitan: https://khaitanco.com/sites/default/files/2022-04/Ergo_30042022.pdf
- S7 MeitY data-protection framework page: https://www.meity.gov.in (primary Act/Rules text; pinpoint URL to be confirmed)

Repo evidence paths are relative to the repo root. "Owner" = business owner; "E" = Cloud Functions/rules agent.

## A. DPDP Act 2023 / Rules 2025

| # | Obligation | Source | How NumberCraft meets it | Evidence | Gap / owner action |
|---|---|---|---|---|---|
| A-1 | Applicability, timing | Act s.1(2); Rules commencement (S2, S4) | Build to the final standard now | docs/legal/* | Re-check for any accelerated commencement (VERIFY) |
| A-2 | Notice before/at consent: itemised data, purpose, how to withdraw, how to exercise rights, how to complain to the Board; clear and plain language; English or any Eighth Schedule language | Act s.5; Rule 3 | Notice in /privacy with child summary; consent step links it | 02; app/privacy/page.tsx; components/ConsentGate.tsx | Hindi (and other) translation on request: owner to commission (02 section 9) |
| A-3 | Consent: free, specific, informed, unconditional, unambiguous, clear affirmative action; limited to necessary data; withdrawal as easy as giving | Act s.6(1)-(4) | Unticked checkbox + age choice; account needs only email, name, tier | ConsentGate.tsx; lib/consent.ts | None for adults; withdrawal UI = delete account today (see A-9) |
| A-4 | Legitimate uses (no consent) | Act s.7 | Not relied on for core processing; security logging only | 05 | Counsel to confirm |
| A-5 | Child = under 18; verifiable consent of parent/lawful guardian before processing | Act s.2(f), s.9(1); Rule 10 | Age-band gate; parent email link flow; account pending until granted | 04; lib/consent.ts; lib/consent-client.ts | **Backend not built**: functions to send email, confirm token, write consents/{uid} (spec in 04, owner E). Rule 10 method sufficiency (VERIFY) |
| A-6 | No tracking, behavioural monitoring or targeted ads aimed at children | Act s.9(3) | No analytics, no ads, no third-party SDKs; localStorage is functional only | package.json; no analytics code | Keep it so. Any analytics/ad SDK needs counsel first. Gameplay stats shown to the user themselves are not tracking by us, but do not build cross-user profiling |
| A-7 | No processing likely to have detrimental effect on a child's well-being | Act s.9(2) | Leaderboard shows pseudonymous names; moderation; no chat; no streak-guilt dark patterns | 06 | Review streak/reward copy with counsel; hide uid and age tier from public score docs (06, E) |
| A-8 | Exemptions for classes of fiduciaries / lower age | Act s.9(4)-(5); Rule 12; Fourth Schedule | **Not relied on** | none | Fourth Schedule seems aimed at educational institutions, healthcare, child-care (VERIFY); do not assume applicability |
| A-9 | Rights: access/summary, correction and erasure, grievance, nominate | Act s.11-14; Rule 14 | Delete-account (self-serve); contact route; correction via profile edit | lib/firebase.ts deleteAccount; components/AccountModal.tsx; /grievance | Access/summary route is manual (08). Nominee: add to 08 process |
| A-10 | Erasure when consent withdrawn or purpose served, unless law requires retention; ask processors to erase | Act s.8(7); s.6(6) | Delete-account removes scores, profile, Auth user. Inactive-account purge planned | 05 | Server-side deletion (also consents, requests) and inactivity job: E. Withdrawal for a minor by parent: manual via /grievance until backend exists |
| A-11 | Reasonable security safeguards | Act s.8(5); Rule 6 | Firestore rules, CSP, HTTPS, least data, password policy | firestore.rules; security_spec.md; next.config.ts | App Check, referrer-restrict API key, email-enumeration protection (console, owner/G). Log retention (A-13) |
| A-12 | Breach: tell Board and each affected principal; detailed report to Board within 72 hours | Act s.8(6); Rule 7 | Runbook | 07 | Appoint incident lead; test the drill |
| A-13 | Retain traffic and processing logs one year (where applicable) | Rule 8 and Third Schedule (VERIFY scope) | Cloud Logging retention set to at least 1 year, kept in India (also CERT-In 180 days) | 09 | Owner config in GCP; no PII in logs (code review) |
| A-14 | Publish contact of person answering questions (DPO or designated) | Act s.8(9); Rule 9 | In /grievance and privacy notice | app/grievance/page.tsx | Fill `[DPO/contact]` |
| A-15 | Grievance redressal system; publish response period (max 90 days) | Act s.8(10), s.13; Rule 14(3) | SOP: acknowledge 24h, resolve 15 days | 08 | Fill grievance officer details |
| A-16 | Processor contract | Act s.8(2) | Google Cloud Data Processing terms | 09 | Accept/record DPA in console |
| A-17 | Accuracy and completeness | Act s.8(3) | User can edit profile | AccountModal | None |
| A-18 | Cross-border transfer allowed unless restricted by notification; comply with Government requirements | Act s.16; Rule 15 | Firebase is global; asia-south1 recommended | 09 | **Firestore location unverified; Auth is global**. Check console (09) |
| A-19 | Significant data fiduciary duties (DPO in India, audit, DPIA) | Act s.10; Rule 13 | Unlikely at launch (VERIFY thresholds when notified) | none | Monitor; voluntary DPIA recommended |
| A-20 | Consent managers | Act s.6(7)-(9); Rule 4 (in force ~Nov 2026) | Not integrated | none | Optional; revisit |
| A-21 | Penalties (up to Rs 200 crore for breach of children's obligations; Rs 250 crore for failure of security safeguards; Rs 200 crore for breach-notification failure) | Act s.33 and Schedule | n/a | n/a | Board risk context for owner |

## B. IT Act 2000 and SPDI Rules 2011

| # | Obligation | Source | How met | Evidence | Gap |
|---|---|---|---|---|---|
| B-1 | Body corporate with sensitive personal data (passwords) must have privacy policy, obtain written consent, publish grievance officer, reasonable security | IT Act s.43A; SPDI Rules 3, 4, 5, 8 | Privacy policy, consent step, officer, Firebase security | 02, /privacy | Applies until DPDP s.44(2) commences. Passwords are held by Firebase Auth (hashed), not by us |
| B-2 | Reasonable security practice (IS/ISO 27001 or equivalent) | SPDI Rule 8 | Google's ISO 27001 for infra; app-level controls in security_spec.md | 09 | Document an information-security policy |

## C. Intermediary, CERT-In, POCSO

| # | Obligation | Source | How met | Evidence | Gap |
|---|---|---|---|---|---|
| C-1 | Intermediary: publish rules/privacy policy, tell users not to post unlawful content (display names), grievance officer; acknowledge in 24h, resolve in 15 days; act on certain takedown complaints within 24h | IT Act s.79; Intermediary Rules 2021 r.3(1)-(2) (VERIFY current amendments) | Terms section 5, 06, 08 | 03, 06, 08 | Safe harbour depends on due diligence and prompt takedown: staff the inbox |
| C-2 | Report specified cyber incidents to CERT-In within 6 hours; keep ICT logs 180 days within India; sync clocks | CERT-In Directions 28 Apr 2022 under IT Act s.70B(6), in force 27 Jun 2022 (S6) | 07 | 07 | Name a point of contact; configure log retention in India (09) |
| C-3 | POCSO: report knowledge of child sexual offences; do not store/transmit exploitative material | POCSO Act 2012 s.19-21, 15 (VERIFY applicability) | No chat/image upload; 06 escalation path | 06 | Counsel to confirm duty scope |

## D. Advertising, consumer, other

| # | Topic | Source | Position | Gap |
|---|---|---|---|---|
| D-1 | Dark patterns (13 listed, e.g. confirm-shaming, forced action, nagging) | CCPA Guidelines for Prevention and Regulation of Dark Patterns 2023 | Consent step is neutral; no countdowns; cancel/delete is one click | Review streak and "lock" messaging for confirm-shaming (owner) |
| D-2 | Ads to children | ASCI Code (child-directed advertising chapter); CCPA Misleading Advertisements Guidelines 2022 | No ads. Marketing claims ("improves marks") must be substantiated | Marketing copy review |
| D-3 | Payments (future) | Consumer Protection Act 2019; Consumer Protection (E-Commerce) Rules 2020; RBI rules via payment gateway; minors cannot contract (Indian Contract Act s.11) | No payments today. If added: parent-only purchase, refund/grievance rules, GST | Out of scope until built |
| D-4 | Education law | RTE Act 2009; Coaching Centre Guidelines 2024 (Ministry of Education) | Not applicable to a free game; avoid claiming to be a school or coaching centre | none |
| X-4 | Copyright: quotes in app, fonts, images | Copyright Act 1957 | Fonts are OFL and self-hosted by next/font; check each quote in lib/daily-quotes.ts is public domain or properly attributed | Owner: audit quote sources |
| X-5 | Trademark/name "NumberCraft" | Trade Marks Act 1999 | Run a clearance search | Owner |
