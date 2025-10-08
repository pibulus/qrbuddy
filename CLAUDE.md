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

**Islands (Interactive Components - 13 total)**

- `QRCanvas`: Core QR rendering and download/copy functionality
- `SmartInput`: Smart input handling URLs, files, and plain text with dynamic QR
  options
- `StylePills`: Style selector UI
- `StyleSelector`: Style selection logic
- `ShuffleButton`: Random style selection with spring animation
- `ShuffleAction`: Shuffle action handler
- `ActionButtons`: Download trigger buttons
- `KeyboardHandler`: Global keyboard shortcuts (s for shuffle, d for download, c
  for copy)
- `GradientCreator`: Custom gradient builder
- `EasterEggs`: Hidden features and animations
- `ToastManager`: Notification stacking system
- `ErrorBoundary`: QR generation error handling
- `EditQRForm`: Dynamic QR edit interface with destination/settings updates

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
- Tailwind CSS is configured in `tailwind.config.ts` with custom theme colors
- Fresh automatically handles code splitting for islands - keep islands focused
  and minimal
- See GLOSSARY.md for complete component reference

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

- **Islands Architecture**: Only interactive components hydrate (12 islands
  total)
- **Signal-Based State**: Efficient reactive updates without re-renders
- **Lazy QR Updates**: QR regenerates only on url/style change via useEffect
  dependencies
- **Tailwind CSS**: Utility-first CSS with minimal runtime overhead

## ✅ Recently Completed

### Dynamic QR Codes Integration (Latest)

- **Anti-Scale Dynamic QRs**: Privacy-first editable redirects with NO
  tracking/analytics
- **Database Schema**: Added `dynamic_qr_codes` table with scan limits and
  expiry tracking
- **Edge Functions**: 4 new Supabase functions (create-dynamic-qr,
  update-dynamic-qr, get-dynamic-qr, redirect-qr)
- **Smart Input Enhancements**: Checkbox + options UI for scan limits
  (1/5/10/100/∞) and expiry dates
- **Edit Page**: New `/edit?token={owner_token}` route with EditQRForm island
  for changing destination/settings
- **Owner Tokens**: Stored in localStorage for edit access without user accounts
- **Redirect Route**: `/r?code={short_code}` route forwards to edge function for
  redirect logic
- **Visual Indicators**: Purple/pink "editable" badge on dynamic QRs alongside
  destructible badge
- **13 Interactive Islands**: Added EditQRForm for dynamic QR management

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
