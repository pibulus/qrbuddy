# Glossary - QRBuddy

## Islands (Interactive Components - 17 total)

**Core QR Components:**
- `QRCanvas` - Core QR rendering + download/copy + destructible/dynamic badges
- `SmartInput` - Smart input handling URLs, files, and plain text with drag/drop + dynamic QR options
- `URLInput` - Dedicated URL input field with validation
- `StylePills` - Style selector UI
- `StyleSelector` - Style selection logic
- `ShuffleButton` - Random style with spring animation
- `ShuffleAction` - Shuffle action handler
- `ActionButtons` - Download trigger buttons
- `GradientCreator` - Custom gradient builder
- `LogoUploader` - Custom logo upload with drag-drop UI

**Modals & Overlays:**
- `AboutModal` - About info and feature discovery
- `ExtrasModal` - Additional features and options
- `KofiModal` - Ko-fi support modal
- `PricingModal` - Pro tier pricing
- `TemplateModal` - WiFi/vCard/SMS/Email templates

**Dynamic Features:**
- `EditQRForm` - Dynamic QR edit interface
- `BucketQR` - File bucket QR display and management

**System Components:**
- `ToastManager` - Notification stacking system
- `ErrorBoundary` - QR generation error handling
- `EasterEggs` - Hidden features and animations
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
