# Glossary - QRBuddy

## Islands (Interactive Components - 13 total)

- `QRCanvas` - Core QR rendering + download/copy + destructible/dynamic badges
  (islands/QRCanvas.tsx)
- `SmartInput` - Smart input handling URLs, files, and plain text with
  drag/drop + dynamic QR options (islands/SmartInput.tsx)
- `StylePills` - Style selector UI (islands/StylePills.tsx)
- `StyleSelector` - Style selection logic (islands/StyleSelector.tsx)
- `ShuffleButton` - Random style with spring animation
  (islands/ShuffleButton.tsx)
- `ShuffleAction` - Shuffle action handler (islands/ShuffleAction.tsx)
- `ActionButtons` - Download trigger buttons (islands/ActionButtons.tsx)
- `EasterEggs` - Hidden features and animations (islands/EasterEggs.tsx)
- `GradientCreator` - Custom gradient builder (islands/GradientCreator.tsx)
- `ToastManager` - Notification stacking system (islands/ToastManager.tsx)
- `ErrorBoundary` - QR generation error handling (islands/ErrorBoundary.tsx)
- `EditQRForm` - Dynamic QR edit interface (islands/EditQRForm.tsx)

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
