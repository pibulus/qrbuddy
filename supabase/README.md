# Supabase Setup for QRBuddy

## Quick Start

### 1. Database Setup (2 minutes)

Go to your Supabase SQL Editor and run `setup.sql`:

```sql
-- Copy/paste the contents of setup.sql
```

### 2. Deploy Edge Functions (5 minutes)

```bash
# Install Supabase CLI if needed
brew install supabase/tap/supabase

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Deploy functions
supabase functions deploy upload-file
supabase functions deploy get-file
```

### 3. Set Environment Variables

```bash
# In your edge functions settings, add:
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

### 4. Update QRBuddy Config

Create `.env` file in project root:

```bash
cp .env.example .env
# Edit .env with your actual keys
```

## How It Works

**upload-file**: Receives file → uploads to private storage → returns
destructible URL **get-file**: Serves file ONCE → deletes from storage →
redirects to KABOOM page for subsequent requests

## Testing Locally

```bash
# Start Supabase locally
supabase start

# Deploy functions locally
supabase functions serve

# Test upload
curl -X POST http://localhost:54321/functions/v1/upload-file \
  -F "file=@test.pdf"

# Test download (use the URL from upload response)
curl http://localhost:54321/functions/v1/get-file?id=UUID_HERE
```

## Cost

Free tier covers:

- 1GB storage = ~1000 files @ 1MB each
- 2GB bandwidth = ~2000 downloads
- Unlimited function invocations

"Can't scale" is the feature 💣
