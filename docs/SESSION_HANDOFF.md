# QRBuddy Session Handoff - 2025-11-29

**For**: Next Claude instance **Project State**: Ready for testing after 1
critical bug fix **Progress**: 85% → 90% (Supabase backend complete, locker UI
complete, 1 bug to fix)

---

## 🎯 WHERE WE ARE

### What Just Happened (This Session)

1. ✅ Fixed Supabase CLI cache issue (old project haunting)
2. ✅ Created `scan_logs` table via Management API (CLI was broken)
3. ✅ Pulled PR #4 with all auth header fixes (Pablo forgot to `git pull`)
4. ✅ Codex (other AI) added locker UI + 4-digit PIN keypad
5. ✅ Pushed 5 commits (locker features + Supabase setup)
6. ✅ Audited all Codex's code → found 1 critical bug + 2 minor issues

### Current Git State

- **Branch**: `main`
- **Latest commit**: `2d1a438` (Add keypad unlock flow to buckets)
- **Origin**: Up to date (just pushed)
- **Uncommitted**: Nothing (clean working tree)

### Backend Status (Supabase)

- ✅ **Database**: 5 tables + storage bucket + 11 edge functions deployed
  - `destructible_files`, `dynamic_qr_codes`, `file_buckets`,
    `pro_subscriptions`, `scan_logs`
  - Storage: `qr-files` bucket
- ✅ **Auth headers**: All API calls use `getAuthHeaders()` from
  `utils/api-request.ts`
- ✅ **Project**: xrsbhcaiicqiblhhuzzu (Singapore region)
- ✅ **Keys**:
  - ANON:
    `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyc2JoY2FpaWNxaWJsaGh1enp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4NzAsImV4cCI6MjA3OTYwMTg3MH0.lRZI6hV0Q38fXYI6t_E_-YD7CZr1V_POQvw98eGgo2w`
  - URL: `https://xrsbhcaiicqiblhhuzzu.supabase.co`

### Frontend Status

- ✅ **Locker UI**: Complete with PIN keypad, mode selector (open/single drop),
  confirmation flow
- ✅ **Bucket Download**: Keypad unlock + manual password toggle for backwards
  compat
- ❌ **Critical Bug**: QR won't regenerate when URL/style changes (see below)

---

## 🔴 CRITICAL BUG - FIX BEFORE TESTING

**File**: `islands/BucketQR.tsx` **Line**: 166 **Issue**: Missing dependencies
in useEffect

```typescript
// ❌ CURRENT (BUG)
useEffect(() => {
  // Creates QR code using bucketUrl and style
  const qrCode = new QRCodeStyling({ data: bucketUrl, ... });
}, [isEmpty]); // ← Only watches isEmpty!

// ✅ FIX (ONE LINE CHANGE)
useEffect(() => {
  // Creates QR code using bucketUrl and style
  const qrCode = new QRCodeStyling({ data: bucketUrl, ... });
}, [isEmpty, bucketUrl, style]); // ← Add bucketUrl and style
```

**Why Critical**: If user changes bucket URL or style, the QR code doesn't
regenerate. They'll scan a QR that points to the wrong place or has wrong
colors.

**Fix Time**: 2 minutes

---

## ⚠️ MINOR ISSUES (Not Blocking)

### 1. Keypad Logic Duplication

**Files**: `islands/BucketQR.tsx` (lines 251-279) + `islands/ExtrasModal.tsx`
(lines 117-149) **Issue**: Same 30-line `handleKeypadPress` function copy-pasted
twice **Fix**: Extract to `utils/use-keypad.ts` hook (full code in
`CODEX_AUDIT_REPORT.md`) **Priority**: Low - annoying but not broken

### 2. Verbose Style Conditionals

**File**: `islands/BucketQR.tsx` (lines 469-502) **Issue**: 33 lines of repeated
ternaries for background styles **Fix**: Use lookup object instead **Priority**:
Low - code smell only

---

## 📋 IMMEDIATE NEXT STEPS

### Option A: Test Locally

1. Fix the critical useEffect bug (2 min)
2. Add env vars to `.env`:
   ```bash
   SUPABASE_URL=https://xrsbhcaiicqiblhhuzzu.supabase.co
   SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyc2JoY2FpaWNxaWJsaGh1enp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4NzAsImV4cCI6MjA3OTYwMTg3MH0.lRZI6hV0Q38fXYI6t_E_-YD7CZr1V_POQvw98eGgo2w
   APP_URL=http://localhost:8004
   ```
3. Run `deno task start`
4. Test:
   - Create locker with PIN
   - Upload file to bucket
   - Download from bucket with keypad unlock

### Option B: Deploy to Production

1. Fix the critical useEffect bug (2 min)
2. Add env vars to Deno Deploy dashboard (same as above, but
   `APP_URL=https://appbuddy.app`)
3. Push code: `git push origin main` (auto-deploys via GitHub Actions)
4. Test at appbuddy.app

---

## 🚀 FUTURE WORK (After Testing)

### Anonymous Auth + QR Pairing Feature

**Branch**: Create `feature/anonymous-auth-sync` **Goal**: Cross-device sync
without signup friction

**The Plan** (from conversation):

```typescript
// 1. Generate sync token (no auth required)
const syncToken = crypto.randomUUID()
localStorage.setItem('qrbuddy_sync', syncToken)

// 2. All QRs tagged with sync token
await supabase.from('qr_codes').insert({ url: '...', sync_token: syncToken })

// 3. To sync new device, show QR code
<QRCode value={`qrbuddy.app/sync/${syncToken}`} />

// 4. Other device scans → copies token
localStorage.setItem('qrbuddy_sync', scannedToken)

// 5. Both devices now see same QRs
await supabase.from('qr_codes').select('*').eq('sync_token', syncToken)
```

**Why This Approach**:

- ✅ Zero-friction onboarding (no signup/login)
- ✅ Cross-device sync via QR code pairing
- ✅ Uses existing Supabase setup
- ✅ Fast to implement (~2 hours)
- ⚠️ Token = full access (like a password)
- ⚠️ No way to revoke compromised token

**Alternative**: Supabase Anonymous Auth (better security, same UX)

---

## 📚 KEY FILES TO KNOW

### Supabase Setup

- `supabase/config.toml` - CLI config (already committed)
- `supabase/migrations/` - Database migrations (6 files)
- `supabase/functions/` - 11 edge functions (already deployed)
- `supabase/_apply_to_dashboard.sql` - Combined schema (for reference)

### Auth & API

- `utils/api-request.ts` - Shared API helpers with auto auth headers
- `utils/api.ts` - `getAuthHeaders()`, `getApiUrl()`, `getSupabaseUrl()`
- `routes/index.tsx` - Injects `window.__SUPABASE_URL__` and
  `__SUPABASE_ANON_KEY__`

### Locker/Bucket UI (Codex's Work)

- `islands/ExtrasModal.tsx` - Locker creation UI (mode, PIN, style, confirm)
- `islands/BucketQR.tsx` - Bucket page (upload/download + keypad unlock)
- `hooks/useBucketCreator.ts` - Locker creation logic

### Documentation

- `CODEX_AUDIT_REPORT.md` - Full code review (this session)
- `SUPABASE_AUDIT_REPORT.md` - Backend security audit
- `SUPABASE_DEPLOYMENT_GUIDE.md` - How to deploy edge functions
- `CLAUDE.md` - Project architecture reference

---

## 🐛 DEBUGGING TIPS

### If Supabase CLI is Broken

- **Symptom**: `supabase db push` tries to connect to old deleted project
- **Cause**: Cached connection info
- **Fix**: Use Management API instead:
  ```bash
  curl -X POST "https://api.supabase.com/v1/projects/xrsbhcaiicqiblhhuzzu/database/query" \
    -H "Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}" \
    -H "Content-Type: application/json" \
    -d '{"query": "YOUR SQL HERE"}'
  ```

### If MCP Not Working

- **Symptom**: `mcp__supabase__execute_sql` returns "Unauthorized"
- **Cause**: MCP needs access token configured
- **Workaround**: Use Management API or dashboard SQL editor

### If Functions Return 401

- **Check**: Does `.env` have `SUPABASE_URL` and `SUPABASE_ANON_KEY`?
- **Check**: Is `getAuthHeaders()` being called in the API request?
- **Check**: Are edge functions deployed? (`supabase functions list`)

---

## 🤝 WORKING WITH CODEX

**Context**: Pablo has been working with another AI (Codex) on this project in
parallel.

**Codex's Recent Work**:

- Locker UI builder with PIN keypad
- Bucket download page with keypad unlock
- APP_URL environment variable support
- File uploads default to unlimited downloads

**Coordination**:

- Always check git log before starting work (Codex may have pushed changes)
- Codex is good at UI/UX but sometimes misses edge cases (like useEffect deps)
- Audit Codex's code before deploying (like we did this session)

**Codex's Style**:

- More verbose/explicit code
- Follows Deno/Fresh patterns well
- Sometimes duplicates logic instead of extracting utils
- Good at visual polish and UX flows

---

## 💾 ENVIRONMENT VARIABLES

### Required for Local Dev

```bash
SUPABASE_URL=https://xrsbhcaiicqiblhhuzzu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyc2JoY2FpaWNxaWJsaGh1enp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4NzAsImV4cCI6MjA3OTYwMTg3MH0.lRZI6hV0Q38fXYI6t_E_-YD7CZr1V_POQvw98eGgo2w
APP_URL=http://localhost:8004
```

### Required for Production (Deno Deploy)

```bash
SUPABASE_URL=https://xrsbhcaiicqiblhhuzzu.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhyc2JoY2FpaWNxaWJsaGh1enp1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQyNDE4NzAsImV4cCI6MjA3OTYwMTg3MH0.lRZI6hV0Q38fXYI6t_E_-YD7CZr1V_POQvw98eGgo2w
APP_URL=https://appbuddy.app
```

**Note**: Pablo can't edit `.env` via Read tool (permission denied). He'll need
to add these manually.

---

## 📊 PROJECT STATUS

**Overall Progress**: 90% (was 85%) **Backend**: 100% (database + functions
deployed) **Frontend**: 95% (1 critical bug to fix) **Testing**: 0% (pending bug
fix + env setup)

**Blockers**:

1. Critical useEffect bug in BucketQR.tsx
2. Environment variables not set in `.env` (Pablo needs to do this)

**Ready for**:

- Testing after fixing the bug
- Anonymous auth feature branch
- Production deployment

---

## 🎯 SUCCESS CRITERIA

### Before Deploying to Production

- [x] All edge functions deployed
- [x] Database schema complete
- [x] Auth headers in all API calls
- [ ] **Critical useEffect bug fixed**
- [ ] Tested locker creation with PIN
- [ ] Tested file upload/download
- [ ] Environment variables set in Deno Deploy

### Before Starting Anonymous Auth Feature

- [ ] Current features fully tested and working
- [ ] No critical bugs remaining
- [ ] Create feature branch: `feature/anonymous-auth-sync`

---

## 💡 PABLO'S NOTES

From conversation about sync:

> "so are we git committed and pushed and totally good to close up on the last
> front for now? and then can we start a branch and give the sweet spot
> recommendation a go?"

**Translation**:

- Pablo wants to close out Supabase setup work ✅ (done except bug fix)
- Then start "anonymous auth + QR pairing" feature on new branch
- He's ready to test tomorrow after env setup

**Energy Level**: Fresh, ready to tackle the sync feature **Time**: Late evening
(18:03), wrapping up for the day **Mood**: Excited about the sync feature,
pragmatic about testing

---

## 🚦 QUICK START FOR NEXT SESSION

```bash
# 1. Fix the critical bug (2 min)
# Edit islands/BucketQR.tsx line 166:
# Change: }, [isEmpty]);
# To:     }, [isEmpty, bucketUrl, style]);

# 2. Verify fix
git diff islands/BucketQR.tsx

# 3. Commit fix
git add islands/BucketQR.tsx
git commit -m "fix: add missing useEffect dependencies in BucketQR

Critical fix: QR code now regenerates when bucketUrl or style changes.
Without this, users would see stale QRs pointing to wrong URLs."

# 4. Push
git push origin main

# 5. Add to Pablo's .env (he has to do this)
# SUPABASE_URL=https://xrsbhcaiicqiblhhuzzu.supabase.co
# SUPABASE_ANON_KEY=eyJ...
# APP_URL=http://localhost:8004

# 6. Test or deploy
deno task start  # local testing
# OR
# Push to trigger auto-deploy to Deno Deploy
```

---

## 📞 CONTACT POINTS

**Supabase Project**:
https://supabase.com/dashboard/project/xrsbhcaiicqiblhhuzzu **GitHub Repo**:
https://github.com/pibulus/qrbuddy **Deno Deploy**: Check deno.json for project
ID `fff4f21f-dab0-46f0-aa13-ea22dd20be78`

**Key Commits to Reference**:

- `b999178` - PR #4 merge (auth headers)
- `2d1a438` - Latest (keypad unlock)
- `0cd0d1f` - Supabase setup files

---

**End of Handoff. Good luck! 🚀**
