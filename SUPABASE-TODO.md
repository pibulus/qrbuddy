# 🚀 Supabase Integration TODO

This document outlines the steps needed to migrate from local development API to Supabase production deployment.

## Current State (Local Development)

QRBuddy currently runs with a **local mock API server** (`local-api/server.ts`) that handles:
- Destructible file uploads/downloads
- Dynamic QR code creation/editing/redirects
- File storage in `local-api/files/`
- Database tracking in `local-api/db.json`

## Migration Path to Supabase

### Phase 1: Supabase Project Setup (5 min)

1. **Create Supabase Project**
   - Go to https://supabase.com
   - Create new project
   - Note down:
     - Project URL: `https://YOUR-PROJECT.supabase.co`
     - Anon Key: `eyJhbGc...` (for client-side)
     - Service Role Key: `eyJhbGc...` (for edge functions, KEEP SECRET)

2. **Configure MCP Supabase Server** (Optional - for Claude Code)
   ```bash
   # Add to ~/.claude/mcp_settings.json
   {
     "mcpServers": {
       "supabase": {
         "command": "npx",
         "args": ["-y", "@supabase/mcp-server"],
         "env": {
           "SUPABASE_PROJECT_REF": "YOUR-PROJECT-REF",
           "SUPABASE_ACCESS_TOKEN": "your-access-token"
         }
       }
     }
   }
   ```

### Phase 2: Database Setup (2 min)

Run the SQL in `supabase/setup.sql` via Supabase SQL Editor:

**Creates:**
- `destructible_files` table
- `dynamic_qr_codes` table
- `qr-files` storage bucket (private)
- Row Level Security policies

### Phase 3: Deploy Edge Functions (10 min)

```bash
# Install Supabase CLI if needed
brew install supabase/tap/supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all 6 edge functions
cd supabase/functions
supabase functions deploy upload-file
supabase functions deploy get-file
supabase functions deploy create-dynamic-qr
supabase functions deploy update-dynamic-qr
supabase functions deploy get-dynamic-qr
supabase functions deploy redirect-qr
```

**Set Edge Function Environment Variables** (via Supabase Dashboard → Edge Functions → Settings):
```
SUPABASE_URL=https://YOUR-PROJECT.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### Phase 4: Update Frontend (3 min)

**Option A: Environment Variable (Recommended)**

Create `.env.production`:
```bash
API_URL=https://YOUR-PROJECT.supabase.co/functions/v1
```

Update `fresh.config.ts` to load env vars for production.

**Option B: Hardcode URL**

Update `islands/SmartInput.tsx`:
```typescript
// Change from:
const apiUrl = Deno.env.get("API_URL") || "http://localhost:8005";

// To:
const apiUrl = Deno.env.get("API_URL") || "https://YOUR-PROJECT.supabase.co/functions/v1";
```

### Phase 5: Deploy Frontend (5 min)

**Deno Deploy** (Recommended for Fresh):
```bash
# First time setup
deployctl deploy --production --token=$DENO_DEPLOY_TOKEN

# Set environment variables in Deno Deploy dashboard
API_URL=https://YOUR-PROJECT.supabase.co/functions/v1

# Future deploys (auto from GitHub)
git push origin main
```

**Vercel** (Alternative):
```bash
vercel --prod

# Set environment variables
vercel env add API_URL production
# Enter: https://YOUR-PROJECT.supabase.co/functions/v1
```

### Phase 6: Update Routes for Production

The edge functions expect slightly different paths:

**Local API:**
- `http://localhost:8005/upload-file`
- `http://localhost:8005/get-file?id=xxx`
- `http://localhost:8005/create-dynamic-qr`
- etc.

**Supabase:**
- `https://YOUR-PROJECT.supabase.co/functions/v1/upload-file`
- `https://YOUR-PROJECT.supabase.co/functions/v1/get-file?id=xxx`
- `https://YOUR-PROJECT.supabase.co/functions/v1/create-dynamic-qr`
- etc.

Update `islands/SmartInput.tsx` to append `/functions/v1` when using Supabase URL.

### Phase 7: Update Edit Page Route

`routes/edit.tsx` needs to be updated to call:
- `GET /get-dynamic-qr?token=xxx` - Fetch QR details
- `POST /update-dynamic-qr` - Update destination

Currently this route may not be fully implemented. Check `islands/EditQRForm.tsx`.

### Phase 8: Update Redirect Route

`routes/r.tsx` should redirect to:
```
https://YOUR-PROJECT.supabase.co/functions/v1/redirect-qr?code=xxx
```

This handles scan counting and redirect logic.

## Testing Checklist

### Destructible Files
- [ ] Upload file via drag/drop
- [ ] Generate QR code
- [ ] Scan QR with phone → downloads file
- [ ] Scan QR again → see KABOOM page
- [ ] File deleted from storage
- [ ] Database shows `accessed: true`

### Dynamic QR Codes
- [ ] Check "Make this editable" box
- [ ] Set scan limit (e.g., 5)
- [ ] Set expiry date (optional)
- [ ] Create dynamic QR
- [ ] See edit link appear
- [ ] Copy edit link (saved to localStorage)
- [ ] Scan QR → redirects to destination
- [ ] Open edit link → see edit form
- [ ] Change destination URL
- [ ] Scan QR again → redirects to NEW destination
- [ ] Hit scan limit → see KABOOM page

## Cost Estimates (Supabase Free Tier)

**Free Tier Limits:**
- Storage: 1GB
- Bandwidth: 2GB/month
- Edge Function Invocations: 500K/month
- Database: 500MB

**Expected Usage (1000 users/month):**
- Destructible files self-destruct → minimal storage (~100MB average)
- Dynamic QRs are just DB rows → minimal space
- Edge function calls: ~3000/month (well under limit)

**Conclusion:** Should stay on free tier indefinitely due to "can't scale" nature 💣

## Rollback Plan

If Supabase deployment fails, revert to local API:

1. Change `API_URL` env var back to `http://localhost:8005`
2. Restart local API: `deno task api`
3. All features continue working locally

## Security Considerations

- **Never commit** `.env` files with real keys
- Use **Service Role Key** only in edge functions (server-side)
- Use **Anon Key** for client-side operations (none currently)
- Keep storage buckets **private** (files served via edge functions only)
- Enable **RLS policies** on all tables

## Reference Files

- `supabase/setup.sql` - Database schema + policies
- `supabase/functions/*/index.ts` - Edge function implementations
- `local-api/server.ts` - Local mock (reference for API contracts)
- `islands/SmartInput.tsx` - Frontend API calls

## Questions?

Check out:
- Supabase Docs: https://supabase.com/docs
- Fresh Deployment: https://fresh.deno.dev/docs/concepts/deployment
- Deno Deploy: https://deno.com/deploy/docs

---

*"Can't scale is the feature"* - This architecture is intentionally simple and self-limiting 💣
