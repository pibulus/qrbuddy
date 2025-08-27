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
- **Styling**: Twind (runtime Tailwind) with custom theme configuration in
  `twind.config.ts`
- **No Build Step**: Fresh's JIT compilation means no bundler configuration
  needed
- **Type Safety**: TypeScript throughout with Deno's built-in type checking

### Component Responsibilities

**Route (`routes/index.tsx`)**

- Initializes all shared signals
- Orchestrates component layout
- Handles SEO meta tags

**Islands (Interactive Components)**

- `QRCanvas`: Core QR rendering and download/copy functionality
- `ShuffleButton`: Random style selection with spring animation
- `URLInput`: URL entry with validation
- `StylePills`: Style selector UI
- `ActionButtons`: Download trigger
- `KeyboardHandler`: Global keyboard shortcuts (s for shuffle, d for download, c
  for copy)
- `EasterEggs`: Hidden features and animations

**Utils (`utils/qr-styles.ts`)**

- Style definitions with gradient configurations
- Each style defines dots, background, cornersSquare, and cornersDot properties

### State Flow Pattern

1. User interaction in an island component updates a signal
2. Signal change triggers useEffect hooks in dependent components
3. QRCanvas watches url/style signals and regenerates QR on change
4. Action signals (triggerDownload/triggerCopy) are set to true, consumed by
   QRCanvas, then reset to false

### Deployment

- **Primary**: Deno Deploy (zero-config deployment from GitHub)
- **Alternative**: Any Deno-compatible host via `deno run -A main.ts`
- **Project ID**: `fff4f21f-dab0-46f0-aa13-ea22dd20be78` (qrbuddy project)
- **Live URL**: https://qrbuddy.deno.dev
- **Custom Domain**: qrbuddy.app (pending DNS setup)

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
- Twind configuration is runtime-only - no PostCSS or build-time CSS generation
- Fresh automatically handles code splitting for islands - keep islands focused
  and minimal

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
- **No External Data**: No API calls or external data fetching
- **Client-Side Only**: QR generation happens entirely client-side, no data sent
  to servers

### Performance Optimizations

- **Islands Architecture**: Only interactive components hydrate (7 islands
  total)
- **Signal-Based State**: Efficient reactive updates without re-renders
- **Lazy QR Updates**: QR regenerates only on url/style change via useEffect
  dependencies
- **CSS-in-JS**: Twind runtime minimizes CSS payload

## ✅ Recently Fixed

- Added MIT License with trademark protection for QRBuddy branding
- Implemented ErrorBoundary component for graceful QR generation failure
  handling
- Created ToastManager with proper stacking support for multiple notifications
- Now supports 9 interactive islands total (added ErrorBoundary, ToastManager)
