# Glossary - QRBuddy

## Islands (Interactive Components - 17 total)

**Core QR Components:**

- `SmartInput` - Handles URLs, files, templates, destructible/dynamic toggles
  with drag & drop
- `QRCanvas` - Renders QR codes, manages download/copy, shows dynamic badges
- `StyleSelector` - Gradient picker with quick menu + custom entry point
- `GradientCreator` - Full modal for custom gradients
- `TemplateModal` - WiFi/vCard/SMS/Email/Text helpers that write into SmartInput
- `LogoUploader` - Custom center-logo uploader with previews
- `ActionButtons` - Download/copy/share triggers tied to signals

**Modals & Overlays:**

- `ExtrasModal` - File buckets, destructible goodies, logo uploader access
- `AboutModal` - Feature overview + release notes
- `KofiModal` - Ko-fi support modal
- `PricingModal` - Pro tier upsell modal

**Dynamic + Bucket Features:**

- `EditQRForm` - Dynamic QR edit interface (scan limits + redirects)
- `BucketQR` - File bucket QR display/manage view

**System Components:**

- `ToastManager` - Notification stacking system
- `ErrorBoundary` - QR generation error handling
- `EasterEggs` - Hidden features and playful interactions
- `Analytics` - PostHog analytics integration

## Utils

- `qr-styles.ts` - Gradient style definitions
  (sunset/pool/terminal/candy/vapor/brutalist) (utils/qr-styles.ts)

## Key Functions

- `addToast()` - Add notification to stack (islands/ToastManager.tsx)

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
- **Dynamic QR Codes** - Privacy-first editable redirects with scan limits (1,
  5, 10, 100, ∞) and expiry dates
- **Anti-Scale Dynamic** - Editable QR destinations with scan limits, expiry,
  and owner tokens (NO tracking/analytics)
- **Local Development** - Mock API server (local-api/server.ts) for testing
  without Supabase
- **KABOOM Page** - Epic explosion page shown when destructible file already
  accessed
