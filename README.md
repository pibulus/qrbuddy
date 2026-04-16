# 🌈 QRBuddy

> The Porkbun of QR generators - beautiful gradient QR codes that make you smile

Drop a link. Watch it bloom. QRBuddy transforms boring QR codes into stunning
gradient art pieces with that soft brutal aesthetic.

## ✨ Features

- **Smart Input** - Paste URLs, type text, or drop files - it just works
- **Destructible QRs** 💣 - One-time QR codes (URLs or files) that self-destruct
  after 1 scan → KABOOM!
- **Dynamic QR Codes** 🔗 - Privacy-first editable redirects with scan limits
  (NO tracking/analytics)
- **Scan Limits** - Set 1, 5, 10, 100, or unlimited scans before self-destruct
- **Expiry Dates** - Optional time-based QR expiration
- **Edit Anytime** - Change destination URL without reprinting QR (works for
  both URLs and files)
- **6 Gradient Styles** - Sunset, Pool, Terminal, Candy, Vapor, and Brutalist
  themes
- **Custom Gradient Creator** - Build your own gradient QR codes
- **Instant Generation** - <100ms QR generation with no loading states
- **Download & Copy** - Save PNGs or copy to clipboard with one click
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

# Start the local mock API server (for destructible files + dynamic QRs)
deno task api

# In another terminal, start the Fresh dev server
deno task start
```

Visit **http://localhost:8004** and start creating beautiful QR codes!

The local API server runs on port 8005 and stores files in `local-api/files/`
(gitignored).

### 🎯 What Works Locally

- ✅ **Basic QR Codes** - All 6 gradient styles + custom gradients
- ✅ **Destructible QRs** - URLs or files that self-destruct after 1 scan
- ✅ **Dynamic QR Codes** - Editable redirects with scan limits & expiry (works
  for both URLs and files)
- ✅ **KABOOM Page** - Epic explosion when already accessed

### 🚀 Production Deployment (Supabase)

For production deployment with Supabase backend, see
**[SUPABASE-TODO.md](./docs/SUPABASE-TODO.md)** for the migration guide.

**TL;DR:**

1. Create Supabase project
2. Run `supabase/setup.sql` in SQL Editor
3. Deploy 11 edge functions
4. Set environment variables
5. Deploy Fresh app to Deno Deploy

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
│   ├── bucket/[code].tsx     # File bucket viewer
│   └── api/download-file.ts  # Server-side file proxy
├── islands/              # Interactive Preact islands (41 registered)
│   ├── QRCanvas.tsx          # Core QR rendering + download/copy logic
│   ├── SmartInput.tsx        # Smart input (URLs/files/text + dynamic settings)
│   ├── StyleSelector.tsx     # Gradient selector + custom creator entry
│   ├── GradientCreator.tsx   # Custom gradient builder modal
│   ├── TemplateModal.tsx     # WiFi/vCard/SMS/Email/Text helpers
│   ├── ExtrasModal.tsx       # File buckets, destructible goodies, logos
│   ├── LogoUploader.tsx      # Center logo uploader UI
│   ├── ActionButtons.tsx     # Download + copy triggers
│   ├── EditQRForm.tsx        # Dynamic QR edit experience
│   ├── BucketQR.tsx          # File bucket status + QR display
│   ├── About/Kofi/Pricing modals
│   ├── EasterEggs.tsx        # Hidden interactions
│   ├── ToastManager.tsx      # Notification stack
│   ├── ErrorBoundary.tsx     # QR error guard
│   ├── Analytics.tsx         # PostHog wiring
│   ├── edit-qr/             # Dynamic QR edit sub-islands (4)
│   ├── extras/              # Extras modal sub-islands (7)
│   ├── smart-input/         # Input toolbar sub-islands (2)
│   └── templates/           # Template form sub-islands (7)
├── local-api/            # Local mock Supabase edge function server
│   └── server.ts             # Upload + dynamic QR emulator for dev
├── supabase/             # Production schema + edge functions
│   ├── setup.sql             # Core tables
│   └── functions/            # 13 edge functions
├── utils/                # Shared utilities
│   ├── api.ts                # SUPABASE_URL + API helpers
│   ├── haptics.ts            # Haptic wrappers
│   ├── qr-styles.ts          # Gradient style definitions
│   └── sounds.ts             # UI soundboard
├── static/               # Icons, manifest, robots, sitemap, CSS
├── tests/                # Edge function integration tests
└── tailwind.config.ts    # Tailwind design tokens/theme
```

## 🎨 Available Styles

- **Sunset** 🌅 - Warm gradient from peach to pink to purple
- **Pool** 💧 - Cool aqua blues and teals
- **Terminal** 💻 - Classic green on black hacker aesthetic
- **Candy** 🍬 - Playful pink, gold, and teal
- **Vapor** 🌫️ - Vaporwave magenta and cyan
- **Brutalist** ⬛ - Bold black on yellow

## 🏃‍♂️ Development

```bash
# Format code
deno fmt

# Lint code
deno lint

# Type check
deno check **/*.ts **/*.tsx

# Build for production
deno task build
```

## 🚢 Deployment

QRBuddy can be deployed to any platform that supports Deno:

### Deno Deploy (Recommended)

1. Push to GitHub
2. Connect to [Deno Deploy](https://deno.com/deploy)
3. Deploy with zero config

### Self-Hosted

```bash
deno task build
deno run -A main.ts
```

## 📝 License

MIT - Do whatever makes you happy!

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 💫 Credits

Built with 🧁 by Pablo (@pibulus)

---

_"The best QR codes feel like magic but work like clockwork"_ 🕰️
