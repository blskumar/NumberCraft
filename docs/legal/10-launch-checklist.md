# 10 Launch checklist (go / no-go)

As of 21 Nov 2026. A box is checked only with evidence. **No child's data may be collected from real users until all BLOCKER items are done and counsel has signed off.**

## BLOCKERS
- [ ] Counsel review and written sign-off of docs/legal/00-09 and the three public pages.
- [ ] Placeholders filled everywhere (`grep -rn "\[COMPANY LEGAL NAME\]\|\[GRIEVANCE\|\[DPO\|\[REGISTERED\|\[SUPPORT" docs app`).
- [ ] Parental consent backend built per 04 (token email, confirm page, consents/{uid}, expiry job), rules enforce consent for minors' score writes.
- [ ] Counsel decision on Rule 10 verification method (04 section 8).
- [ ] Firestore location confirmed or migrated to asia-south1 (09).
- [ ] Name moderation live (E) and tested with Hindi/Hinglish samples (06).
- [ ] Public score docs no longer expose uid/young-tier labels (05).
- [ ] Grievance mailbox live, officer named, 24h SLA staffed (08).
- [ ] Delete-account also removes consent/request docs; inactivity purge job (05).
- [ ] Google Cloud DPA accepted and recorded (09); email vendor DPA signed.
- [ ] Cloud Logging retention >= 180 days (1 year proposed) in India; no PII in logs.

## High
- [ ] Firebase App Check, API key referrer restriction, Auth email-enumeration protection (security_spec.md).
- [ ] CSP in place (agent G); privacy/terms/grievance pages render with it (no inline scripts: these pages use none).
- [ ] Hindi version of the notice commissioned (02 section 10).
- [ ] Breach drill done; CERT-In point of contact registered (07).
- [ ] Quote and asset copyright audit (01 X-4); trademark search.
- [ ] Marketing copy reviewed against ASCI and CCPA misleading-ad/dark-pattern guidance (01 D-1, D-2).
- [ ] Decide on the Fourth Schedule exemptions (assume none).

## Monitor after launch
- [ ] DPDP Rules phase dates (consent managers ~Nov 2026; main duties ~13/14 May 2027) and any amendments.
- [ ] Significant Data Fiduciary notification.
- [ ] Bump `CONSENT_VERSION` on material changes and re-consent.
- [ ] Quarterly moderation review; annual policy review.
