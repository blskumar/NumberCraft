# NumberCraft legal pack: README and disclaimer

Status: DRAFT prepared 21 Nov 2026 ("as of" date for every legal statement in this folder).
Product: NumberCraft, a children's maths-game web app (learners about 8-16), optional email/password accounts (Firebase Auth + Firestore on Google Cloud), a public-name leaderboard, localStorage for guests, no ads, no analytics.

## 1. This is not legal advice

This pack was prepared by an AI assistant acting in a technology-and-data-protection-lawyer role to give counsel and the owner a structured starting point. It has not been reviewed by a qualified Indian advocate. **Counsel review and sign-off are required before launch**, and in particular before any child's data is collected from real users. Statutes, rules and Board guidance move quickly: re-verify every citation against the official Gazette text.

## 2. Law in force, in one paragraph (as of 21 Nov 2026)

- **DPDP Act 2023** (Act 22 of 2023) and **DPDP Rules 2025**, notified by MeitY on 13/14 Nov 2025 (sources differ on the day; confirm against the Gazette). Phased commencement: Data Protection Board provisions (Rules 1, 2, 17-21) took effect on notification; consent-manager provisions (Rule 4) one year later (about Nov 2026); the substantive fiduciary duties (notice, consent, children, security, breach, retention, rights) after **18 months, about 13/14 May 2027**. Check for any amendment shortening this window.
- Until then the **IT Act 2000 s.43A and the SPDI Rules 2011** still apply to "sensitive personal data" (passwords are in scope). They are to be omitted when DPDP s.44(2) commences.
- **IT Act 2000 s.79 and the Intermediary Rules 2021** (grievance officer, user-content rules), **CERT-In Directions of 28 Apr 2022** (6-hour incident reporting, 180-day logs), **POCSO Act 2012** reporting duties, **CCPA Dark Patterns Guidelines 2023**, **ASCI** advertising code (children). Details and sources are in 01.

We plan to **comply with the DPDP regime now**, not in May 2027, because (a) the product is built for children, the highest-risk category, and (b) retro-fitting consent is hard.

## 3. Contents

| File | Purpose |
|---|---|
| 01-dpdp-compliance-matrix.md | Obligation to source to how we meet it to evidence to gap |
| 02-privacy-policy.md | Child-friendly summary and full notice (English) |
| 03-terms-of-use.md | Terms of use |
| 04-parental-consent-notice-and-record-spec.md | Verifiable parental consent design and server spec |
| 05-data-inventory-and-retention.md | Every field, purpose, basis, retention, deletion path |
| 06-children-safety-and-moderation-policy.md | Display names, leaderboard, takedown |
| 07-breach-response-runbook.md | DPDP and CERT-In timelines, templates |
| 08-grievance-redressal-sop.md | Grievance handling |
| 09-vendor-and-cross-border.md | Google Cloud / Firebase, region flag |
| 10-launch-checklist.md | Go/no-go list |

Source of truth for public text: 02 and 03. The `/privacy`, `/terms`, `/grievance` pages (`app/*/page.tsx`) carry a condensed copy; change both together and bump `CONSENT_VERSION` in `lib/consent.ts` on any material change.

## 4. Placeholders the owner must fill (search the repo for `[`)

`[COMPANY LEGAL NAME]`, `[REGISTERED ADDRESS]`, `[GRIEVANCE OFFICER NAME/EMAIL]`, `[DPO/contact]`, `[SUPPORT EMAIL]`, `[PHONE, optional]`, `[GOVERNING-LAW CITY]`.

## 5. Items that need counsel sign-off (not exhaustive)

1. Whether the Fourth Schedule exemptions can apply (they appear aimed at educational institutions, healthcare and similar; do not assume an edtech game qualifies).
2. Whether the parental-verification method in 04 satisfies Rule 10 (identifiable adult, age verification) or needs DigiLocker/virtual-token integration.
3. Whether NumberCraft is a "significant data fiduciary" candidate (unlikely at launch; children's data volume is a listed factor).
4. Whether the leaderboard, as designed, risks the "detrimental effect on well-being" prohibition in s.9(2).
5. Retention periods (limitation-law basis for keeping consent evidence).
6. POCSO and Intermediary Rules applicability to a no-chat game.
7. Quotes shown in the app (copyright and attribution check, see 01 row X-4).
8. Region and cross-border posture (09).

## 6. Foreign users (short note)

If users outside India are targeted: US COPPA (under 13, verifiable parental consent, FTC rule) and EU/UK GDPR Art. 8 (digital age of consent 13-16 by country; UK 13) may apply. This pack does not cover them; geo-restrict or take advice before marketing abroad.
