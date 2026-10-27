# 🌈 QRBuddy

> Everything the big QR platforms do — designed for print, never held hostage.

Drop a link. Watch it bloom. QRBuddy is a full-stack QR studio for businesses,
restaurants, agencies, designers, and makers that replaces Bitly, QR Code
Monkey, and QR Tiger without dated black-and-white barcodes, mandatory account
walls, or $35/month hostage subscriptions.

## ✨ Features

- **Full-Stack QR Studio** - Create URLs, Wi-Fi cards, Contact Cards (vCard),
  Social Bio Hubs, Media Hubs, Phone/SMS/Email triggers, and Plain Text from one
  smart auto-detecting input bar
- **Print-Verified Design Engine** - 8 luminance-tested gradient palettes (≤
  0.40 contrast), custom 2-stop linear/radial gradients, dot & corner geometry,
  center logo stamp, SCAN ME frames, live WCAG contrast badge, and 3000px PNG +
  vector SVG export
- **Smart Dynamic QR Codes** - Edit destinations after printing, route by
  time-of-day (Breakfast/Lunch/Dinner menus), split by iOS/Android or A/B
  weights, rotate sequential links, or set scan caps and expiration dates
- **Branded Cover Pages & White-Label** - Add Warm Paper, Sunset Pop, or
  Midnight Ink cover pages with 1-click starters (Café Menu, Wi-Fi Card, Tip
  Jar, Event Check-in) and 1-click Passport White-Labeling
- **Passport Field Report 🛂** - 7d/30d/90d scan trends, Top Cities & Countries,
  24-hour Peak Rush Hour window, Browser & Device split, Track/Photo
  Leaderboard, and 1-click RFC-4180 CSV export (zero IP or raw User-Agent
  logging)
- **Agency Bulk / Batch ZIP Generator** - Paste multiple URLs (or `Label | URL`
  rows) and export a single ZIP containing 1000px PNGs, vector SVGs, and a
  print-shop `manifest.csv`
- **Daylight Media Drops & File Lockers** - Drop up to 10 photos for an
  auto-advancing gallery, up to 10 audio tracks for a browser mixtape player,
  inbound File Collection Lockers, or up to 500 MB file drops with optional PIN
  & self-destruct limits
- **Street-Safe QR Inspector** - Scan any QR code to unroll up to 5 redirect
  hops, verify HTTPS, and inspect a live visual webpage preview before visiting
- **The QRBuddy Passport 🛂✨** - Cryptographic 4-word key & scannable QR card
  that syncs your library and paid status (`~$32 USD / A$49` for 365 days, zero
  auto-renewal) across laptop and phone with zero email/password sign-up
- **Bilingual Out of the Box** - Native English (`/`) and LatAm/Mexican Spanish
  (`/es`) across the studio and vertical landing pages (`/for/menus`,
  `/for/weddings`, `/for/music`, `/for/lockers`, `/guide/printing`)

## 🚀 Quick Start (Local Development)

```bash
# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# Clone the repository
git clone https://github.com/pibulus/qrbuddy.git
cd qrbuddy

# Start the Fresh dev server
deno task start

# Optional: in another terminal, start the local mock API server
# for basic destructible file + dynamic QR development without Supabase
deno task api
```

Visit **http://localhost:8004** and start creating beautiful QR codes!

The local API server runs on port 8005 and stores files in `local-api/files/`
(gitignored). It is a convenience mock, not full production parity: File Locker
and Supabase security/RPC behavior should be tested against Supabase.

### 🎯 What Works Locally

- ✅ **Basic QR Codes** - All 8 gradient styles + custom gradients
- ✅ **Destructible QRs** - Basic URL/file flows through the local mock API
- ✅ **Dynamic QR Codes** - Editable redirects with scan limits & expiry (works
  through the local mock API)
- ✅ **KABOOM Page** - Epic explosion when already accessed
- ⚠️ **File Locker** - Requires Supabase edge functions for realistic testing

### Production Setup

Supabase schema and function operations are documented in
[supabase/README.md](./supabase/README.md). Use the ordered migrations as the
schema source of truth; `supabase/setup.sql` is a historical snapshot, not a
production bootstrap path. Supabase deployment is separate from the Fresh app.

Fresh production deploys use the Git-connected Deno Deploy build: pushing the
authorized `main` commit runs checks, offline unit tests, and `deno task build`
before the app is routed. Any failure stops that deployment. Do not upload a
local build with `deployctl` or `deno deploy`; `_fresh/` is generated and
ignored by Git. See [CLAUDE.md](./CLAUDE.md) for the release contract and
current audit links.

## 🛠 Tech Stack

- **[Fresh](https://fresh.deno.dev)** - The next-gen web framework
- **[Deno](https://deno.land)** - Modern runtime for JavaScript and TypeScript
- **[Preact](https://preactjs.com)** - Fast 3kB alternative to React
- **[Tailwind CSS](https://tailwindcss.com)** - Utility-first CSS framework
- **[qr-code-styling](https://github.com/kozakdenys/qr-code-styling)** -
  Gradient QR generation

## 📁 Project Structure

```
qrbuddy/
├── routes/               # Fresh routes + API handlers
│   ├── index.tsx             # English studio + SEO/JSON-LD
│   ├── es/                   # Buena Onda Spanish studio (/es) + verticals
│   ├── for/                  # English vertical landing pages (menus, weddings, music, lockers)
│   ├── guide/printing.tsx    # QR print calculator & anti-hostage guide
│   ├── q.tsx                 # Shared QR showcase
│   ├── edit.tsx              # Dynamic QR editor + Passport Field Report
│   ├── boom.tsx              # Self-destruct KABOOM landing page
│   ├── r.tsx                 # Dynamic QR redirector + branded Cover Pages
│   ├── f/[code].tsx          # File drop / slideshow / mixtape share page
│   ├── bucket/[code].tsx     # Inbound File Locker viewer
│   ├── note/[code].tsx       # Styled note card viewer
│   └── api/                  # Server-side endpoints (download-file.ts, peek.ts)
├── islands/              # Interactive Preact islands
│   ├── QRCanvas.tsx          # Core QR rendering + 3000px PNG/vector SVG export
│   ├── SmartInput.tsx        # Smart input (URLs/files/text + dynamic settings)
│   ├── QRReader.tsx          # 1080p camera QR scanner + Street-Safe Inspector
│   ├── StyleSelector.tsx     # Gradient selector + custom creator entry
│   ├── GradientCreator.tsx   # Custom gradient builder modal
│   ├── CreateModal.tsx       # QR type/options/design creation sheet
│   ├── PricingModal.tsx      # QRBuddy Passport checkout + Tactile Passport Card
│   ├── LibraryDrawer.tsx     # Unified local + server QR Library & 4-word sync
│   ├── HistoryDrawer.tsx     # Local QR history & encrypted backup drawer
│   ├── OwnerStrip.tsx        # Share owner bar + Passport Field Report analytics
│   ├── EditQRForm.tsx        # Dynamic QR edit experience
│   ├── BucketQR.tsx          # File locker status + QR display
│   ├── edit-qr/              # Dynamic QR edit & analytics sub-islands
│   ├── extras/               # Options/design sub-islands (Batch, Routing, Splash, etc.)
│   ├── smart-input/          # Input toolbar sub-islands
│   └── templates/            # QR type form sub-islands
├── components/           # Server-rendered shared components (VerticalLandingHead)
├── hooks/                # Custom Preact hooks (useBatchGenerator, useDynamicQR, etc.)
├── local-api/            # Local mock Supabase edge function server for offline dev
├── supabase/             # Production schema migrations + Edge Functions
├── utils/                # Shared utilities (passport, qr-styles, qr-decode, i18n, etc.)
├── types/                # Shared TypeScript interfaces
├── static/               # Fleet Standard PWA icons, manifest, robots, sitemap, WASM
├── tests/                # 107 offline unit tests + opt-in edge integrations
└── tailwind.config.ts    # Soft Neo-Toybrut design tokens/theme
```

## 🎨 Available Styles (Luminance-Locked ≤ 0.40 for Print & Camera Reliability)

- **Sunset** 🌅 — Warm coral-pink to deep plum
- **Candy** 🍬 — Vibrant magenta to electric indigo
- **Blush** 🌸 — Rose-crimson to warm berry
- **Matcha** 🍵 — Deep forest emerald to botanical pine
- **Pool** 💧 — Ocean teal to deep navy
- **Vapor** 🌫️ — Neon violet to midnight cyber-blue
- **Grape** 🍇 — Royal amethyst to deep mulberry
- **Licorice** 🖤 — Warm espresso-black (`#1e1714`) high-contrast classic

## 🏃‍♂️ Development

```bash
# Format code
deno fmt

# Lint code
deno lint

# Type check
deno check **/*.ts **/*.tsx

# Run explicit offline unit tests (no network permission)
deno task test:unit

# Build for production
deno task build
```

## 📚 Documentation

- [CLAUDE.md](./CLAUDE.md) - agent/developer contract and architecture notes
- [GLOSSARY.md](./GLOSSARY.md) - component and concept glossary
- [docs/README.md](./docs/README.md) - documentation index and status labels
- [supabase/README.md](./supabase/README.md) - current backend setup and
  semantics
- [tests/README.md](./tests/README.md) - integration test guide

## 🚢 Deployment

QRBuddy production is connected to the Deno Deploy Git build. An authorized push
to `main` runs the configured Fresh AOT build and deploys its output. Keep
`APP_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` in the Deno Deploy app
configuration. Keep the service-role key only in Supabase function secrets.

For a self-hosted deployment, build Fresh before starting the server:

```bash
deno task build
deno run -A main.ts
```

Do not upload a local checkout directly with `deployctl` or `deno deploy`; the
production Git integration supplies the generated Fresh manifest.

## 📝 License

MIT - Do whatever makes you happy!

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 💫 Credits

Built with 🧁 by Pablo (@pibulus)

---

_"The best QR codes feel like magic but work like clockwork"_ 🕰️
