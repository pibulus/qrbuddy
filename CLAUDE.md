# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with
code in this repository.

## 🎯 Project: QRBuddy

Beautiful gradient QR code generator with personality - transforms boring QR
codes into stunning gradient art pieces with soft brutal aesthetic.

## 🚀 Common Development Commands

```bash
# Start development server with hot reload
deno task start

# Format and lint code (run after changes)
deno fmt && deno lint

# Full check (format, lint, type check)
deno task check

# Build for production
deno task build

# Preview production build locally
deno task preview

# Update Fresh framework
deno task update
```

## 🏗 Architecture Overview

QRBuddy is a **Deno Fresh** application that generates beautiful gradient QR
codes. It follows Fresh's island architecture pattern where interactive
components are hydrated on the client while the rest remains server-rendered
HTML.

### Core Architecture Patterns

1. **Island Architecture**: Interactive components live in `/islands/` and are
   selectively hydrated on the client. Each island is a self-contained Preact
   component with its own state management via signals.

2. **Signal-Based State**: Uses Preact signals for reactive state management
   across components. Key signals:
   - `url`: The URL to encode in the QR code
   - `style`: Current selected gradient style (sunset, pool, terminal, candy,
     vapor, brutalist)
   - `triggerDownload`/`triggerCopy`: Action triggers that components watch via
     useEffect

3. **Component Communication**: Islands communicate through shared signals
   passed as props from the parent route (`routes/index.tsx`). This allows
   decoupled components to react to state changes without direct dependencies.

### Key Technical Decisions

- **QR Generation**: Uses `qr-code-styling` library for gradient support and
  advanced styling options
- **Styling**: Tailwind CSS with custom theme configuration in
  `tailwind.config.ts`
- **No Build Step**: Fresh's JIT compilation means no bundler configuration
  needed
- **Type Safety**: TypeScript throughout with Deno's built-in type checking

### Component Responsibilities

**Route (`routes/index.tsx`)**

- Initializes all shared signals
- Orchestrates component layout
- Handles SEO meta tags

**Islands (Interactive Components - 40 registered)**

See GLOSSARY.md for complete list organized by category. Key islands:

- `QRCanvas`: Core QR rendering and download/copy functionality
- `SmartInput`: Smart input handling URLs, files, and plain text with dynamic QR
  options
- `StyleSelector`/`GradientCreator`: Gradient selection + custom builder entry
- `GradientCreator`: Custom gradient builder
- `LogoUploader`: Custom logo upload with drag-drop
- `EditQRForm`: Dynamic QR edit interface
- `BucketQR`: File locker display and management
- `FileSlideshow`: Destructible multi-image preview and finite-share zip
  download entry point
- `ToastManager`: Notification stacking system
- `CreateModal`: Combined QR type, options, file locker, and design sheet
- `AboutModal`/`KofiModal`/`PricingModal`: Feature discovery
- `ErrorBoundary`: Error handling
- `Analytics`: PostHog integration

**Utils**

- **`utils/qr-styles.ts`**: Style definitions with gradient configurations -
  each style defines dots, background, cornersSquare, and cornersDot properties
- **`utils/api-request.ts`**: Shared API request helpers with automatic auth
  header injection and consistent error handling (eliminates duplicate code
  across hooks)
- **`utils/file-validation.ts`**: Client-side file validation utilities for size
  and type checking (validates before upload for better UX)
- **`utils/constants.ts`**: Application-wide constants including upload progress
  intervals, scan limits, and timing values (eliminates magic numbers)
- **`utils/api.ts`**: API configuration and authentication header helpers

### Common Patterns

**API Requests to Supabase Edge Functions**

Always use the shared `apiRequest` or `apiRequestFormData` helpers from
`utils/api-request.ts`. These automatically include authentication headers and
provide consistent error handling.

```typescript
// GET/POST with JSON
const data = await apiRequest<ResponseType>(
  `${apiUrl}/endpoint`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ foo: "bar" }),
  },
  "Friendly error message",
);

// File upload with FormData
const result = await apiRequestFormData<UploadResponse>(
  `${apiUrl}/upload-file`,
  formData,
  "Upload failed",
);
```

**File Upload Validation**

Always validate files client-side before upload using `validateFile()` from
`utils/file-validation.ts`:

```typescript
const validation = validateFile(file);
if (!validation.valid) {
  throw new Error(validation.error);
}
// Safe to proceed with upload
```

**Using Constants**

Import constants from `utils/constants.ts` instead of hardcoding values:

```typescript
import { UNLIMITED_SCANS, UPLOAD_PROGRESS_MAX } from "../utils/constants.ts";

// Good: Named constant
if (maxDownloads === UNLIMITED_SCANS) {
  // handle unlimited case
}

// Bad: Magic number
if (maxDownloads === 999999) {
  // unclear what this number means
}
```

### State Flow Pattern

1. User interaction in an island component updates a signal
2. Signal change triggers useEffect hooks in dependent components
3. QRCanvas watches url/style signals and regenerates QR on change
4. Action signals (triggerDownload/triggerCopy) are set to true, consumed by
   QRCanvas, then reset to false

### Deployment

- **Primary**: Deno Deploy (zero-config deployment from GitHub)
- **Alternative**: Any Deno-compatible host via `deno run -A main.ts`
- **Deno Deploy project**: `qrbuddy`
- **Live URL**: https://qrbuddy.app
- **Deno Deploy alias**: https://qrbuddy.deno.dev
- **Supabase project ref**: `aqydpibnvlhcjcwosrti`

#### Deployment Commands

```bash
# Deploy Fresh production. Only pass public/client-safe Supabase config here.
PROJECT_REF=aqydpibnvlhcjcwosrti
deployctl deploy --prod --token=$DENO_DEPLOY_TOKEN \
  --env="SUPABASE_URL=https://${PROJECT_REF}.supabase.co" \
  --env="APP_URL=https://qrbuddy.app" \
  --env="SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}"

# Deploy all Supabase edge functions when backend code changes.
for func in supabase/functions/*/; do
  supabase functions deploy "$(basename "$func")" --project-ref "$PROJECT_REF"
done
```

Never pass `SUPABASE_SERVICE_ROLE_KEY` to Deno Deploy. It belongs only in
Supabase edge function secrets.

## 🎨 Design System

QRBuddy follows Pablo's "Soft Brutal" aesthetic:

- **Chunky borders**: 4px black borders with custom shadow classes
- **Warm pastels**: Cream backgrounds with gradient accents
- **Spring animations**: Squish, rotate-shuffle, and pop effects
- **Gradient themes**: 6 pre-defined gradient styles emphasizing visual delight

## 📝 Development Notes

- Always run `deno fmt && deno lint` after making changes
- The QR library expects specific gradient object structures - maintain type
  compatibility
- Tailwind CSS is configured in `tailwind.config.ts` with custom theme colors
- Fresh automatically handles code splitting for islands - keep islands focused
  and minimal
- See GLOSSARY.md for complete component reference

## 🔒 Security & Performance Considerations

### Memory Management

- **Event Listeners**: Islands/hooks that attach global or document listeners
  clean up with `removeEventListener` in useEffect returns
- **Timeouts**: All setTimeout calls are short-lived (400ms-3500ms) for UI
  feedback only
- **QR Library**: QRCodeStyling instance is properly managed via refs, no memory
  leaks detected

### Security

- **File Upload Security**: Client-side validation blocks executable files and
  enforces 50MB size limit using `utils/file-validation.ts`; server functions
  validate again, with stricter per-file limits for multi-image shares
- **URL Validation**: All redirect URLs validated to prevent open redirect
  vulnerabilities (blocks javascript:, data:, file: protocols)
- **CORS Policy**: Environment-specific origins (qrbuddy.app in prod, localhost
  in dev) - no wildcard access
- **Authentication**: All Supabase edge function calls include required
  Authorization and apikey headers via `utils/api-request.ts`
- **Service Role Boundary**: Client/Fresh code uses the anon key only; Supabase
  edge functions use service role secrets for database/storage/RPC access
- **Clipboard API**: Uses modern Clipboard API with proper error handling
- **Hybrid Architecture**: Static QR generation is client-side only; dynamic QRs
  and file uploads use Supabase edge functions

### Performance Optimizations

- **Islands Architecture**: Only interactive components hydrate (40 islands
  total)
- **Signal-Based State**: Efficient reactive updates without re-renders
- **Lazy QR Updates**: QR regenerates only on url/style change via useEffect
  dependencies
- **Tailwind CSS**: Utility-first CSS with minimal runtime overhead

## ✅ Recently Completed

### File Transfer Hardening (Latest)

- **Atomic Destructible Downloads**: File claims/finalization run through
  service-role-only RPCs to avoid double-spend races
- **Finite Multi-File Semantics**: Limited multi-image shares download as one
  zip; direct sub-file downloads are rejected before consuming a use
- **Locker Freshness**: Bucket pages refetch status after upload/download
  success or failure so cross-device state does not stay stale
- **Upload Progress Polish**: Upload UI switches from "Uploading..." to
  "Processing..." at 99% while server-side work completes
- **RPC Grant Lockdown**: Public `anon`/`authenticated` roles cannot directly
  execute internal file-transfer RPCs

### Dynamic QR Codes Integration

- **Anti-Scale Dynamic QRs**: Privacy-first editable redirects with NO
  tracking/analytics
- **Database Schema**: Added `dynamic_qr_codes` table with scan limits and
  expiry tracking
- **Edge Functions**: 13 total Supabase functions:
  - Dynamic QRs: create-dynamic-qr, update-dynamic-qr, get-dynamic-qr,
    redirect-qr
  - Destructible files: upload-file, get-file, get-file-metadata
  - File lockers: create-bucket, get-bucket-status, upload-to-bucket,
    download-from-bucket
  - System: health, cleanup-expired
- **Smart Input Enhancements**: Checkbox + options UI for scan limits
  (1/5/10/100/∞) and expiry dates
- **Edit Page**: New `/edit?token={owner_token}` route with EditQRForm island
  for changing destination/settings
- **Owner Tokens**: Stored in localStorage for edit access without user accounts
- **Redirect Route**: `/r?code={short_code}` route forwards to edge function for
  redirect logic
- **Visual Indicators**: Purple/pink "editable" badge on dynamic QRs alongside
  destructible badge
- **40 Interactive Islands**: Complete island architecture with modals, QR
  types, and feature discovery

### Previous Features

- **Base Zero Achievement**: Added GLOSSARY.md, updated README with accurate
  tech stack
- **Twind→Tailwind Migration**: Migrated from deprecated Twind to stable
  Tailwind CSS
- **Destructible Files**: Self-destructing file uploads with KABOOM explosion
  page
- **Early Islands**: GradientCreator, copy-to-clipboard, error handling, toast
  notifications
- **Mobile Dev Config**: Added --host 0.0.0.0 flag for mobile testing on local
  network
