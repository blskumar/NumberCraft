# NumberCraft Privacy Notice

Version `2026-11-v1` (matches `CONSENT_VERSION` in `lib/consent.ts`). Draft of 21 Nov 2026: counsel review required before publication. Fill every `[PLACEHOLDER]`.

## 1. The short version (for kids, and for parents reading with them)

- NumberCraft is a maths game. You can play as a **guest** without telling us anything. Guest progress stays on your own device.
- If you make a **free account**, we keep: your email, a name you choose, your age group, your daily goal and your best scores.
- **Use a made-up name. Never use your real name, school, or town.**
- If you are **under 18**, a parent or guardian must say yes before your scores are saved online or shown on the leaderboard. We ask for their email only to send that one request, then we delete it.
- Other signed-in players can see your **display name, age group and scores** on the leaderboard (after your parent says yes). Nobody can see your email.
- We do **not** show ads. We do **not** use analytics or track what you do across other websites. We do **not** sell your data.
- You (or your parent) can **delete your account** at any time. That deletes your sign-in, profile and scores.
- Questions or worries? Use the contact details in section 10.

## 2. Who we are

[COMPANY LEGAL NAME], [REGISTERED ADDRESS] ("NumberCraft", "we"). We decide why and how your personal data is used, so we are the **Data Fiduciary** under the Digital Personal Data Protection Act, 2023 (DPDP Act).

Contact for privacy questions: [DPO/contact]. Grievance Officer: [GRIEVANCE OFFICER NAME/EMAIL]. General support: [SUPPORT EMAIL].

## 3. What we collect and why

| Data | Why (purpose) | Where it lives |
|---|---|---|
| Nothing, for guests. Game progress, settings and badges | Let you play and keep progress | Only in your browser (localStorage) on your device |
| Email address | Create and secure your account, verify it is yours, password reset | Google Firebase Authentication and our database |
| Password | Sign in. We never see it in readable form; Firebase stores a protected hash | Firebase Authentication |
| Display name (you choose) | Show on your profile and the leaderboard | Database; leaderboard entries |
| Age group (Explorers, Challengers, Strategists) | Pick suitable puzzle difficulty and the right leaderboard | Database; leaderboard entries |
| Whether you are under 18, and the consent record | Follow the law on children's data; prove who agreed and when | Consent records (see section 6) |
| Daily goal | Your own goal-ring | Database |
| Scores: game, score, accuracy, date | Best-of-day scores and leaderboards | Database (visible to signed-in players) |
| Technical logs (IP address, browser type, time) | Keep the service secure, fix faults, meet legal log-keeping duties | Hosting and cloud logs, not used to profile you |

We collect only what these purposes need. We do not ask for your birthday, school, phone number, photo or location.

## 4. What we do NOT do

No advertising or targeted ads. No tracking or behavioural monitoring of children. No analytics or marketing cookies. No selling or renting data. No chat, no photos or file uploads. No decisions about you made by automated profiling.

Cookies and storage: we use only what the app needs to work: your browser's localStorage (progress, theme, a small consent hint) and Firebase sign-in storage. Session-only sign-in is the default; "keep me signed in" is optional.

## 5. Who can see your data

- **Everyone signed in:** display name, age group, and scores on the leaderboard (only after consent is complete for under-18s).
- **Only you:** your email and daily goal.
- **Our service providers (Data Processors):** Google LLC (Firebase Authentication, Firestore, Cloud hosting/logging) process data for us under Google's data-processing terms. See section 8.
- **Authorities:** only where the law requires, for example a lawful order or a duty to report an offence against a child.

## 6. Children (under 18)

Under the DPDP Act a child is anyone under 18. For a child we:

1. ask the age band first (under 18 or 18 and over), not the birthday;
2. send the parent or guardian a one-time link at the email the child provides; the parent confirms they are the child's parent or lawful guardian and agrees to the purposes listed above;
3. keep the account in **pending** state until then: no leaderboard visibility and no online score saving;
4. delete the parent's email once the link is used or after 7 days, whichever comes first;
5. keep a consent record (version, time, purposes, method). Parents can **withdraw consent** at any time (section 7);
6. do not track, monitor behaviour or show targeted ads to children, and do not process data in ways likely to harm a child's well-being.

If you are 18 or over you give consent yourself when you tick the box on sign-up.

## 7. Your rights (and your parent's)

You (or a parent for a child) can:
- **Access**: ask for a summary of the personal data we hold and who it was shared with.
- **Correct or update** your name, age group, goal (in the profile) or ask us to fix anything else.
- **Erase**: use "Delete my account" in your profile, or ask us. We then delete your Auth account, profile and scores. Backups and logs age out as described in section 8.
- **Withdraw consent** at any time. It is as easy as giving it: delete the account in your profile, or write to the contact in section 10 (a parent may write for a child). Withdrawal stops future use; we then erase the data unless a law requires us to keep something.
- **Complain**: use our grievance contact (we aim to acknowledge within 24 hours and resolve within 15 days; the law allows up to 90 days). If unsatisfied, you may complain to the **Data Protection Board of India** once it is operational and you have first used our grievance process.
- **Nominate** a person to exercise your rights if you die or cannot act.

## 8. How long we keep data

| Data | Kept for |
|---|---|
| Guest data on your device | Until you clear your browser or use "reset" |
| Account, profile, scores | Until you delete the account, or after 24 months of inactivity (we email first) |
| Daily score entries | 90 days, then removed (longer-term personal best stays in your own profile) |
| Parent's email for a consent request | Until link used or 7 days |
| Consent record | While the account exists, plus up to 3 years after withdrawal or deletion as proof, stored without your name or email |
| Security and access logs | Up to 1 year (security duty); kept in India where possible |

## 9. Where data is stored (cross-border)

We use Google Firebase / Google Cloud. We aim to keep the database and server code in Mumbai (asia-south1). Firebase Authentication and some Google operations may run outside India. Transfers are permitted under DPDP s.16 unless the Government restricts a country; we will follow any restriction. [OWNER: confirm actual region, see docs/legal/09.]

## 10. Contact, grievance and language

- Grievance Officer: [GRIEVANCE OFFICER NAME/EMAIL]
- Privacy contact: [DPO/contact]
- Post: [COMPANY LEGAL NAME], [REGISTERED ADDRESS]
- Page: /grievance

This notice is in English. You may ask for it in Hindi or any other language in the Eighth Schedule to the Constitution; write to us and we will provide it. **Owner action:** commission a Hindi version before launch (translations should be checked by a native speaker; a child-reading-level version is recommended).

## 11. Security

We use encrypted connections, access rules that let each person reach only their own private data, limited staff access and monitoring. No system is perfectly safe. If a breach affects you, we will tell you and the Data Protection Board as the law requires.

## 12. Changes

If we change anything important, we will tell you in the app and, for children, ask the parent to confirm again before the change applies. The version is shown at the top.

---
Legal references (as of 21 Nov 2026): Digital Personal Data Protection Act 2023 ss.2(f), 5, 6, 8, 9, 11-14, 16; DPDP Rules 2025 rr.3, 6-10, 14; IT Act 2000 s.43A and SPDI Rules 2011 (until repealed); IT (Intermediary Guidelines) Rules 2021. See docs/legal/01 for sources.
