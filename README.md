# 🌈 QRBuddy

> The Porkbun of QR generators - beautiful gradient QR codes that make you smile

Drop a link. Watch it bloom. QRBuddy transforms boring QR codes into stunning
gradient art pieces with that soft brutal aesthetic.

## ✨ Features

- **Smart Input** - Paste URLs, type text, or drop files - it just works
- **Destructible Files** 💣 - Upload files that self-destruct after 1 scan
- **6 Gradient Styles** - Sunset, Pool, Terminal, Candy, Vapor, and Brutalist
  themes
- **Custom Gradient Creator** - Build your own gradient QR codes
- **Instant Generation** - <100ms QR generation with no loading states
- **Shuffle Magic** - One-tap randomization with spring physics animation
- **Download & Copy** - Save PNGs or copy to clipboard with one click
- **Keyboard Shortcuts** - s (shuffle), d (download), c (copy)
- **Mobile First** - Responsive design that works beautifully on all devices
- **Soft Brutal Design** - Chunky borders, hard shadows, pastel colors
- **Error Handling** - Graceful degradation with helpful error messages
- **KABOOM Page** - Spectacular explosion page for already-scanned files

## 🚀 Quick Start

```bash
# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# Clone the repository
git clone https://github.com/pibulus/qrbuddy.git
cd qrbuddy

# Set up environment variables (for destructible files)
cp .env.example .env
# Edit .env with your Supabase credentials

# Start the development server
deno task start
```

Visit http://localhost:8004 and start creating beautiful QR codes!

### Destructible Files Setup (Optional)

To enable self-destructing file QR codes:

1. Create a Supabase project at [supabase.com](https://supabase.com)
2. Run the SQL in `supabase/setup.sql` in your SQL Editor
3. Deploy edge functions: `supabase functions deploy upload-file` and
   `supabase functions deploy get-file`
4. Add your Supabase credentials to `.env`

See `supabase/README.md` for detailed instructions.

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
├── islands/              # Interactive Preact components (12 total)
│   ├── QRCanvas.tsx          # Core QR rendering + download/copy
│   ├── URLInput.tsx          # URL entry with validation
│   ├── StylePills.tsx        # Style selector UI
│   ├── StyleSelector.tsx     # Style selection logic
│   ├── ShuffleButton.tsx     # Random style animation
│   ├── ShuffleAction.tsx     # Shuffle handler
│   ├── ActionButtons.tsx     # Download trigger
│   ├── KeyboardHandler.tsx   # Global shortcuts (s/d/c)
│   ├── GradientCreator.tsx   # Custom gradient builder
│   ├── EasterEggs.tsx        # Hidden features
│   ├── ToastManager.tsx      # Notification system
│   └── ErrorBoundary.tsx     # Error handling
├── routes/               # Fresh routes
│   ├── index.tsx             # Main page
│   └── q.tsx                 # QR code route
├── utils/                # Utilities
│   └── qr-styles.ts          # 6 gradient style definitions
├── static/               # Static assets
└── tailwind.config.ts    # Tailwind configuration
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
