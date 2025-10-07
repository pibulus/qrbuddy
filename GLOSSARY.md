# Glossary - QRBuddy

## Islands (Interactive Components)

- `QRCanvas` - Core QR rendering + download/copy + destructible badge
  (islands/QRCanvas.tsx)
- `SmartInput` - Smart input handling URLs, files, and plain text with
  drag/drop (islands/SmartInput.tsx)
- `StylePills` - Style selector UI (islands/StylePills.tsx)
- `StyleSelector` - Style selection logic (islands/StyleSelector.tsx)
- `ShuffleButton` - Random style with spring animation
  (islands/ShuffleButton.tsx)
- `ShuffleAction` - Shuffle action handler (islands/ShuffleAction.tsx)
- `ActionButtons` - Download trigger buttons (islands/ActionButtons.tsx)
- `KeyboardHandler` - Global shortcuts (s=shuffle, d=download, c=copy)
  (islands/KeyboardHandler.tsx)
- `EasterEggs` - Hidden features and animations (islands/EasterEggs.tsx)
- `GradientCreator` - Custom gradient builder (islands/GradientCreator.tsx)
- `ToastManager` - Notification stacking system (islands/ToastManager.tsx)
- `ErrorBoundary` - QR generation error handling (islands/ErrorBoundary.tsx)

## Utils

- `qr-styles.ts` - Gradient style definitions
  (sunset/pool/terminal/candy/vapor/brutalist) (utils/qr-styles.ts)

## Key Functions

- `addToast()` - Add notification to stack (islands/ToastManager.tsx)

## Core Concepts

- **Signal-Based State** - Preact signals for reactive updates (url, style,
  triggerDownload, triggerCopy, isDestructible)
- **Gradient QR Codes** - `qr-code-styling` library with 6 pre-defined gradient
  themes
- **Island Architecture** - Selective client hydration, server-rendered HTML
- **Soft Brutal Aesthetic** - Chunky 4px borders, warm pastels, spring
  animations
- **Smart Input Detection** - Automatically detects URLs, files, or plain text
- **Destructible Files** - One-time file sharing via Supabase edge functions
- **Self-Destructing QRs** - Files uploaded to Supabase self-destruct after 1
  scan
- **Keyboard Shortcuts** - s (shuffle), d (download), c (copy)
