# Supabase Remediation Plan

**Last updated:** 2025-12-01

This document converts the latest Supabase audit into a punch list prioritized
by impact and effort. Work top-to-bottom; each section lists concrete fixes,
context, and suggested owners.

## Priority 0 – Ship Before Anything Else

1. **Lock Down Bucket RLS (file_buckets table)**
   - _Files:_ `supabase/migrations/20251111000001_file_buckets.sql`,
     `supabase/functions/upload-to-bucket`, `supabase/functions/create-bucket`
   - _Issue:_ Current policy uses `USING (true)` which lets anyone mutate every
     bucket once they know a code. Tokens are also passed via query strings.
   - _Fix:_ Reinstate service-role-only policies or write RLS that enforces
     `owner_token` equality. Store hashed tokens, accept them in headers/body
     (not URL), and compare inside the edge function before calling `update`.
   - _Value:_ Prevents full data exfiltration from all lockers with a single
     bucket code.

2. **Mirror File Validation for Bucket Uploads**
   - _Files:_ `supabase/functions/upload-to-bucket/index.ts`,
     `utils/file-validation.ts`
   - _Issue:_ Bucket uploads skip size/type limits and stream entire files into
     memory.
   - _Fix:_ Reuse the same blocked-extension/MIME logic as destructible uploads,
     enforce 25MB (or lower) limits, and stream with
     `upload(fileName, file, { ... })` instead of array buffers.
   - _Value:_ Stops buckets from becoming the weak link for malware or runaway
     memory usage.

3. **Require POST + Body for Password-Protected Downloads**
   - _Files:_ `supabase/functions/download-from-bucket/index.ts`, client calls
     in `islands/BucketQR.tsx`
   - _Issue:_ Passwords are accepted via GET query params, leaking through
     logs/history.
   - _Fix:_ Remove the GET branch, require POST JSON
     (`{ bucket_code, password }`), and update BucketQR fetches accordingly.
   - _Value:_ Basic secrecy for bucket passwords; eliminates accidental
     disclosure.

4. **Redact Sensitive Bucket Metadata**
   - _Files:_ `supabase/functions/get-bucket-status/index.ts`,
     `routes/bucket/[code].tsx`
   - _Issue:_ Anyone who guesses a bucket code learns filenames, styles,
     timestamps.
   - _Fix:_ Require an owner token (or reader PIN) before returning metadata
     beyond `is_empty`/`style`. At minimum omit filenames for password-protected
     buckets.
   - _Value:_ Prevents casual reconnaissance and keeps “hidden” lockers hidden.

## Priority 1 – High Impact, Short Work

5. **Stream File Downloads through Fresh**
   - _Files:_ `routes/api/download-file.ts`
   - _Issue:_ Uses `await response.blob()`, doubling memory for large files.
   - _Fix:_ Return `new Response(response.body, { headers })` and pass through
     `Content-*` headers directly.
   - _Value:_ Removes size ceiling and improves download reliability.

6. **Clean Up Destructible Files + Buckets Automatically**
   - _Files:_ new cron/SQL script, maybe `supabase/functions/_shared`
   - _Issue:_ Rows marked `accessed=true` and orphaned storage objects never
     purge.
   - _Fix:_ Schedule a Supabase Task or Deno Deploy cron that deletes expired
     rows and removes matching objects from `qr-files` nightly.
   - _Value:_ Controls storage costs and limits damage if a record slips past
     RLS.

7. **Hide Owner Tokens After First View**
   - _Files:_ `hooks/useQRData.ts`, `islands/EditQRForm.tsx`,
     `utils/token-vault.ts`
   - _Issue:_ Tokens persist in query strings and history forever.
   - _Fix:_ On first load, exchange the owner token for a short-lived session
     (supabase function) and rewrite the URL without `token=`. Keep encrypted
     storage as a fallback but make it clear that tokens never reappear in the
     UI.
   - _Value:_ Reduces chance of token leaks via screenshots or analytics.

8. **Improve Bucket Password Hashing**
   - _Files:_ `supabase/functions/create-bucket/index.ts`,
     `download-from-bucket/index.ts`
   - _Issue:_ Passwords are raw SHA-256 without salt.
   - _Fix:_ Use bcrypt/argon2 (Deno standard libs or npm) with per-password salt
     and store hash+salt columns. Update comparison logic accordingly.
   - _Value:_ Makes offline brute-force of stolen DB dumps far harder.

## Priority 2 – Medium Impact / Prep for Scale

9. **Persistent Rate Limiting Backend**
   - _Files:_ `supabase/functions/_shared/rate-limit.ts`
   - _Issue:_ Map resets on every cold start; attackers just spread requests.
   - _Fix:_ Migrate counters to Upstash Redis or Supabase KV and share helper
     utilities for read/write.
   - _Value:_ Gives predictable abuse protection once traffic spikes.

10. **Centralize APP_URL Resolution**

- _Files:_ all edge functions using `APP_URL` fallback (upload-file,
  create-bucket, create-dynamic-qr, etc.)
- _Issue:_ Domain logic is copy-pasted; easy to drift when domains change.
- _Fix:_ Create `_shared/app-url.ts` with `getAppUrl()` and import everywhere.
- _Value:_ Faster rollout for future domain/preview changes.

11. **Expand Edge Function Test Coverage**

- _Files:_ `tests/edge-functions_test.ts`
- _Issue:_ Only dynamic QR + upload validations are covered.
- _Fix:_ Add cases for bucket creation/upload/download, password flows, and
  `redirect-qr` routing validation.
- _Value:_ Protects against regressions while tightening security logic.

12. **Better Observability + Alerts**

- _Files:_ logging inside edge functions, maybe Supabase logs dashboard
- _Issue:_ Errors only go to `console.error`; no alerting or context.
- _Fix:_ Pipe logs into Supabase Log Drain or external service, add structured
  metadata, and set alerts for spikes in 4xx/5xx or rate-limit hits.
- _Value:_ Faster detection of abuse or outages.

## Priority 3 – UX / Polish

13. **Friendlier Error Surfacing**

- _Files:_ `hooks/useQRData.ts`, `routes/f/[code].tsx`,
  `routes/api/download-file.ts`
- _Issue:_ Users see raw technical errors (“Supabase not configured”).
- _Fix:_ Wrap in UX copy, display contextual toasts, and provide retry
  instructions.
- _Value:_ Keeps the “magic” experience even when Supabase hiccups.

14. **Educate Users on Token Security**

- _Files:_ README, in-app modals, `utils/token-vault.ts`
- _Issue:_ TokenVault encrypts locally but stores the key alongside the data.
- _Fix:_ Document that it’s obfuscation only and add a “revoke token” CTA so
  people can rotate quickly if a link leaks.
- _Value:_ Aligns user expectations with actual guarantees.

15. **UI Feedback After Destructible Download**

- _Files:_ `routes/f/[code].tsx`, `routes/api/download-file.ts`
- _Issue:_ Boom redirect relies on HTTP Refresh; user might never see it.
- _Fix:_ Send a small JSON payload alongside download completion and trigger a
  Toast/overlay that the file is gone.
- _Value:_ Clarifies what happened without relying on redirects.

---

### How to Work This List

- Treat Priority 0 items as blockers; nothing else ships until they’re resolved.
- After each fix, update this file with a short note and date so future
  instances know the state of play.
- If new risks appear, add them under the appropriate priority with owner + ETA.

Ping Pablo on whichever channel is active once a priority band is cleared so we
can re-run the audit.
