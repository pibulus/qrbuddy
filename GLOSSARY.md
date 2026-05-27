# Glossary - QRBuddy

## Islands (Interactive Components - 40 registered)

**Core QR Components:**

- `SmartInput` - Handles URLs, files, QR types, destructible/dynamic toggles
  with drag & drop
- `QRCanvas` - Renders QR codes, manages download/copy, shows dynamic badges
- `StyleSelector` - Gradient picker with quick menu + custom entry point
- `GradientCreator` - Full modal for custom gradients
- `CreateModal` - Combined QR type, options, file locker, and design sheet
- `LogoUploader` - Custom center-logo uploader with previews
- `ActionButtons` - Download/copy/share triggers tied to signals
- `ShareActions` - Share sheet for QR codes
- `HistoryDrawer` - QR generation history panel
- `RotatingTitle` - Animated header text
- `FileSlideshow` - Multi-image slideshow viewer; finite shares download as a
  single zip

**Modals & Overlays:**

- `AboutModal` - Feature overview + release notes
- `KofiModal` - Ko-fi support modal
- `PricingModal` - Pro tier upsell modal

**Dynamic + Locker Features:**

- `EditQRForm` - Dynamic QR edit interface (scan limits + redirects)
- `BucketQR` - File locker QR display/manage view

**System Components:**

- `ToastManager` - Notification stacking system
- `ErrorBoundary` - QR generation error handling
- `EasterEggs` - Hidden features and playful interactions
- `Analytics` - PostHog analytics integration

**Sub-Islands (edit-qr/):**

- `AnalyticsDashboard` - QR scan analytics view
- `QRStatusCard` - Status display for dynamic QR
- `RoutingConfigForm` - Multi-destination routing editor
- `RoutingModeSelector` - Simple vs sequential routing toggle

**Sub-Islands (extras/):**

- `BatchSettings` - Batch QR generation options
- `EditableLinkSettings` - Dynamic link configuration
- `LockerSettings` - File locker creation settings
- `LogoSettings` - Logo upload settings panel
- `MultiLinkSettings` - Link rotation options
- `SplashSettings` - Intro page configuration
- `TimeBombSettings` - Scan and date limit options

**Sub-Islands (smart-input/):**

- `FileUploadOptions` - File upload UI controls
- `SmartInputToolbar` - Input mode toolbar

**Sub-Islands (templates/):**

- `EmailForm` - Email QR type builder
- `MediaHubForm` - File-share page builder
- `SMSForm` - Text message QR type builder
- `SocialHubForm` - Social profile QR type builder
- `VCardForm` - Contact card QR type builder
- `WebsiteForm` - Link QR type builder
- `WiFiForm` - WiFi network QR type builder

## Utils

- `qr-styles.ts` - Gradient style definitions
  (sunset/pool/terminal/candy/vapor/brutalist) (utils/qr-styles.ts)
- `api.ts` - Supabase URL + anon auth header helpers for server and browser
  contexts
- `api-request.ts` - Shared JSON/FormData request wrappers with consistent error
  handling
- `constants.ts` - Shared scan limits, upload progress, and UI timing constants
- `file-validation.ts` - Client-side upload size/type/extension checks
- `token-vault.ts` - Local owner-token storage helpers for editable QRs and
  lockers

## Key Functions

- `addToast()` - Add notification to stack (islands/ToastManager.tsx)
- `claim_destructible_file_download()` /
  `finalize_destructible_file_download()` - Supabase RPC pair that claims a
  destructible file before serving it, then finalizes/removes it after storage
  retrieval succeeds
- `claim_bucket_download()` - Supabase RPC used by File Locker downloads to
  atomically mark content as busy and prevent concurrent double-download races

## Core Concepts

- **Signal-Based State** - Preact signals for reactive updates (url, style,
  triggerDownload, triggerCopy, isDestructible, isDynamic, editUrl)
- **Gradient QR Codes** - `qr-code-styling` library with 6 pre-defined gradient
  themes
- **Island Architecture** - Selective client hydration, server-rendered HTML
- **Soft Brutal Aesthetic** - Chunky 4px borders, warm pastels, spring
  animations
- **Smart Input Detection** - Automatically detects URLs, files, or plain text
  with drag/drop
- **Destructible QRs** - One-time QR codes (URLs OR files) that self-destruct
  after 1 scan → KABOOM page
- **Finite Multi-File Shares** - Multi-image limited shares are delivered as one
  zip so a single item cannot consume/destroy the whole share
- **File Locker** - Persistent QR bucket for passing files, text, or links; can
  be reusable or empty/delete on download
- **Dynamic QR Codes** - Privacy-first editable redirects with scan limits (1,
  5, 10, 100, ∞) and expiry dates
- **Anti-Scale Dynamic** - Editable QR destinations with scan limits, expiry,
  and owner tokens (NO tracking/analytics)
- **Local Development** - Mock API server (local-api/server.ts) for testing
  basic destructible/dynamic flows without Supabase; locker parity requires
  Supabase
- **Service Role Boundary** - Fresh/client code uses anon key headers; database,
  storage, and internal RPC access stays inside Supabase edge functions
- **KABOOM Page** - Epic explosion page shown when destructible file already
  accessed
