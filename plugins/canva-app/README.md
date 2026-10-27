# 🎨 QRBuddy Studio for Canva (Apps SDK v2)

Ready-to-ship Canva sidebar plugin for **QRBuddy** (`https://qrbuddy.app`).

## Why This Exists
Canva's native QR generator only produces black-and-white static squares with zero dynamic editing and zero print-verified gradients. QRBuddy for Canva lets 190M+ Canva designers drop **true Vector SVG 1.1 gradient QR codes** and **editable dynamic short links** straight onto menus, flyers, wedding invites, and packaging.

## Canva App Review Compliance Built In
1. **Zero-Server Static SVGs**: Uses `@canva/asset` `upload({ mimeType: "image/svg+xml", url: dataUrl, aiDisclosure: "none" })` with in-memory Base64 SVG 1.1 strings (`< 25 KB`, explicit `width`/`height`, zero `<script>` or external `<image>` tags).
2. **Explicit Brand Attribution**: Upgrade CTA is labeled **`Get QRBuddy Passport`** (never generic `"Upgrade to Pro"`).
3. **Visible Monetization Status Bar**: Displays current tier (`Free Tier · 5 Editable QRs` vs `🛂 Passport Linked`) at the top of the panel.
4. **Sandboxed External Links**: Uses `requestOpenExternalUrl({ url })` from `@canva/platform` (never `window.open()`).

## Quick Start & Upload
```bash
npm install -g @canva/cli@latest
canva login
npm install
npm start       # Live-reloads inside the real Canva editor
npm run upload  # Bundles and submits to Canva Developer Portal
```
