# Home stage + card kit pass — 2026-11-01

One session, three jobs: retire the random-colour dice, put every info dialog on
one card kit, and make the controls under the QR read like a tool instead of a
pill with a joke on it. This is the "why" behind the rules that now live in
`CLAUDE.md` → Design System → Layout & Surface Rules.

## 1. The dice is gone

`islands/StyleSelector.tsx` lost the 🎲 roller, its 24 `CURATED_HARMONIC_PAIRS`,
the off-DOM `QRCodeStyling` scan-probe loop and the "Nat 20 energy" quips (426 →
~190 lines). It ate top-rail space and the rolls looked bad. Colour now comes
from two places only: the six curated presets, and Design tab → gradient builder
(six jewel quick-picks + manual pickers). The HSL-validation test in
`tests/generator_polish_test.ts` stays — dice-era prefs still sit in people's
localStorage and must keep loading.

## 2. One card kit for every info dialog

`components/modal/CardModal.tsx` now exports the whole kit:

| Piece                 | Job                                                                  |
| --------------------- | -------------------------------------------------------------------- |
| `CardModal`           | cream card, 3px sepia border, `rounded-3xl`, pink ✕, badge slot      |
| `CardBody`            | the one rhythm — `space-y-4 sm:space-y-5`                            |
| `CardHeading`         | `text-[1.55rem] sm:text-3xl leading-[1.15]` title + one pink tagline |
| `CardBackBar`         | drill-in header: ← Back pill + eyebrow                               |
| `CardSignature`       | "Made by Pablo ☕ in Melbourne" + optional quiet links               |
| `CardQuietLink`       | underlined text link/button for the signature row                    |
| `CardPrimaryButton`   | `.qr-pitch-cta`                                                      |
| `CardSecondaryButton` | cream bordered pill                                                  |

A face is those pieces in that order and sets no sizes of its own. About, Intro,
Passport (pitch / redeem / pair) and the parked Kofi face all use it. The CSS
half (`.qr-marker`, `.qr-pitch-copy`, `.qr-pitch-list`, `.qr-pitch-lines`,
`.qr-pitch-cta`) in `static/styles.css` mirrors TalkType's `tt-pitch-*` kit —
**layout and rhythm are shared; words are not.** Each app has its own
catchphrase. QRBuddy's is "Drop a link. Watch it bloom." (intro, manifest) and
"Nice QR codes. No ransom." (about). Nothing from TalkType's copy deck ("…the
best, kick out the rest", "fast, fun, freaky good", "Let's go") belongs here.

Copy rules that came out of the pass:

- One idea per line, no em-dash sub-clauses, `text-wrap: pretty` on paragraphs
  so no orphans.
- No CTA garnish (✨ ✦ 🎲 on buttons), no instructional captions ("tap the card
  to roll skins"), no "you"/"your"/"we".
- Say the real thing: other QR sites look like tax forms, hide the download
  behind a signup, bill monthly, and printed codes die when the card does. Chill
  tone, specific claims.
- The badge on About/Intro is the actual PWA icon (`/icon-192.png`, rendered
  bare via `badgeTile={false}`), not an emoji stand-in. Passport keeps 🛂 in the
  tile.

Verified: `favicon.svg` + `favicon.ico` + `apple-touch-icon.png` + manifest
icons (192/512, any + maskable) are all linked from `routes/_app.tsx`.

## 3. The stage under the QR

Before: input → "✨ Make it do tricks (Wi-Fi · Drops · Roulette)" → 🔍 micro
link. A week earlier it had been a row of three real buttons (Customize ·
Inspect · History) which the Oct 28 "stage hierarchy" pass collapsed. The
collapse hid three different jobs behind one eager pill — that was the problem,
not the button count.

Now (`components/smart-input/SmartInputToolbar.tsx`):

```
[ 🔗 Link ▾ ]  [ Design ]  [ Inspect ]  [ 🕰️ ]
```

- `Link ▾` shows the current QR type and opens the sheet on **Content**.
- `Design` opens the sheet on **Design** (new `initialTab` prop on
  `CreateModal`).
- `Inspect` opens the scanner. `🕰️` appears once there is history.
- The sheet header names the open tab (`SHEET_HEADINGS`): _What the QR holds /
  How the QR behaves / How the QR looks_, each with a one-line list of the
  choices. No more "Make it do tricks."

Static/Editable stays in-flow between input and row. Its segments carry their
own explanation as a sub-label (_Static — free forever_ / _Editable — repoint
after print · 5 free_), so the caption under it is gone.

### The stage recipe (first cut — superseded by §4)

The first cut put every row on the input's own paper, `STAGE_SURFACE` (3px
border, 4px lip) and marked "the current thing" with the theme tint. That turned
out to be the chonk problem; §4 has the tiered version that shipped.

## 4. De-chonking the stack (same day, second pass)

The first pass put the mode bar, the strip and the tiles on the _input's_ recipe
— 3px border, 4px lip, every row. With the footer dock underneath that made four
tiers of identical masonry and the hierarchy flattened: nothing read as "the
thing", the tinted `Link ▾` looked permanently open, the mustard Save pill
fought every palette, and the vibe toast landed on the dock.

Fix: three tiers of the same paper, separated by elevation, not colour.

| Tier | Token            | Border | Lip  | Notes                                               |
| ---- | ---------------- | ------ | ---- | --------------------------------------------------- |
| 1    | QR card          | 4px    | soft | hero; pulses 0.985→1 on any matrix change           |
| 2    | `STAGE_INPUT`    | 3px    | 3px  | sepia at rest even when valid; accent on focus      |
| 2    | Save pill        | 2px    | 2px  | cream, two keycaps, sepia rule between              |
| 3    | `STAGE_WELL`     | 2px    | none | recessed cream track; active segment lifts 1.5px    |
| 3    | `STAGE_TOOL_BTN` | 2px    | 2px  | neutral paper; latches down while its panel is open |

`STAGE_PRESS` is one physics for all keycaps: 70ms, hover −1px, press +2px with
the lip collapsing to 0. `SmartInputToolbar` takes `openPanel` (the Create sheet
reports its live tab through a new `onTabChange`) so the trigger sits depressed
and tinted while its drawer is open — the only place the theme tint appears on
the tiles.

Other things that moved in this pass:

- Static/Editable dropped ~35% in height: single-line segments, sub-labels are
  `free` / `repoint · 5 free` / `live`.
- `🔗` and `🕰️` became inline monochrome SVG glyphs (`StageGlyph`), with a small
  set covering the other QR types so the tile never leans on emoji.
- Tapping the QR matrix copies the PNG (`ClipboardItem`), with a cream "Copied
  PNG" pill inside the card. The Save pill still downloads.
- Editable mode shows on the artifact: a cream top-left tag with an accent dot
  replaces the purple→pink `🔗 editable` gradient badge.
- The vibe pill reveals its name inline for 1.4s on phones instead of toasting;
  download toasts lost their 🖼️ 📐 ❌ garnish.
- `deno task test:unit` gained `--allow-read`; the two `NotCapable` failures are
  gone, 113/113.

## 5. Silhouette, leading colour, 80/20 (third pass)

Screenshots after §4 still read pear-shaped: the control cluster was wider than
the QR card, every workspace surface was cream so the eye slid down to the
hot-pink `Passport` in the footer, the switch carried prose on one line
(`Static free` floating, `Editable repoint · 5 free` jammed), and the action row
was three equal bricks.

- **One column.** `routes/index.tsx` + `/es` wrap `SmartInput` in the QR card's
  own `max-w-[300px] sm:max-w-[360px]`. Input type drops to `text-base` on
  phones so the column still fits a URL.
- **One leading colour.** The Save pill wears `--qr-theme-cta-bg` (Sunset pink,
  Ocean sky, Forest mint…); it is the payoff action and anchors the card.
  `FooterDock`'s `Passport` goes `--qr-theme-tint-strong` + sepia text
  - an accent dot, no 🛂.
- **Switch = names only.** `Static` / `Editable` + a `5 free` micro-badge
  (`live` once created). `p-0.5`, segments `min-h-[30px]`, ~36px total.
- **80/20 row.** `flex gap-2`: `Design` is `flex-1` with a palette glyph and a
  faint tint so it reads as the thing to play with; `Link ▾` and `Inspect`
  (magnifier) hug their text. Keycaps are 38px / 13px type.
- **Rhythm.** `gap-2` everywhere inside the cluster; the gap to the footer dock
  is what's left.

## 6. Pigment back, 80/20 for real (fourth pass)

§5 over-corrected into pastel: Save pill, Passport and the active segment all
sat on `--qr-theme-tint`, so nothing popped and `Editable 5 free` read as
disabled. Fixes: Save pill is saturated gold `#ffbe0b` (pops on every QR
palette); Passport, the `5 free` badge and the card's top-right `editable` tag
wear saturated `--qr-theme-accent` + near-white text; the active switch segment
is a raised cream keycap and the inactive one keeps full ink. Action row is
Approach B: `Design` is an ink-filled hero (`HERO`, `flex-1`), `Link ▾` a
rounded type chip, `Inspect` icon-only on phones. Phone column widened to
`max-w-[348px]` so `https://example.com/menu` no longer clips; the 📎 became an
inline SVG. The headline word was never pastel — it rotates with an opacity fade
and a shot caught it mid-transition.

## Verifying

```bash
deno fmt && deno lint && deno task check && deno task test:unit
```

Visual check used Playwright (from `daysay/node_modules`) against
`deno task start` at 390×844 and 1280×860, EN and `/es`: intro, about, passport
pitch/redeem, home empty, home with a URL typed, Content and Design tabs, and
the Ocean palette to confirm the tint follows.
