# 07 Breach and incident response runbook

As of 21 Nov 2026. Clocks start when we **notice or are made aware** of the incident.

| Regime | Duty | Deadline | Source |
|---|---|---|---|
| CERT-In (applies now) | Report specified cyber incidents (e.g. unauthorised access to systems/data, data breach/leak, attacks on servers/apps, identity theft/spoofing) to CERT-In: incident@cert-in.org.in; also phone/fax per CERT-In site | **6 hours** | CERT-In Directions 28 Apr 2022 under IT Act s.70B(6) (see 01 source S6) |
| CERT-In logs | Keep ICT logs 180 days within India; hand over on request | rolling | same |
| DPDP (after commencement, build now) | Inform each affected Data Principal without delay (what, when, consequences, mitigation, contact); inform the Board without delay, then detailed report | **Board detailed report within 72 hours** (extendable on Board permission) | DPDP Act s.8(6); Rule 7 (VERIFY exact text) |
| SPDI (until repealed) | Handle per reasonable security practice; no separate statutory timer | n/a | IT Act s.43A |
| Parents | Notify the parent/guardian for any affected child (use consent-email route if available, otherwise in-app and /grievance notice) | together with principal notice | policy |

Rule of thumb: if in doubt, report to CERT-In inside 6 hours and assess later.

## Roles
Incident Lead (owner), Technical Lead, Legal/Counsel, Comms/Support, Grievance Officer. Keep an out-of-band contact sheet (phones) off the production systems.

## Steps
1. **T+0 Detect and log** (time noticed, who, source). Open an incident record.
2. **T+1h Contain**: revoke compromised keys (Firebase API key restrictions, service accounts), disable affected functions, tighten rules, preserve logs and evidence (do not wipe).
3. **T+3h Assess**: what data (email, names, scores, consent records, parent emails), how many, which children, root cause, ongoing?
4. **T+6h CERT-In report** (template A). Send the initial report even if incomplete.
5. **Without delay Board intimation** (template B) once DPDP is in force; before that, keep the draft ready.
6. **Without delay notify affected users/parents** (template C). Plain language, no jargon, no blame, what to do (change password, ignore phishing).
7. **T+72h Detailed report to the Board** (template B2): nature, extent, timing, location, likely impact, mitigation, findings on the person responsible, remedial steps, notice sent to principals.
8. **Recover and post-mortem** within 14 days; record fixes; update this runbook; retain the record 1 year at least.

## Templates

**A. CERT-In initial report**: Reporter name/org/contact; time of incident and time of detection; type of incident; affected systems (Firebase project id, region), IP/URL; symptoms; data likely affected and counts; actions taken; point of contact; attach log extracts.

**B. Board intimation (initial)**: Description of breach; likely cause; time; categories and approximate number of principals (including children); immediate containment; contact details of the Grievance Officer/DPO.

**B2. Board detailed report (72 h)**: Nature, extent and timing; location; likely impact; steps taken to mitigate; findings regarding the cause and any person responsible; remedial measures to prevent recurrence; summary of notices to principals.

**C. User/parent notice**: "We found that [what] happened on [date]. It may have involved [your/your child's] [data types]. It did not involve [passwords/payment data] ([if true]). What we did: [...]. What you can do: [...]. Questions: [GRIEVANCE OFFICER NAME/EMAIL]. You may also complain to the Data Protection Board of India."

## Drills
Run a tabletop twice a year and before launch. Record time-to-report.
