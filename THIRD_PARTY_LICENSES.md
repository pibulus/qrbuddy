# Third-party licences

QRBuddy ships its own QR geometry and styling engine. A few external projects
informed the design of the **Looks** layer (`utils/qr-art-renderers.ts`). This
file records what came from where, so a licence question never has to be
answered from memory.

## Shipped runtime dependencies

| Package                                                                 | Version | Licence    |
| ----------------------------------------------------------------------- | ------- | ---------- |
| [`qrcode-generator`](https://github.com/kazuhikoarase/qrcode-generator) | 1.5.0   | MIT        |
| [`qr-code-styling`](https://github.com/kozakdenys/qr-code-styling)      | 1.9.2   | MIT        |
| [`zxing-wasm`](https://github.com/Sec-ant/zxing-wasm)                   | 2.1.2   | MIT        |
| [`jsqr`](https://github.com/cozmo/jsQR)                                 | 1.4.0   | Apache-2.0 |

## Ideas ported — no code copied verbatim

### `react-qrbtf` — MIT

<https://github.com/CPunisher/react-qrbtf>

```
MIT License

Copyright (c) 2020 CPunisher

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

Used as the geometric reference for two Looks:

- **Flat Foil** began as a direct port of `QR25D`'s isometric matrix
  (`[-√3/2, ½]`, `[√3/2, ½]`, `skewX/skewY(45)` for the side faces). That
  version **is not shipped**: it failed the decoder gate at 250px on every
  render size. The shipped foil keeps the flat, readable code and moves the
  thickness into a lofted slab. The isometric maths is gone; the intent is not.
- **Sticker** follows the `QRImage` idea of drawing artwork behind the modules
  while the function patterns stay legible, with QRBuddy's own protector logic,
  die-cut paths and quiet-zone maths.

No `react-qrbtf` source is vendored, and no React dependency is installed.

### `Awesome-qr.js` — Apache-2.0

<https://github.com/sumimakito/Awesome-qr.js>

Technical reference only for background dimming and the idea of component-level
"protectors" around timing and alignment patterns. No code or assets copied, so
no `NOTICE` file is required; the credit is recorded here because the borrowing
is conceptual and worth naming.

### `latentcat/qrbtf` — GPL-3.0

<https://github.com/latentcat/qrbtf>

Visual reference only. Never copied, never linked, never bundled. QRBuddy is MIT
with additional terms; GPL code does not enter this repository.

### `lyqht/mini-qr` — GPL-3.0

Studied for frame and preset ideas. No code, CSS or preset JSON is copied.

## What is QRBuddy's own

- the module matrix, finder/timing/alignment protection, quiet-zone maths and
  the decoder gate are already QRBuddy's (see `utils/qr-vector-svg.ts`,
  `utils/qr-decode.ts`)
- the Pocket look, the DMG tone set, the die-cut shapes, the kiss-cut line, the
  lofted slab and the Looks gallery are original to this repository
- no brand marks, presets or trademarks from other generators are included
