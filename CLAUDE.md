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

# Start local mock API server (for testing Supabase features locally)
deno task api

# Format and lint code (run after changes)
deno fmt && deno lint

# Full check (format, lint, type check)
deno task check

# Run tests
deno task test

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
   - `url`: The URL/text to encode in the QR code
   - `style`: Current selected gradient style (sunset, pool, terminal, candy,
     vapor, brutalist, custom)
   - `customStyle`: Custom gradient configuration object
   - `triggerDownload`: Action trigger for downloading QR
   - `isDestructible`: Toggle for one-time self-destructing QRs
   - `isDynamic`: Toggle for editable redirect QRs
   - `editUrl`: URL to edit page for dynamic QRs
   - `logoUrl`: Custom center logo URL
   - `maxDownloads`: Download limit for destructible files
   - `isBucket`: Toggle for file locker (multi-file) mode
   - `bucketUrl`: URL to file locker page

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

**Islands (Interactive Components - 23 total)**

See GLOSSARY.md for complete list organized by category. Key islands:

- `QRCanvas`: Core QR rendering and download/copy functionality
- `SmartInput`: Smart input handling URLs, files, plain text, with dynamic QR
  options, batch mode, and sequential routing
- `StyleSelector`: Gradient selection with quick menu + custom entry point
- `GradientCreator`: Custom gradient builder modal
- `LogoUploader`: Custom logo upload with drag-drop
- `EditQRForm`: Dynamic QR edit interface (destination, scan limits, expiry)
- `BucketQR`: File locker display and management
- `ToastManager`: Notification stacking system
- `RotatingTitle`: Rotating playful title component
- `ShareActions`: Share link and native share functionality
- `ActionButtons`: Download/copy/share triggers
- `TemplateModal`: WiFi/vCard/SMS/Email/Text template helpers (4 sub-forms)
- `ExtrasModal`: Power-ups modal (dynamic QRs, file lockers, logos, batch mode)
- `AboutModal`/`KofiModal`/`PricingModal`: Feature discovery and monetization
- `ErrorBoundary`: Error handling with graceful degradation
- `EasterEggs`: Hidden features and playful interactions
- `Analytics`: PostHog analytics integration

**Routes**

- `routes/index.tsx`: Main QR generator page with all islands + SEO
- `routes/q.tsx`: Shared QR showcase page
- `routes/edit.tsx`: Dynamic QR edit page (requires owner token)
- `routes/boom.tsx`: KABOOM self-destruct landing page
- `routes/r.tsx` / `routes/r/[code].tsx`: Dynamic QR redirect handlers
- `routes/f/[code].tsx`: Destructible file download gate
- `routes/bucket/[code].tsx`: File locker viewer
- `routes/api/download-file.ts`: Server-side file download proxy

**Utils**

- `utils/qr-styles.ts`: Style definitions with gradient configurations for 6
  pre-defined themes (sunset, pool, terminal, candy, vapor, brutalist)
- `utils/api.ts`: API URL resolution for Supabase edge functions (works in both
  server and client contexts)
- `utils/sounds.ts`: Sound effect utilities for haptic/audio feedback
- `utils/haptics.ts`: Haptic feedback utilities for mobile devices
- `utils/token-vault.ts`: LocalStorage management for owner tokens (edit access)

**Hooks (Custom Preact Hooks)**

- `hooks/useDynamicQR.ts`: Dynamic QR creation logic with debouncing, routing
  modes (simple/sequential/device-based/time-based), and error handling
- `hooks/useFileUpload.ts`: File upload logic for destructible files with
  progress tracking and validation

**Types**

- `types/qr-types.ts`: Core QR style and configuration TypeScript types
- `types/qr-templates.ts`: Template types for WiFi, vCard, SMS, Email forms
- `types/pricing.ts`: Pricing tier and subscription types

### Database Schema

**Tables (Supabase):**

- `dynamic_qr_codes`: Editable QR codes with destination URLs, scan limits,
  expiry dates, and routing configurations
- `scan_logs`: Privacy-first analytics with device type, OS, browser, country,
  and city (no personal identifiers)
- `file_buckets`: Multi-file upload containers (file lockers)
- `pro_subscriptions`: Paid tier subscriptions with feature flags

**Migrations:**

- Located in `supabase/migrations/` with timestamped SQL files
- Run via Supabase dashboard SQL Editor or `supabase db push`

### State Flow Pattern

1. User interaction in an island component updates a signal
2. Signal change triggers useEffect hooks in dependent components
3. QRCanvas watches url/style signals and regenerates QR on change
4. Action signals (triggerDownload/triggerCopy) are set to true, consumed by
   QRCanvas, then reset to false

### Environment Variables

QRBuddy uses the following environment variables (see `.env.example`):

**Required for Production:**
- `SUPABASE_URL`: Supabase project URL (e.g., `https://xxx.supabase.co`)
- `SUPABASE_ANON_KEY`: Supabase anonymous/public API key
- `SUPABASE_SERVICE_ROLE_KEY`: Supabase service role key (server-side only)
- `APP_URL`: Base URL for the application (e.g., `https://qrbuddy.app`)

**Optional:**
- `POSTHOG_KEY`: PostHog analytics API key for usage tracking
- `PAYMENT_URL_PRO`: Stripe/payment link for Pro tier upgrades

**Local Development:**
- No environment variables required for basic QR generation
- Mock API server (`deno task api`) simulates Supabase edge functions locally
- Files stored in `local-api/files/` (gitignored)

### Deployment

- **Primary**: Deno Deploy (zero-config deployment from GitHub)
- **Alternative**: Any Deno-compatible host via `deno run -A main.ts`
- **Project ID**: `fff4f21f-dab0-46f0-aa13-ea22dd20be78` (qrbuddy project)
- **Live URL**: https://qrbuddy.deno.dev
- **Custom Domain**: qrbuddy.app

#### Deployment Commands

```bash
# Deploy to production (uses project ID from deno.json)
deployctl deploy --production --token=$DENO_DEPLOY_TOKEN

# First-time deploy adds a "deploy" section to deno.json with:
# - project: UUID linking to Deno Deploy project
# - entrypoint: main.ts (Fresh standard)
# - exclude/include: deployment file filters
# This should be committed to track deployment config
```

## 🎯 Key Features & How They Work

### QR Code Types

1. **Basic QR Codes**: Static QR codes with 6 gradient styles or custom gradients
   - Generated entirely client-side with `qr-code-styling`
   - Instant generation (<100ms)
   - Optional custom center logo

2. **Destructible QRs**: One-time self-destructing QR codes
   - Works for both URLs and files
   - Self-destructs after 1 scan → KABOOM page
   - Files stored in Supabase Storage with `max_downloads=1`
   - Purple "destructible" badge shown on QR

3. **Dynamic QRs**: Editable redirect QR codes
   - Print once, edit destination anytime via `/edit?token={token}`
   - Scan limits: 1, 5, 10, 100, or unlimited
   - Optional expiry dates
   - Owner tokens stored in localStorage (no user accounts needed)
   - Purple/pink "editable" badge shown on QR

4. **Sequential/Rotating QRs**: Multi-link QR codes
   - Single QR that rotates through multiple URLs
   - Each scan goes to next URL in sequence
   - Optional loop mode (returns to first URL after last)
   - Useful for rotating promo codes, time-limited offers

5. **Device-Based Routing**: Smart QR codes that detect device type
   - Route iOS users to App Store, Android to Play Store, desktop to web
   - Configured via `routingMode: "device"` in dynamic QR

6. **File Lockers**: Multi-file upload containers
   - Upload multiple files, get single QR code
   - Browse and download files from locker page
   - Renamed from "File Buckets" for clarity

7. **Text Buckets**: Shareable text snippets
   - For non-URL text content (poems, quotes, messages)
   - Automatically created when dynamic QR detects non-URL input
   - Stored in Supabase, accessible via unique URL

8. **Batch Mode**: Generate multiple QR codes at once
   - Input list of URLs (one per line)
   - Generates all QR codes simultaneously
   - Download as ZIP file
   - Progress indicator shows generation status

### Templates

Pre-filled QR code templates for common use cases:

- **WiFi**: SSID, password, encryption type → auto-generates WiFi QR
- **vCard**: Name, phone, email, URL → generates contact card QR
- **SMS**: Phone number, message → generates SMS QR
- **Email**: Email address, subject, body → generates mailto QR
- **Text**: Plain text snippets → generates text QR

Templates are pure client-side formatters that write into the SmartInput
component.

## 🎨 Design System

QRBuddy follows Pablo's "Soft Brutal" aesthetic:

- **Chunky borders**: 4px black borders with custom shadow classes
- **Warm pastels**: Cream backgrounds with gradient accents
- **Spring animations**: Squish, rotate-shuffle, and pop effects
- **Gradient themes**: 6 pre-defined gradient styles emphasizing visual delight
- **Haptic feedback**: Tactile responses on mobile for key interactions
- **Toast notifications**: Stacking notification system for user feedback

## 📝 Development Notes

### Code Quality

- Always run `deno fmt && deno lint` after making changes
- Run `deno task check` for full validation (format, lint, type check)
- Run `deno task test` to verify edge function tests pass
- Fresh automatically handles code splitting for islands - keep islands focused
  and minimal

### Type Safety

- The QR library (`qr-code-styling`) expects specific gradient object structures
  - maintain type compatibility
- All gradient styles must have: `dots`, `background`, `cornersSquare`,
  `cornersDot` properties
- Use TypeScript types from `types/` directory for consistency
- Leverage Deno's built-in type checking - no separate tsconfig needed

### Styling Conventions

- Tailwind CSS is configured in `tailwind.config.ts` with custom theme colors
- Follow "Soft Brutal" aesthetic: 4px black borders, hard shadows, warm pastels
- Use semantic class names from Tailwind's design system
- Animation classes: `animate-squish`, `animate-rotate-shuffle`,
  `animate-pop-in`, `animate-bounce-in`
- Custom colors defined in tailwind.config.ts: cream, sunset, pool, etc.

### State Management

- Use Preact signals for reactive state - pass as props from parent route
- Signals flow: Route (index.tsx) → Islands via props
- Never create signals inside islands - always receive as props
- Use `useEffect` with proper dependencies to watch signal changes
- Clean up effects with return functions (remove event listeners, clear timers)

### API Integration

- Use `getApiUrl()` from `utils/api.ts` for all Supabase edge function calls
- API calls automatically fall back to local mock server (`localhost:8005`) in
  development
- Debounce user input (800ms) before triggering API calls
- Use custom hooks (`useDynamicQR`, `useFileUpload`) for complex API operations
- All API responses should include error handling and user feedback via
  `addToast()`

### File Organization

- **Islands**: Interactive components only - keep stateless when possible
- **Routes**: Page components + API handlers - handle SSR and data fetching
- **Utils**: Pure functions with no side effects
- **Hooks**: Reusable Preact hooks for complex logic
- **Types**: Shared TypeScript interfaces and types
- See GLOSSARY.md for complete component reference

### Local Development Workflow

1. Start local API mock server: `deno task api` (port 8005)
2. Start Fresh dev server: `deno task start` (port 8004)
3. Make changes, verify in browser
4. Run `deno fmt && deno lint` before committing
5. Test edge functions with `deno task test` if applicable

## 🔒 Security & Performance Considerations

### Memory Management

- **Event Listeners**: KeyboardHandler properly cleans up with
  `removeEventListener` in useEffect return
- **Timeouts**: All setTimeout calls are short-lived (400ms-3500ms) for UI
  feedback only
- **QR Library**: QRCodeStyling instance is properly managed via refs, no memory
  leaks detected

### Security

- **Input Validation**: URL input accepts any string (by design for flexibility)
- **Clipboard API**: Uses modern Clipboard API with proper error handling
- **Client-Side QR Generation**: All QR rendering happens in-browser, no data
  sent to servers
- **Owner Tokens**: Stored in localStorage only, never transmitted except for
  edit operations
- **RLS Policies**: Supabase Row Level Security on all database tables
- **Service Role Protection**: Sensitive operations require service_role key
  (server-side only)
- **Rate Limiting**: Edge functions include rate limiting to prevent abuse
  (see `supabase/functions/_shared/rate-limit.ts`)
- **Privacy-First Analytics**: Scan logs track device/geo only, no personal
  identifiers or IP addresses
- **Secure File Storage**: Files stored in Supabase Storage with RLS policies
- **CORS Protection**: All edge functions include CORS headers for security
  (see `supabase/functions/_shared/cors.ts`)

### Performance Optimizations

- **Islands Architecture**: Only interactive components hydrate (23 total
  islands including template forms)
- **Signal-Based State**: Efficient reactive updates without re-renders
- **Lazy QR Updates**: QR regenerates only on url/style change via useEffect
  dependencies
- **Tailwind CSS**: Utility-first CSS with minimal runtime overhead
- **Debounced API Calls**: 800ms debounce on dynamic QR creation to reduce
  server load
- **Client-Side QR Generation**: All QR rendering happens in-browser with no
  server round-trips

## ✅ Recently Completed

### Latest Features (November 2025)

- **Batch Mode QR Generation**: Generate multiple QR codes at once from a list
  of URLs with ZIP download (batch mode in ExtrasModal)
- **Sequential/Rotating Multi-Link QRs**: Single QR code that rotates through
  multiple URLs sequentially with optional looping
- **Device & Time-Based Routing**: Dynamic QR routing based on device type (iOS,
  Android, desktop) or time-of-day
- **Scan Logs & Analytics**: Privacy-first scan tracking with device type, OS,
  browser, and geo info (no personal identifiers)
- **File Locker Enhancements**: Renamed from "File Bucket" with improved UI and
  batch file upload
- **Text Buckets**: Smart text feature that creates shareable text buckets for
  non-URL content
- **Enhanced Error Logging**: Security context and comprehensive error handling
  with APP_URL configuration
- **RotatingTitle Component**: Playful rotating title on homepage
- **ShareActions Island**: Native Web Share API integration with clipboard
  fallback
- **Pro Subscription Schema**: Database support for paid tier with enhanced
  features

### Dynamic QR Codes Integration (October 2025)

- **Anti-Scale Dynamic QRs**: Privacy-first editable redirects with NO
  tracking/analytics
- **Database Schema**: Added `dynamic_qr_codes`, `scan_logs`,
  `pro_subscriptions` tables
- **Edge Functions**: 11 total Supabase functions:
  - Dynamic QRs: create-dynamic-qr, update-dynamic-qr, get-dynamic-qr,
    redirect-qr
  - Destructible files: upload-file, get-file, get-file-metadata
  - File lockers: create-bucket, get-bucket-status, upload-to-bucket,
    download-from-bucket
- **Smart Input Enhancements**: Checkbox + options UI for scan limits
  (1/5/10/100/∞) and expiry dates
- **Edit Page**: New `/edit?token={owner_token}` route with EditQRForm island
  for changing destination/settings
- **Owner Tokens**: Stored in localStorage for edit access without user accounts
- **Redirect Route**: `/r?code={short_code}` route forwards to edge function for
  redirect logic
- **Shared QR Page**: New `/q.tsx` route for sharing QR codes
- **Visual Indicators**: Purple/pink "editable" badge on dynamic QRs alongside
  destructible badge
- **23 Interactive Islands**: Complete island architecture with modals,
  templates, and feature discovery

### Previous Features

- **Base Zero Achievement**: Added GLOSSARY.md, updated README with accurate
  tech stack
- **Twind→Tailwind Migration**: Migrated from deprecated Twind to stable
  Tailwind CSS
- **Destructible Files**: Self-destructing file uploads with KABOOM explosion
  page
- **12 Interactive Islands**: GradientCreator, keyboard shortcuts,
  copy-to-clipboard, error handling, toast notifications
- **Mobile Dev Config**: Added --host 0.0.0.0 flag for mobile testing on local
  network

## 🐛 Troubleshooting

### Common Issues

**Dynamic QRs not working locally:**
- Ensure local API server is running: `deno task api`
- Check that port 8005 is available
- Verify `utils/api.ts` correctly falls back to localhost

**TypeScript errors in islands:**
- Run `deno task check` to see full type errors
- Ensure signal props match parent route definitions
- Check that all imports use correct paths (Deno import maps in `deno.json`)

**Tailwind classes not applying:**
- Restart dev server after changing `tailwind.config.ts`
- Verify class names match Tailwind's utility naming
- Check for typos in custom animation classes

**QR code not generating:**
- Check browser console for errors
- Verify `qr-code-styling` library loaded correctly
- Ensure URL signal has valid content
- Check ErrorBoundary for error messages

**Supabase edge functions failing:**
- Verify environment variables are set (`SUPABASE_URL`, `SUPABASE_ANON_KEY`)
- Check Supabase dashboard for function deployment status
- Review function logs in Supabase dashboard
- Ensure RLS policies allow the operation

**File uploads failing:**
- Check Supabase Storage bucket exists and has correct RLS policies
- Verify `SUPABASE_SERVICE_ROLE_KEY` is set (server-side)
- Check file size limits (default 50MB in Supabase)
- Review `upload-file` edge function logs

### Development Tips

- Use browser DevTools Network tab to debug API calls
- Enable verbose logging in edge functions for debugging
- Test mobile features using `--host 0.0.0.0` and local network IP
- Use PostHog session replay for production debugging (if enabled)
- Check GLOSSARY.md for component reference
- Review SUPABASE-TODO.md for production deployment checklist
