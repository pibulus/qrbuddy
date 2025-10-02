# 🔧 TINKER.md - QRBuddy Quick Reference

_For when you haven't touched this in 6 months and need to change something NOW_

**ADHD MODE**: Jump to [QUICK WINS](#-quick-wins---80-of-what-youll-change) or
[WHEN SHIT BREAKS](#-when-shit-breaks---top-3-fixes)

---

## 🚀 START HERE - RUN THE DAMN THING

### Dev Mode

```bash
# STACK: DENO/FRESH
deno task start
# Opens: http://localhost:8004
```

### Production Build

```bash
deno task build
deno task preview
```

### Health Check

```bash
deno task check    # Format, lint, type check
```

---

## 📁 FILE MAP - WHERE SHIT LIVES

```
qrbuddy/
├── routes/
│   ├── index.tsx           # Main QR generator page
│   ├── q.tsx              # Quick QR shortlink route
│   └── _app.tsx           # App wrapper
├── islands/
│   ├── QRCanvas.tsx       # THE MAGIC - renders QR codes
│   ├── URLInput.tsx       # URL input field
│   ├── StyleSelector.tsx  # Gradient style picker
│   ├── ActionButtons.tsx  # Download/Copy buttons
│   └── ShuffleAction.tsx  # Random style shuffle
├── utils/
│   └── qr-styles.ts       # All gradient presets
└── static/               # Images, CSS, manifest
```

### The Files You'll Actually Touch:

1. **routes/index.tsx** - Main page layout and copy (line 25: title, line 28:
   description)
2. **utils/qr-styles.ts** - QR gradient presets (add/edit colors here)
3. **islands/StyleSelector.tsx** - Style picker UI
4. **islands/QRCanvas.tsx** - QR rendering logic
5. **tailwind.config.ts** - Colors and theme

---

## 🎯 QUICK WINS - 80% OF WHAT YOU'LL CHANGE

### 1. Change the Main Text/Copy

```
File: routes/index.tsx
Line 25: <title>QRBuddy - Drop a link. Watch it bloom.</title>
Line 28: content="The Porkbun of QR generators..."
What: Change tagline, description, meta tags
```

### 2. Add/Change QR Gradient Styles

```
File: utils/qr-styles.ts
Line 1: export const QR_STYLES = {
Current styles: sunset, pool, terminal, candy, vapor, brutalist

Add new style (copy any existing and modify):
  mystyle: {
    dots: {
      type: "gradient",
      gradient: {
        type: "linear" as const,  // or "radial"
        rotation: 45,
        colorStops: [
          { offset: 0, color: "#FF00FF" },
          { offset: 1, color: "#00FFFF" },
        ],
      },
    },
    background: {
      color: "#FFFFFF",  // or gradient like dots
    },
    cornersSquare: {
      color: "#FF00FF",  // or gradient
    },
    cornersDot: {
      color: "#00FFFF",
    },
  },

Style appears automatically in picker - no other changes needed!
```

### 3. Change Colors/Theme

```
File: tailwind.config.ts
Line 91-122: colors: { qr: { ... } }
Current colors (used in UI, not QR codes):
- qr-sunset1: "#FFE5B4", qr-sunset2: "#FF69B4", qr-sunset3: "#9370DB"
- qr-pool1: "#87CEEB", qr-pool2: "#4ECDC4", qr-pool3: "#B0E0E6"
- qr-terminal: "#00FF41", qr-terminalBg: "#0A0A0A"
- qr-candy1: "#FF69B4", qr-candy2: "#FFD700", qr-candy3: "#4ECDC4"
- qr-vapor1: "#FF00FF", qr-vapor2: "#00FFFF"
- qr-brutal: "#000000", qr-brutalBg: "#FFFF00"
- qr-cream: "#FFF8F0"

Add your own: qr-mycolor: "#HEX"
Used in: background classes, style pill colors
```

### 4. Change Default QR Style

```
File: routes/index.tsx
Line 16: const style = useSignal<keyof typeof QR_STYLES | 'custom'>("sunset");
Current: "sunset"
Change to: "pool", "terminal", "candy", "vapor", or "brutalist"
(Must match a key from utils/qr-styles.ts)
```

---

## 🔧 COMMON TWEAKS

### Add a New QR Gradient Preset

```bash
# 1. Open utils/qr-styles.ts
# 2. Add new style to QR_STYLES object:
newstyle: {
  name: "New Style",
  gradient: ["#START_COLOR", "#END_COLOR"],
  dots: "#DOT_COLOR",
  corners: "#CORNER_COLOR"  // optional
}
# 3. Style automatically appears in picker
```

### Change Port

```bash
File: deno.json
Line 8: "start": "PORT=8004 deno run..."
Change: PORT=8004 → PORT=3000
```

### Modify Download Filename

```bash
File: islands/ActionButtons.tsx
Look for: qrbuddy-qr.png or similar
Change to: your-desired-filename.png
```

### Change Theme Color

```bash
File: routes/index.tsx
Line 37: <meta name="theme-color" content="#FF69B4" />
Change: #FF69B4 → your hex color
```

### Toggle Easter Eggs On/Off

```bash
File: routes/index.tsx
Look for: <EasterEggs />
Comment out: {/* <EasterEggs /> */}
```

---

## 💥 WHEN SHIT BREAKS - TOP 3 FIXES

### 1. Port Already in Use

```bash
# Find what's using port 8004:
lsof -i :8004

# Kill it:
kill -9 PID_NUMBER

# Or just change port in deno.json
```

### 2. QR Code Not Generating

```bash
# Check browser console for errors
# Common issues:
# - Invalid URL format
# - Missing qr-code-styling library

# Fix dependencies:
rm deno.lock
deno cache --reload dev.ts
deno task start
```

### 3. Build Fails

```bash
# Clean everything:
rm -rf _fresh node_modules deno.lock

# Try again:
deno task start
```

---

## 🚦 DEPLOYMENT - SHIP IT

### One-Liner Deploy

```bash
# DENO DEPLOY (already configured)
deployctl deploy --prod --project=fff4f21f-dab0-46f0-aa13-ea22dd20be78

# Or using token:
deployctl deploy --production --token=$DENO_DEPLOY_TOKEN
```

### Manual Deploy Steps

1. Build it: `deno task build`
2. Test it: `deno task preview`
3. Push it: `git push origin main`
4. Deploy: `deployctl deploy --prod`

**Note**: Project ID is in deno.json (deploy.project) - commit it after first
deploy!

---

## 🎨 QR STYLES CHEAT SHEET

Current gradient presets (in `utils/qr-styles.ts` lines 1-174):

- **sunset** (line 2) - Pink/orange/purple gradient (#FFE5B4 → #FF69B4 →
  #9370DB)
- **pool** (line 50) - Aqua radial gradient (#87CEEB → #4ECDC4 → #3AA8A4)
- **terminal** (line 81) - Matrix green on black (#00FF41 on #0A0A0A)
- **candy** (line 96) - Rainbow candy (#FF69B4 → #FFD700 → #4ECDC4)
- **vapor** (line 129) - Vaporwave magenta/cyan (#FF00FF ↔ #00FFFF)
- **brutalist** (line 160) - Black on yellow (#000000 on #FFFF00)

Each style has 4 properties:

1. **dots** - QR code dots (can be gradient or solid color)
2. **background** - Background (can be gradient or solid)
3. **cornersSquare** - Three corner squares
4. **cornersDot** - Three corner dots inside squares

To add: Copy any style block (lines 2-48 for example), rename key, modify
colors.

---

## 📝 NOTES FOR FUTURE PABLO

- **Architecture**: Island-based (Fresh) - islands/ = interactive, routes/ =
  static
- **State management**: Preact signals (not React state!)
  - `url`, `style`, `triggerDownload`, `triggerCopy` passed from
    routes/index.tsx
  - Islands watch signals via useEffect
- **QR library**: `qr-code-styling@1.6.0-rc.1` (supports gradients!)
- **Keyboard shortcuts**: KeyboardHandler.tsx island
  - `s` = shuffle style
  - `d` or `Cmd+S` = download
  - `c` or `Cmd+C` = copy to clipboard
- **Animations**: Custom Tailwind keyframes (lines 28-88 in tailwind.config.ts)
  - squish, rotate-shuffle, float, pop, shake, etc.
- **No build step**: Fresh uses JIT compilation
- **PWA ready**: manifest.json in static/

### Pablo's Project Quirks:

- Port 8004 (not 8000) to avoid Fresh app conflicts
- Easter eggs island (islands/EasterEggs.tsx) - hidden animations
- Style names must match exactly between qr-styles.ts and tailwind colors
- Chunky brutalist aesthetic: boxShadow chunky, borderRadius chunky
  (tailwind.config.ts lines 125-133)
- Fresh uses Preact not React - import from "preact" not "react"

---

## 🎸 TLDR - COPY PASTE ZONE

```bash
# Start working
deno task start

# Add new gradient style
# Edit: utils/qr-styles.ts

# Change copy/text
# Edit: routes/index.tsx (line 25+)

# Ship it
deployctl deploy --prod

# When broken
rm -rf _fresh deno.lock
deno task start
```

**Quick paths:**

- Text/copy: `routes/index.tsx` (lines 25-34)
- QR styles: `utils/qr-styles.ts`
- Colors: `tailwind.config.ts`
- Main logic: `islands/QRCanvas.tsx`

---

_Generated for QRBuddy - Drop a link. Watch it bloom. 🌸_
