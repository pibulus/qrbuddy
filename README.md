# 🌈 QRBuddy

> Everything the big QR platforms do — designed for print, never held hostage.

Drop a link. Watch it bloom. QRBuddy is a full-stack QR studio for businesses,
restaurants, agencies, designers, and makers that replaces Bitly, QR Code
Monkey, and QR Tiger without dated black-and-white barcodes, mandatory account
walls, or $35/month hostage subscriptions.

## ✨ Features

- **Full-Stack QR Studio** - Create URLs, Wi-Fi cards, Contact Cards (vCard with
  live 20 mm density guard + 1-tap trim), WhatsApp triggers, Calendar events
  (`VEVENT`), Location/Maps pins (`geo:` & Maps), Social Bio Hubs, Media Hubs,
  Phone/SMS/Email triggers, and Plain Text from one smart input bar
- **Print-Verified Design Engine & Transparent Ground** - Luminance-tested
  palettes (`<= 0.40` luminance), custom 2-stop linear/radial gradients,
  module/eye/centre-mark geometry, centre logo or monogram, optional alpha-0
  transparent background (classic + clean + unframed), palette-aware card
  labels, live contrast feedback, and 3000px PNG + vector SVG export
- **Print Artifacts (Ready for Tape & Laminator)** - Generate standalone
  bilingual **A6 Counter Signs**, **Foldable 2-Sided Table Tents**, and **15–50
  mm Size Proof Sheets** with a calibration ruler directly from your QR or Wi-Fi
  card
- **Looks** - Classic, Halftone (the artwork becomes the ink, at 4× the module
  grid) and Flat Foil / Riso Press. Every look preserves finder, timing and
  alignment patterns, holds a 4-module quiet zone, and is decoder-tested before
  it is offered. See `docs/LOOKS.md`
- **Smart Dynamic QR Codes & CSV Bulk Repoint** - Edit destinations and titles
  after printing (Postgres-synced across devices), route by time-of-day, split
  by iOS/Android or A/B weights, rotate sequential links, set scan caps/expiry,
  or round-trip edit your whole library with `↓ Export CSV` and `↑ Update CSV`
- **Branded Cover Pages & White-Label** - Add Warm Paper, Sunset Pop, or
  Midnight Ink cover pages with 1-click starters (Café Menu, Wi-Fi Card, Tip
  Jar, Event Check-in) and 1-click Passport White-Labeling
- **Passport Field Report 🛂** - 7d/30d/90d scan trends, Top Cities & Countries,
  24-hour Peak Rush Hour window, Browser & Device split, Track/Photo
  Leaderboard, and 1-click RFC-4180 CSV export (zero IP or raw User-Agent
  logging)
- **Agency Bulk / Batch ZIP & Sticker Sheets** - Paste multiple URLs (or
  `Label | URL` rows) inside the Creation Modal (`Bulk`) and export a single ZIP
  containing 1000px PNGs, vector SVGs (respecting transparent ground), printable
  A4/Letter sticker sheets, and `manifest.csv`
- **Daylight Media Drops & File Lockers** - Drop up to 10 photos for an
  auto-advancing gallery or audio tracks for a browser mixtape player (25 MB
  total on Passport, 365-day Passport retention), inbound File Collection
  Lockers, or up to 500 MB file drops with optional PIN & self-destruct limits
- **Street-Safe QR Inspector** - Scan any QR code to unroll up to 5 redirect
  hops, verify HTTPS, and inspect a live visual webpage preview before visiting
- **The QRBuddy Passport 🛂✨** - Cryptographic 4-word key & scannable QR card
  that syncs your library, titles, 365-day share durability, and paid status
  (`~$32 USD / A$49` for 365 days, zero auto-renewal) across laptop and phone
  with zero email/password sign-up
- **Bilingual Out of the Box** - Native English (`/`) and LatAm/Mexican Spanish
  (`/es`) across the studio, print artifacts, and vertical landing pages
  (`/for/wifi`, `/for/menus`, `/for/weddings`, `/for/music`, `/for/vcard`,
  `/for/lockers`, `/for/gs1`, `/for/inspect`, `/guide/printing`, `/compare`)

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
production bootstrap path. Supabase Edge Function deployment
(`supabase
functions deploy <name> --project-ref aqydpibnvlhcjcwosrti`) is
separate from the Fresh app.

Production runs on CHONK (`pibulus.local`, `qrbuddy.service` on port `8004`
behind Cloudflare Tunnel) via
`/home/pibulus/pibulus-os/scripts/deploy_app.sh
qrbuddy`, which builds the AOT
`_fresh/` manifest and stamps `/version.json`. See [CLAUDE.md](./CLAUDE.md) for
launch gates and deployment details.

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
│   ├── for/                  # Vertical landing pages (wifi, menus, weddings, music, vcard, lockers, gs1, inspect)
│   ├── guide/printing.tsx    # QR print calculator & anti-hostage guide
│   ├── compare.tsx / vs/     # Feature & pricing comparison pages
│   ├── developers.tsx        # Developer API v1 docs & interactive key manager
│   ├── q.tsx                 # Shared QR showcase
│   ├── edit.tsx              # Dynamic QR editor + Passport Field Report
│   ├── boom.tsx              # Self-destruct KABOOM landing page
│   ├── r.tsx                 # Dynamic QR redirector + branded Cover Pages
│   ├── f/[code].tsx          # File drop / slideshow / mixtape share page
│   ├── bucket/[code].tsx     # Inbound File Locker viewer
│   ├── note/[code].tsx       # Styled note card viewer
│   ├── v1/                   # Public REST API v1 endpoints
│   └── api/                  # Server-side endpoints (download-file.ts, peek.ts)
├── islands/              # Interactive Preact islands
│   ├── QRCanvas.tsx          # Core QR rendering + transparent ground + PNG/SVG/Print artifacts
│   ├── SmartInput.tsx        # Smart input (URLs/files/text + dynamic settings)
│   ├── EditQRForm.tsx        # Dynamic QR edit experience
│   ├── FileSlideshow.tsx     # Photo gallery & mixtape player viewer
│   ├── StyleSelector.tsx     # Gradient selector + custom creator entry
│   ├── PricingModal.tsx      # QRBuddy Passport checkout + Tactile Passport Card
│   ├── OwnerStrip.tsx        # Share owner bar + Passport Field Report analytics
│   ├── BucketQR.tsx          # File locker status + QR display
│   ├── QrPrintGuideIsland.tsx # Print calculator island
│   └── VerticalStudio.tsx    # Focused studio island for /for/* and /es/* verticals
├── components/           # Shared UI components (CreateModal, LibraryDrawer, QRReader, templates/, extras/, edit-qr/, smart-input/, create-modal/)
├── hooks/                # Custom Preact hooks (useBatchGenerator, useDynamicQR, useFileUpload, etc.)
├── local-api/            # Local mock Supabase edge function server for offline dev
├── supabase/             # Production schema migrations + Edge Functions
├── utils/                # Shared utilities (passport, qr-styles, print-artifacts, csv-repoint, svg-export, i18n, etc.)
├── types/                # Shared TypeScript interfaces
├── static/               # Fleet Standard PWA icons, manifest, robots, sitemap, WASM
├── tests/                # Offline unit suite (deno task test:unit) + audit gates
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

QRBuddy production runs on **CHONK** (`pibulus.local`, `qrbuddy.service` on port
`8004` behind Cloudflare Tunnel) and Supabase (`aqydpibnvlhcjcwosrti`):

```bash
# 1. Ship app code to CHONK after pushing main:
git push origin main
ssh pibulus@pibulus.local '/home/pibulus/pibulus-os/scripts/deploy_app.sh qrbuddy'

# 2. Deploy modified Edge Functions separately (when supabase/functions/* changed):
supabase functions deploy <fn-name> --project-ref aqydpibnvlhcjcwosrti
```

For a standalone self-hosted run, build Fresh before starting the server:

```bash
deno task build
deno run -A main.ts
```

Keep `APP_URL`, `SUPABASE_URL`, and `SUPABASE_ANON_KEY` in the app runtime
environment, and keep `SUPABASE_SERVICE_ROLE_KEY` exclusively in Supabase
function secrets.

## 📝 License

MIT - Do whatever makes you happy!

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 💫 Credits

Built with 🧁 by Pablo (@pibulus)

---

_"The best QR codes feel like magic but work like clockwork"_ 🕰️
