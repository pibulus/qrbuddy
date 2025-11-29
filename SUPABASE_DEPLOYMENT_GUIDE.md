# Supabase Edge Functions Deployment Guide

A simple, reusable guide for connecting any project to Supabase Edge Functions.

## 🎯 Quick Overview

Supabase Edge Functions are serverless functions that run on Deno. This guide
covers:

- Setting up Supabase CLI
- Creating and deploying edge functions
- Client-side authentication
- CORS configuration

---

## 📦 Prerequisites

1. **Supabase Account**: Sign up at [supabase.com](https://supabase.com)
2. **Create a Project**: Click "New Project" in dashboard
3. **Get Your Keys**: Project Settings → API → Copy these:
   - `Project URL` (e.g., `https://xyzabc.supabase.co`)
   - `Project Reference ID` (e.g., `xyzabc`)
   - `anon/public` key (for client-side)
   - `service_role` key (for server-side, **keep secret!**)

---

## 🛠 Step 1: Install Supabase CLI

### macOS

```bash
brew install supabase/tap/supabase
```

### Windows (via Scoop)

```bash
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase
```

### Linux

```bash
brew install supabase/tap/supabase
# OR via npm
npm install -g supabase
```

### Verify Installation

```bash
supabase --version
```

---

## 🔗 Step 2: Link Your Project

```bash
cd your-project-directory

# Link to your Supabase project
supabase link --project-ref YOUR_PROJECT_REF

# You'll be prompted for your database password
# (found in Project Settings → Database → Database Password)
```

---

## 📝 Step 3: Create Edge Functions

### Create Function Directory Structure

```bash
mkdir -p supabase/functions
```

### Create a Sample Function

```bash
# Create your first function
supabase functions new hello-world
```

This creates: `supabase/functions/hello-world/index.ts`

### Example Function Code

```typescript
// supabase/functions/hello-world/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { name } = await req.json();

    return new Response(
      JSON.stringify({ message: `Hello, ${name}!` }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
```

---

## 🚀 Step 4: Deploy Functions

### Deploy Single Function

```bash
supabase functions deploy hello-world
```

### Deploy All Functions

```bash
# List all function directories
cd supabase/functions
for func in */; do
  supabase functions deploy ${func%/}
done
```

### Verify Deployment

```bash
supabase functions list
```

---

## 🔐 Step 5: Set Environment Variables

Edge functions often need access to environment secrets:

```bash
# Set a secret
supabase secrets set MY_SECRET_KEY=your-secret-value

# Set multiple secrets
supabase secrets set API_KEY=abc123 DATABASE_URL=postgres://...

# List secrets (values are hidden)
supabase secrets list

# Unset a secret
supabase secrets unset MY_SECRET_KEY
```

### Access Secrets in Functions

```typescript
// In your edge function
const apiKey = Deno.env.get("API_KEY");
const dbUrl = Deno.env.get("DATABASE_URL");
```

---

## 🌐 Step 6: Configure CORS (Production)

### Shared CORS Configuration

Create `supabase/functions/_shared/cors.ts`:

```typescript
/**
 * CORS Configuration
 * Change origins based on your deployment environment
 */

function getAllowedOrigin(): string {
  // Check if running in production (Deno Deploy sets this)
  const isProduction = Deno.env.get("DENO_DEPLOYMENT_ID");

  if (isProduction) {
    return "https://yourdomain.com"; // Your production domain
  }

  return "http://localhost:8000"; // Development
}

export const corsHeaders = {
  "Access-Control-Allow-Origin": getAllowedOrigin(),
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Credentials": "true",
};
```

### Use in Functions

```typescript
import { corsHeaders } from "../_shared/cors.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Your logic here...

  return new Response(
    JSON.stringify({ data: "..." }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
```

---

## 💻 Step 7: Client-Side Integration

### Setup Environment Variables

**`.env` (local development)**

```bash
SUPABASE_URL=https://xyzabc.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

**`.env.example` (commit to git)**

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Inject Keys into Client

**For Deno Fresh / Server-Rendered Apps:**

```typescript
// routes/index.tsx (or your main route)
export const handler: Handlers = {
  GET(req, ctx) {
    return ctx.render({
      supabaseUrl: Deno.env.get("SUPABASE_URL"),
      supabaseAnonKey: Deno.env.get("SUPABASE_ANON_KEY"),
    });
  },
};

export default function Home({ data }: PageProps) {
  return (
    <>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.__SUPABASE_URL__ = '${data?.supabaseUrl || ""}';
              window.__SUPABASE_ANON_KEY__ = '${data?.supabaseAnonKey || ""}';
            `,
          }}
        />
      </head>
      {/* Your app */}
    </>
  );
}
```

**For React/Next.js/Vite:**

```typescript
// Access via process.env or import.meta.env
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
```

### Create Auth Headers Helper

**`utils/api.ts`**

```typescript
// Type declarations
declare global {
  interface Window {
    __SUPABASE_URL__?: string;
    __SUPABASE_ANON_KEY__?: string;
  }
}

export function getSupabaseUrl(): string {
  if (typeof window !== "undefined" && window.__SUPABASE_URL__) {
    return window.__SUPABASE_URL__;
  }
  return "";
}

export function getSupabaseAnonKey(): string {
  if (typeof window !== "undefined" && window.__SUPABASE_ANON_KEY__) {
    return window.__SUPABASE_ANON_KEY__;
  }
  return "";
}

export function getApiUrl(): string {
  return `${getSupabaseUrl()}/functions/v1`;
}

export function getAuthHeaders(): Record<string, string> {
  const anonKey = getSupabaseAnonKey();
  if (anonKey) {
    return {
      "Authorization": `Bearer ${anonKey}`,
      "apikey": anonKey,
    };
  }
  return {};
}
```

### Create Request Helper (Recommended)

**`utils/api-request.ts`**

```typescript
import { getAuthHeaders } from "./api.ts";

export class ApiError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public response?: Response,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiRequest<T = unknown>(
  url: string,
  options: RequestInit = {},
  errorMessage = "Request failed",
): Promise<T> {
  const authHeaders = getAuthHeaders();
  const headers = new Headers(options.headers);

  // Merge auth headers
  Object.entries(authHeaders).forEach(([key, value]) => {
    headers.set(key, value);
  });

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let serverError = errorMessage;
      try {
        const errorData = await response.json();
        serverError = errorData.error || errorMessage;
      } catch {
        // Use default error
      }
      throw new ApiError(serverError, response.status, response);
    }

    return await response.json();
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      error instanceof Error ? error.message : String(error),
      0,
    );
  }
}
```

### Make API Calls

```typescript
import { getApiUrl } from "./utils/api.ts";
import { apiRequest } from "./utils/api-request.ts";

// Simple GET
const data = await apiRequest<{ message: string }>(
  `${getApiUrl()}/hello-world`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: "World" }),
  },
  "Failed to call hello-world",
);

console.log(data.message); // "Hello, World!"
```

---

## 🧪 Step 8: Test Your Functions

### Test Locally

```bash
# Start Supabase locally (optional)
supabase start

# Serve functions locally
supabase functions serve

# Test with curl
curl -X POST http://localhost:54321/functions/v1/hello-world \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"name":"Local Test"}'
```

### Test Production

```bash
curl -X POST https://xyzabc.supabase.co/functions/v1/hello-world \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -d '{"name":"Production Test"}'
```

---

## 📊 Step 9: View Logs

### Real-time Logs

```bash
supabase functions logs hello-world

# Follow logs (like tail -f)
supabase functions logs hello-world --follow
```

### In Dashboard

1. Go to Supabase Dashboard
2. Click **Edge Functions** in sidebar
3. Select your function
4. Click **Logs** tab

---

## 🔄 Common Patterns

### Pattern 1: Accessing Supabase Database

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const supabase = createClient(supabaseUrl, supabaseKey);

  const { data, error } = await supabase
    .from("your_table")
    .select("*");

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ data }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

### Pattern 2: File Upload to Storage

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const formData = await req.formData();
  const file = formData.get("file") as File;

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const fileName = `${crypto.randomUUID()}-${file.name}`;
  const { data, error } = await supabase.storage
    .from("your-bucket")
    .upload(fileName, file, {
      contentType: file.type,
      upsert: false,
    });

  if (error) throw error;

  return new Response(
    JSON.stringify({ fileName, path: data.path }),
    { headers: { "Content-Type": "application/json" } },
  );
});
```

### Pattern 3: Authenticated Requests

```typescript
serve(async (req) => {
  // Get auth token from header
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response("Unauthorized", { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
  );

  // Verify user
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return new Response("Invalid token", { status: 401 });
  }

  // User is authenticated!
  return new Response(
    JSON.stringify({ userId: user.id }),
    { headers: { "Content-Type": "application/json" } },
  );
});
```

---

## 🐛 Troubleshooting

### 401 Unauthorized

- ✅ Check that client sends `Authorization` and `apikey` headers
- ✅ Verify anon key is correct in `.env`
- ✅ Make sure headers are injected into window object

### CORS Errors

- ✅ Update `getAllowedOrigin()` in `cors.ts`
- ✅ Deploy functions after changing CORS config
- ✅ Check browser console for specific CORS error

### Function Not Found (404)

- ✅ Run `supabase functions list` to verify deployment
- ✅ Check URL: `https://PROJECT.supabase.co/functions/v1/FUNCTION_NAME`
- ✅ Redeploy: `supabase functions deploy FUNCTION_NAME`

### Function Timeout

- ✅ Edge functions have 150s timeout (default)
- ✅ For long operations, consider using Supabase Database Functions instead
- ✅ Check logs: `supabase functions logs FUNCTION_NAME`

---

## 📚 Useful Commands Cheat Sheet

```bash
# Link project
supabase link --project-ref PROJECT_REF

# Create new function
supabase functions new FUNCTION_NAME

# Deploy function
supabase functions deploy FUNCTION_NAME

# Deploy all functions
for func in supabase/functions/*/; do supabase functions deploy $(basename $func); done

# List functions
supabase functions list

# View logs
supabase functions logs FUNCTION_NAME --follow

# Set secret
supabase secrets set KEY=value

# List secrets
supabase secrets list

# Delete function
supabase functions delete FUNCTION_NAME

# Test locally
supabase functions serve
```

---

## 🎓 Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Standard Library](https://deno.land/std)
- [Supabase CLI Reference](https://supabase.com/docs/reference/cli/introduction)

---

## ✅ Quick Checklist

- [ ] Install Supabase CLI
- [ ] Link to Supabase project
- [ ] Create function in `supabase/functions/`
- [ ] Add CORS configuration in `_shared/cors.ts`
- [ ] Deploy function: `supabase functions deploy`
- [ ] Add environment variables to client
- [ ] Create auth headers helper
- [ ] Make API call with auth headers
- [ ] Test and check logs

---

**That's it!** You're now ready to use Supabase Edge Functions in any project.
Bookmark this guide for future reference.
