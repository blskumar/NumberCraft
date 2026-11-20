# Numbercraft Firestore Security Specification (Phase 0)

## 1. Data Invariants
1. **Strict PII Isolation (`/users/{userId}`)**: Private user documents containing `email` may ONLY be read (`get`), created, updated, or deleted by the authenticated owner (`request.auth.uid == userId`). Blanket `list` queries on `/users` are strictly denied.
2. **Identity Integrity**: Both `/users/{userId}` and `/gameScores/{scoreId}` require `incoming().uid == request.auth.uid` on create and prohibit changing `uid` or `createdAt` on update.
3. **Immutable Score Integrity (`/gameScores/{scoreId}`)**: Submitted game scores are append-only (`allow update: if false;`) to prevent post-hoc score tampering. Players may only submit scores under their own `uid` with bounded numeric values (`0 <= score <= 100000`, `0 <= accuracyPercent <= 100`), canonical `gameId`, and strict `YYYY-MM-DD` / `YYYY-Www` calendar keys.
4. **Zero-PII Public Leaderboards**: `/gameScores/{scoreId}` documents never store `email`, phone numbers, or sensitive fields. `allow get` and `allow list` require explicit `resource.data.visibility == 'public'` checks enforced rule-side.
5. **Temporal & Volumetric Hardening**: All `createdAt` and `updatedAt` timestamps must match `request.time`; all string fields enforce explicit `.size()` bounds; all document IDs enforce `isValidId()` (`^[a-zA-Z0-9_\-]+$`, `<= 128` chars).

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Score Injection**: Unauthenticated client attempts `create` on `/gameScores/score-1`. -> `PERMISSION_DENIED`.
2. **Identity Spoofing on Score Create**: Authenticated user `u1` creates `/gameScores/score-2` with `uid: "u2"`. -> `PERMISSION_DENIED`.
3. **Ghost / Shadow Field Injection**: Authenticated user `u1` creates `/gameScores/score-3` with extra field `isAdmin: true`. -> `PERMISSION_DENIED`.
4. **Score Tampering via Update**: Authenticated user `u1` attempts `update` on their own `/gameScores/score-1` to raise `score: 99999`. -> `PERMISSION_DENIED`.
5. **Cross-User Score Deletion**: Authenticated user `u2` attempts `delete` on `u1`'s `/gameScores/score-1`. -> `PERMISSION_DENIED`.
6. **Out-of-Bounds / Negative Score Poisoning**: Authenticated user `u1` submits `score: 999999999` or `score: -50`. -> `PERMISSION_DENIED`.
7. **Invalid `gameId` Injection**: Authenticated user `u1` submits `gameId: "hacked-mode"`. -> `PERMISSION_DENIED`.
8. **Malformed Calendar Key / ID Poisoning**: Authenticated user `u1` creates `/gameScores/invalid..id/path` or `dateKey: "yesterday"`. -> `PERMISSION_DENIED`.
9. **Client-Forged Timestamp**: Authenticated user `u1` submits a past `createdAt` instead of `request.time`. -> `PERMISSION_DENIED`.
10. **PII Cross-User Read (`get`)**: Authenticated user `u2` attempts `get` on `/users/u1` to scrape `email`. -> `PERMISSION_DENIED`.
11. **PII Directory Scraping (`list`)**: Authenticated user `u1` attempts `list` on `/users`. -> `PERMISSION_DENIED`.
12. **Immutable Profile Field Mutation**: Authenticated user `u1` attempts `update` on `/users/u1` modifying `uid` or `createdAt`, or adding `role: "admin"`. -> `PERMISSION_DENIED`.
