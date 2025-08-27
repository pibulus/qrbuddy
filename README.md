# 🌈 QRBuddy

> The Porkbun of QR generators - beautiful gradient QR codes that make you smile

Drop a link. Watch it bloom. QRBuddy transforms boring QR codes into stunning
gradient art pieces with that soft brutal aesthetic.

## ✨ Features

- **6 Gradient Styles** - Sunset, Pool, Terminal, Candy, Vapor, and Brutalist
  themes
- **Instant Generation** - <100ms QR generation with no loading states
- **Shuffle Magic** - One-tap randomization with spring physics animation
- **Download Ready** - Save high-quality PNGs with a single click
- **Mobile First** - Responsive design that works beautifully on all devices
- **Soft Brutal Design** - Chunky borders, hard shadows, pastel colors

## 🚀 Quick Start

```bash
# Install Deno (if not already installed)
curl -fsSL https://deno.land/install.sh | sh

# Clone the repository
git clone https://github.com/pibulus/qrbuddy.git
cd qrbuddy

# Start the development server
deno task start
```

Visit http://localhost:8000 and start creating beautiful QR codes!

## 🛠 Tech Stack

- **[Fresh](https://fresh.deno.dev)** - The next-gen web framework
- **[Deno](https://deno.land)** - Modern runtime for JavaScript and TypeScript
- **[Preact](https://preactjs.com)** - Fast 3kB alternative to React
- **[Twind](https://twind.dev)** - Runtime Tailwind CSS
- **[qr-code-styling](https://github.com/kozakdenys/qr-code-styling)** -
  Gradient QR generation

## 📁 Project Structure

```
qrbuddy/
├── islands/          # Interactive Preact components
│   ├── QRCanvas.tsx      # Main QR display (400x400)
│   ├── ShuffleButton.tsx # Primary interaction
│   ├── URLInput.tsx      # Clean input field
│   ├── ActionButtons.tsx # Save button
│   └── StylePills.tsx    # Style selector pills
├── routes/           # Fresh routes
│   └── index.tsx         # Main page
├── utils/            # Utilities
│   └── qr-styles.ts      # Style definitions
├── static/           # Static assets
└── twind.config.ts   # Tailwind configuration
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
