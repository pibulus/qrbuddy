# 🌈 QRBuddy

> The Porkbun of QR generators - beautiful gradient QR codes that make you smile

Drop a link. Watch it bloom. QRBuddy transforms boring QR codes into stunning
gradient art pieces with that soft brutal aesthetic.

## ✨ Features

- **Smart Input** - Paste URLs, type text, or drop files - it just works
- **Destructible QRs** 💣 - One-time QR codes (URLs or files) that self-destruct
  after 1 scan → KABOOM!
- **Dynamic QR Codes** 🔗 - Privacy-first editable redirects with scan limits
  (no IPs or raw user agents logged — just coarse scan stats for your own
  dashboard)
- **File Locker** 🔐 - Reusable or one-shot QR lockers for passing files, text,
  and links
- **Scan Limits** - Set 1, 5, 10, 100, or unlimited scans before self-destruct
- **Expiry Dates** - Optional time-based QR expiration
- **Edit Anytime** - Change destination URL without reprinting QR (works for
  both URLs and files)
- **Multi-File Shares** - Image sets preview as a slideshow; finite shares
  download as one zip so one file cannot consume the whole set
- **7 Gradient Styles** - Sunset, Pool, Terminal, Candy, Vapor, Classic, and
  Brutalist themes
- **Custom Gradient Creator** - Build your own gradient QR codes
- **Instant Generation** - <100ms QR generation with no loading states
- **Download & Copy** - Save PNG/SVG files or copy text with a separate action
- **Mobile First** - Responsive design that works beautifully on all devices
- **Soft Brutal Design** - Chunky borders, hard shadows, pastel colors
- **Error Handling** - Graceful degradation with helpful error messages
- **KABOOM Page** - Spectacular explosion page for already-scanned files

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
│   ├── index.tsx             # Main generator page + SEO/meta
│   ├── q.tsx                 # Shared QR showcase
│   ├── edit.tsx              # Dynamic QR editor
│   ├── boom.tsx              # Self-destruct landing page
│   ├── go.tsx                # Free-tier redirect interstitial
│   ├── r.tsx / r/[code].tsx  # Redirect helpers
│   ├── f/[code].tsx          # Destructible file download gate
│   ├── bucket/[code].tsx     # File locker viewer
│   └── api/download-file.ts  # Server-side file proxy
├── islands/              # Interactive Preact islands
│   ├── QRCanvas.tsx          # Core QR rendering + PNG/SVG export
│   ├── SmartInput.tsx        # Smart input (URLs/files/text + dynamic settings)
│   ├── StyleSelector.tsx     # Gradient selector + custom creator entry
│   ├── GradientCreator.tsx   # Custom gradient builder modal
│   ├── CreateModal.tsx       # QR type/options/design creation sheet
│   ├── LogoUploader.tsx      # Center logo uploader UI
│   ├── ActionButtons.tsx     # Download + copy triggers
│   ├── EditQRForm.tsx        # Dynamic QR edit experience
│   ├── BucketQR.tsx          # File locker status + QR display
│   ├── About/Kofi/Pricing modals
│   ├── EasterEggs.tsx        # Hidden interactions
│   ├── ToastManager.tsx      # Notification stack
│   ├── ErrorBoundary.tsx     # QR error guard
│   ├── Analytics.tsx         # Umami event tracking
│   ├── edit-qr/             # Dynamic QR edit sub-islands (4)
│   ├── extras/              # Options/design sub-islands (7)
│   ├── smart-input/         # Input toolbar sub-islands (2)
│   └── templates/           # QR type form sub-islands (7)
├── local-api/            # Local mock Supabase edge function server
│   └── server.ts             # Upload + dynamic QR emulator for dev
├── supabase/             # Production schema + edge functions
│   ├── setup.sql             # Historical one-shot schema snapshot
│   ├── migrations/           # Historical + incremental production migrations
│   └── functions/            # Edge function entry points + shared helpers
├── utils/                # Shared utilities
│   ├── api.ts                # SUPABASE_URL + auth header helpers
│   ├── api-request.ts        # Shared JSON/FormData request helpers
│   ├── constants.ts          # Shared scan/progress/timing constants
│   ├── file-validation.ts    # Client-side upload validation
│   ├── haptics.ts            # Haptic wrappers
│   ├── qr-styles.ts          # Gradient style definitions
│   └── sounds.ts             # UI soundboard
├── types/                # Shared ambient/runtime type declarations
├── static/               # Icons, manifest, robots, sitemap, CSS
├── tests/                # Offline unit tests + opt-in edge integrations
└── tailwind.config.ts    # Tailwind design tokens/theme
```

## 🎨 Available Styles

- **Sunset** 🌅 - Warm gradient from peach to pink to purple
- **Pool** 💧 - Cool aqua blues and teals
- **Terminal** 💻 - Classic green on black hacker aesthetic
- **Candy** 🍬 - Playful pink, gold, and teal
- **Vapor** 🌫️ - Vaporwave magenta and cyan
- **Classic** ⬜ - Near-black on off-white (the `noir` key)
- **Brutalist** ⬛ - Bold black on yellow

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
