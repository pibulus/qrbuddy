# Supabase Implementation Audit Report

**Date:** 2025-11-28 **Project:** QRBuddy **Scope:** Complete Supabase
integration, edge functions, authentication, and security

---

## Executive Summary

I conducted a comprehensive audit of the Supabase implementation in QRBuddy. The
good news: **the auth headers issue has been fixed** and the code is generally
well-structured. However, I found several security concerns and opportunities
for improvement.

### Overall Assessment

- ✅ **Authentication:** Now properly implemented with anon key
- ⚠️ **Security:** 2 critical issues, 3 moderate concerns
- ✅ **Code Quality:** Clean and consistent
- ⚠️ **Tech Debt:** Some duplication and missing validation

---

## 🔴 Critical Issues

### 1. **Overly Permissive CORS Policy**

**Location:** `supabase/functions/_shared/cors.ts:5`

```typescript
"Access-Control-Allow-Origin": "*"
```

**Risk:** HIGH - Any website can call your Supabase edge functions

**Impact:**

- Malicious websites can make authenticated requests to your edge functions
- Opens door to CSRF attacks
- Allows resource exhaustion from untrusted origins

**Recommendation:**

```typescript
// Restrict to your domains only
export const corsHeaders = {
  "Access-Control-Allow-Origin": process.env.DENO_DEPLOYMENT_ID
    ? "https://qrbuddy.app"
    : "http://localhost:8000",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
```

---

### 2. **Potential Open Redirect Vulnerability**

**Location:** `supabase/functions/redirect-qr/index.ts:215`

**Issue:** The function redirects to `destinationUrl` without re-validating URLs
from routing configs

```typescript
// Line 215 - No validation before redirect
return Response.redirect(destinationUrl, 302);
```

**Risk:** HIGH - Attackers could inject malicious URLs via routing_config

**Scenario:**

1. User creates dynamic QR with valid URL
2. Attacker updates routing_config with `javascript:` or `data:` URLs
3. Victims get redirected to malicious payload

**Current Protection:**

- URLs are validated when creating QRs (line 72-99 in
  `create-dynamic-qr/index.ts`)
- **But NOT when updating routing_config** or using sequential/device/time
  routing

**Recommendation:**

```typescript
// Add URL validation before redirecting
function isValidRedirectUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
}

// Before line 215
if (!isValidRedirectUrl(destinationUrl)) {
  console.error("[SECURITY] Invalid redirect URL blocked:", destinationUrl);
  return Response.redirect("/", 302);
}

return Response.redirect(destinationUrl, 302);
```

---

## ⚠️ Moderate Security Concerns

### 3. **Missing Authorization Header Validation**

**Location:** All edge functions

**Issue:** Edge functions accept the `Authorization` header but never validate
it

**Current State:**

- Functions use `SUPABASE_SERVICE_ROLE_KEY` (bypasses RLS)
- Authorization relies on owner_token in request body
- The `Authorization` header sent by clients is completely ignored

**Risk:** MODERATE - Confusing security model

**Why This Works:** You're using owner_token for auth instead of Supabase's
built-in auth system. This is actually okay for your use case, but:

**Potential Issues:**

1. Developers might assume the Authorization header is being validated
2. If someone doesn't send the header, functions still work (inconsistent)
3. Makes it harder to add proper auth later

**Recommendation:** Either:

- **Option A:** Add explicit Authorization validation for consistency
- **Option B:** Remove Authorization from CORS headers and document that you use
  owner_token auth
- **Option C:** Add a comment explaining the auth model in each function

---

### 4. **In-Memory Rate Limiting**

**Location:** `supabase/functions/_shared/rate-limit.ts`

**Issue:** Rate limits reset on cold starts

```typescript
// Line 15 - Resets when function restarts
const rateLimitStore = new Map<string, RateLimitRecord>();
```

**Risk:** MODERATE - Rate limiting can be bypassed

**Workaround:** Attackers can trigger cold starts or wait for natural restarts

**Recommendation:**

```typescript
// Use persistent storage for production
// Consider Upstash Redis or Supabase KV
// Document the current limitation in comments

// TEMPORARY: In-memory rate limiter
// ⚠️ WARNING: Resets on cold starts (every ~5-15 minutes)
// TODO: Replace with Redis/KV for production scale
const rateLimitStore = new Map<string, RateLimitRecord>();
```

---

### 5. **Error Messages Leak Implementation Details**

**Location:** Multiple edge functions

**Examples:**

```typescript
// create-dynamic-qr/index.ts:62
"destination_url is required";

// update-dynamic-qr/index.ts:50
"Invalid owner token";
```

**Risk:** LOW-MODERATE - Helps attackers understand your system

**Better Approach:**

```typescript
// Less specific error messages
"Invalid request parameters";
"Authentication failed";
```

**Recommendation:**

- Keep specific errors in server logs
- Return generic errors to clients
- Add error codes for debugging (e.g., `ERR_DEST_REQUIRED`)

---

## 📋 Code Quality Issues

### 6. **Duplicate Error Handling Pattern**

**Locations:** All hooks (useFileUpload, useDynamicQR, useBucketCreator,
useQRData)

**Pattern Repeated 7+ times:**

```typescript
try {
  const response = await fetch(url, {/* ... */});
  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || "Operation failed");
  }
  const data = await response.json();
  // ... success handling
} catch (error) {
  console.error("Operation error:", error);
  setIsLoading(false);
  haptics.error();
  // ... error toast
}
```

**Recommendation:** Create a shared helper:

```typescript
// utils/api-request.ts
export async function apiRequest<T>(
  url: string,
  options: RequestInit,
  errorMessage = "Request failed",
): Promise<T> {
  const authHeaders = getAuthHeaders();
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      ...authHeaders,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || errorMessage);
  }

  return response.json();
}

// Then in hooks:
const data = await apiRequest<UploadResponse>(
  `${apiUrl}/upload-file`,
  { method: "POST", body: formData },
  "Upload failed",
);
```

---

### 7. **Missing Error Validation on JSON Parsing**

**Location:** Multiple hooks

**Issue:** `response.json()` can throw if response isn't valid JSON

```typescript
// hooks/useFileUpload.ts:68
const errorData = await response.json(); // Can throw!
```

**Fix:**

```typescript
const errorData = await response.json().catch(() => ({ error: null }));
throw new Error(errorData.error || "Upload failed");
```

---

### 8. **Inconsistent Error Logging**

**Locations:** hooks vs routes

**Hooks:**

```typescript
console.error("Upload error:", error); // ✅ Good context
```

**Routes:**

```typescript
console.error("Redirect error:", error); // ❌ No context
```

**Recommendation:** Add structured logging:

```typescript
console.error("[HOOK:useFileUpload] Upload failed:", {
  error: error instanceof Error ? error.message : String(error),
  timestamp: new Date().toISOString(),
  // NO sensitive data!
});
```

---

## 🔍 Missing Validation

### 9. **No Client-Side File Type Validation**

**Location:** `hooks/useFileUpload.ts`

**Issue:** Server validates file types, but client doesn't show helpful errors
until after upload

**Recommendation:**

```typescript
// Add before upload starts
const blockedExtensions = ["exe", "bat", "cmd" /* ... */];
const fileName = file.name.toLowerCase();
const hasBlockedExt = blockedExtensions.some((ext) =>
  fileName.endsWith(`.${ext}`)
);

if (hasBlockedExt) {
  setUploadError("This file type is not allowed for security reasons");
  return;
}
```

---

### 10. **No Max Download Validation**

**Location:** `hooks/useFileUpload.ts:43`

**Issue:** No client-side check for reasonable max_downloads values

```typescript
formData.append("maxDownloads", maxDownloads.value.toString());
// What if maxDownloads is 999999999?
```

**Recommendation:**

```typescript
const MAX_DOWNLOADS_LIMIT = 10000;
const validMaxDownloads = Math.min(maxDownloads.value, MAX_DOWNLOADS_LIMIT);
formData.append("maxDownloads", validMaxDownloads.toString());
```

---

## 🎯 Edge Cases

### 11. **Race Condition in Dynamic QR Creation**

**Location:** `islands/SmartInput.tsx:140-157`

**Issue:** Creates QR with 800ms debounce, but no cancellation if user changes
input

```typescript
useEffect(() => {
  if (isDynamic.value && url.value && !isCreatingDynamic) {
    const timer = setTimeout(() => {
      if (isValidUrl(url.value)) {
        createDynamicQR(url.value); // Could create multiple QRs!
      }
    }, 800);
    return () => clearTimeout(timer);
  }
}, [isDynamic.value, url.value]);
```

**Scenario:**

1. User types "https://example.com"
2. Timer starts (800ms)
3. User changes to "https://google.com" before 800ms
4. First timer fires → creates QR for example.com
5. Second timer fires → creates QR for google.com

**Fix:** Add a ref to track current creation:

```typescript
const creationRef = useRef<string>("");

useEffect(() => {
  if (isDynamic.value && url.value && !isCreatingDynamic) {
    const currentUrl = url.value;
    const timer = setTimeout(() => {
      if (creationRef.current === currentUrl) {
        createDynamicQR(currentUrl);
      }
    }, 800);
    creationRef.current = currentUrl;
    return () => clearTimeout(timer);
  }
}, [isDynamic.value, url.value]);
```

---

### 12. **No Handling for Partial JSON Responses**

**Location:** All hooks

**Issue:** If response is truncated or malformed JSON, no graceful handling

**Example:**

```typescript
const data = await response.json(); // Throws on invalid JSON
url.value = data.url; // Crashes if data is undefined
```

**Fix:**

```typescript
try {
  const data = await response.json();
  if (!data?.url) {
    throw new Error("Invalid response format");
  }
  url.value = data.url;
} catch (parseError) {
  throw new Error("Failed to parse server response");
}
```

---

## ✨ Best Practices Violations

### 13. **Hardcoded Base URLs**

**Location:** Multiple edge functions

```typescript
// create-dynamic-qr/index.ts:140
const baseUrl = Deno.env.get("APP_URL") ||
  (Deno.env.get("DENO_DEPLOYMENT_ID")
    ? "https://qrbuddy.app"
    : "http://localhost:8000");
```

**Issue:** Repeated 3+ times, if qrbuddy.app changes, need to update multiple
files

**Recommendation:** Create shared constant:

```typescript
// supabase/functions/_shared/app-url.ts
export function getAppUrl(): string {
  return Deno.env.get("APP_URL") ||
    (Deno.env.get("DENO_DEPLOYMENT_ID")
      ? "https://qrbuddy.app"
      : "http://localhost:8000");
}
```

---

### 14. **Magic Numbers**

**Locations:** Multiple files

```typescript
// useFileUpload.ts:37
if (file.size > 25 * 1024 * 1024) {
  // upload-file/index.ts:55
  if (file.size > 25 * 1024 * 1024) {
    // useFileUpload.ts:47
    setUploadProgress((prev) => Math.min(prev + 10, 90));
  }
}
```

**Recommendation:**

```typescript
// constants/file-limits.ts
export const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
export const UPLOAD_PROGRESS_INTERVAL = 200; // ms
export const UPLOAD_PROGRESS_INCREMENT = 10; // %
```

---

## 🔐 Security Best Practices Summary

### ✅ What's Good:

1. **Token Encryption:** Owner tokens use AES-GCM encryption in localStorage
2. **File Type Validation:** Comprehensive blocklist for dangerous file types
3. **URL Protocol Validation:** Blocks javascript: and data: URLs on creation
4. **Rate Limiting:** Basic protection against abuse
5. **HTTPS Enforcement:** Edge functions validate URL protocols
6. **XSS Prevention:** No innerHTML or dangerouslySetInnerHTML usage
7. **SQL Injection:** Using Supabase client (parameterized queries)

### ⚠️ Needs Attention:

1. **CORS Policy:** Too permissive (allows any origin)
2. **Open Redirect:** Missing URL validation on redirect
3. **Error Messages:** Leak implementation details
4. **Rate Limiting:** Resets on cold starts
5. **Auth Model:** Confusing (Authorization header ignored)

---

## 📝 Priority Recommendations

### Immediate (Fix ASAP):

1. ✅ **Fix CORS policy** - Restrict to qrbuddy.app only
2. ✅ **Add URL validation** before redirects in redirect-qr function
3. ✅ **Add routing_config URL validation** in update-dynamic-qr

### Short Term (This Week):

4. Create shared `apiRequest` helper to reduce duplication
5. Add client-side file type validation for better UX
6. Add structured logging with security context
7. Fix race condition in dynamic QR creation

### Medium Term (This Month):

8. Document the owner_token authentication model
9. Consider persistent rate limiting (Upstash Redis)
10. Add comprehensive error codes
11. Extract magic numbers to constants

### Long Term (Nice to Have):

12. Migrate to Supabase Auth for proper user authentication
13. Add request signing for additional security
14. Implement webhook verification
15. Add automated security scanning (Dependabot, SAST)

---

## 🧪 Testing Recommendations

### Add Tests For:

1. **URL Validation:** Test javascript:, data:, file: protocols
2. **Routing Configs:** Ensure malicious URLs are blocked
3. **File Upload:** Test blocked extensions and MIME types
4. **Rate Limiting:** Verify it actually works (manual test with curl)
5. **Error Handling:** Test malformed JSON responses
6. **CORS:** Verify requests from unauthorized origins are blocked

---

## 💡 Additional Notes

### Why Authorization Header Isn't Validated:

Your app uses a **token-based auth model** (owner_token) instead of Supabase's
built-in authentication. This means:

- Edge functions use SERVICE_ROLE_KEY to bypass RLS
- Authorization is done via owner_token in request body
- The anon key in Authorization header is essentially unused

**This is okay for your use case**, but should be documented to avoid confusion.

### Rate Limiting Caveat:

The in-memory rate limiter is fine for MVP, but won't scale well:

- Resets on cold starts (every 5-15 minutes)
- Doesn't work across multiple edge function instances
- Can be bypassed with distributed attacks

For production at scale, consider Upstash Redis or Supabase KV.

---

## 📊 Final Score

| Category       | Score      | Notes                                                |
| -------------- | ---------- | ---------------------------------------------------- |
| Security       | 7/10       | Good basics, but CORS and open redirect are concerns |
| Code Quality   | 8/10       | Clean and consistent, but has duplication            |
| Error Handling | 7/10       | Good coverage, but missing validation                |
| Performance    | 9/10       | Well optimized, good use of parallel requests        |
| Documentation  | 6/10       | Needs more inline security documentation             |
| **Overall**    | **7.4/10** | Solid implementation with room for improvement       |

---

## ✅ Conclusion

Your Supabase implementation is **generally solid** and the auth headers fix
resolves the immediate issue. The main concerns are:

1. **CORS policy is too open** - Easy fix
2. **Potential open redirect** - Requires validation before redirect
3. **Some code duplication** - Can be refactored

None of these are showstoppers, but I recommend fixing the CORS and open
redirect issues before going to production with sensitive use cases.

Great job on the encryption for token storage and comprehensive file type
validation! 🎉
