# 06 Children's safety and moderation policy

As of 21 Nov 2026. Legal anchors: DPDP Act s.9(2) (no processing with detrimental effect on a child's well-being), s.9(3); IT Act s.79 and Intermediary Rules 2021 r.3 (due diligence, 24 h acknowledgement, 15-day disposal); POCSO Act 2012 s.19-21 (VERIFY applicability). Name moderation code is owned by agent E; this document is the policy it implements.

## 1. Product facts
No chat, no free text between users, no images, no friend graph, no direct messages. The only user-generated content shown to others is the **display name** (1-28 chars) next to a score.

## 2. Display-name rules
1. Block: real-name patterns (a first + last name pair is discouraged in UI), contact details (emails, phone numbers, URLs, handles), profanity and slurs in English and common Hindi/Hinglish/transliterated forms, sexual, violent, drug and hate terms, impersonation of staff/brands/public figures, repeated characters used to evade filters, leetspeak variants.
2. Normalise before checking (case, accents, homoglyphs, spacing, digits-for-letters).
3. Prefer **assisted pseudonyms**: offer generated names ("Swift Fox 42") and make them the default for under-18s.
4. Re-check on every name change and on score write (server-side; client check is only UX).
5. A flagged name is replaced with a neutral generated name and the owner is told in plain words why.

## 3. Leaderboard visibility
- Minors appear only after verified parental consent (04) and a verified email.
- Visible fields: display name, score, accuracy, game, day. Hidden: email, uid (use an opaque id), exact age. Show a coarse tier label only if needed for fairness; avoid labels that reveal a young age.
- Parents can ask for hidden/removed status at any time (grievance route).
- No rank-shaming, no public streak-loss messages, no countdown pressure (CCPA dark-pattern guidelines).
- Leaderboards are not shown to guests.

## 4. Reporting and takedown
- Every leaderboard row has a "Report" control (to be built by C/E) and /grievance has a form/email.
- Reasons: inappropriate name, impersonation, personal information, suspected cheating, safety concern.

| Class | Target |
|---|---|
| Acknowledge any report | within 24 hours |
| Child-safety, sexual content, personal-data exposure of a child, non-consensual intimate imagery | hide immediately, review within 24 hours, remove/rename within 24 hours of confirmation |
| Other name or score violations | resolve within 72 hours (policy) and always within 15 days (law) |
| Appeals | decision within 7 days |

Actions: hide score, force rename, delete score, suspend account (reversible), terminate. Record each action (who, when, reason) in a moderation log kept 1 year without storing the offending text longer than needed.

## 5. Safety escalation
- Signs a child is at risk (a name that discloses abuse, grooming contact data, self-harm): do not investigate; record minimal facts; escalate to the Grievance Officer the same day. Counsel to confirm whether POCSO s.19 reporting applies; report to local police or the national cyber-crime portal (cybercrime.gov.in, helpline 1930) and Childline 1098 as advised. Do not forward or copy any exploitative material (POCSO s.15 risk): report the location/identifier only.
- Never contact a child directly about a safety concern; contact the parent through the consent email route only if lawful and safe.

## 6. Moderator conduct
Two named moderators, trained; least-privilege admin access; no personal devices; no screenshots of children's data; conflicts of interest declared.

## 7. Review
Quarterly: false positives/negatives, report volumes, SLA performance; update word lists.
