# QRBuddy for Canva — status and the road to listing

> Audit 2026-11-02. The plugin exists and is closer to shippable than the repo
> suggests. This is what is built, what is missing, and the order to do it in.

## What already exists

`plugins/canva-app/` — an Apps SDK v2 sidebar plugin, version 2.0.0:

- Gradient **vector** QR codes built locally (`src/qrbuddy-svg.ts`), inserted
  into the design through `@canva/asset` `upload()` as `image/svg+xml`.
- Palette presets, a caption field, and an "editable dynamic link" toggle that
  calls `create-dynamic-qr` and inserts the redirect URL instead of the raw one.
- Canva review hygiene already handled deliberately: no `<script>` in the SVG,
  no external `<image>` in the export, `requestOpenExternalUrl` instead of
  `window.open`, explicit "Get QRBuddy Passport" CTA, and a visible tier line.

That is the shape Canva wants. The gap is polish and process, not architecture.

## Gaps, in the order they cost money

**1. The Passport is typed in by hand.** The panel asks for a "passport phrase"
in a text field. Nobody remembers a four-word phrase they were assigned
mid-design. Better: a button that opens `qrbuddy.app/pair` (a page that shows
the user's Passport code and a QR), plus a paste field as fallback. Or simplest
honest version: create the code anonymously and offer "link it to your Passport"
in the success state, which is where attention already is.

**2. The backend URL is hardcoded** to the Supabase project
(`aqydpibnvlhcjcwosrti.supabase.co`). It should be `https://qrbuddy.app/v1`,
which now exists in the app as a proxy. One host, brandable later, and it means
a future custom domain change does not require resubmitting the Canva app.

**3. No free-code allowance feedback.** The insert button should tell a free
user how many of their 5 editable codes are used _before_ they click, not after
the request fails.

**4. No listing assets.** Canva needs a name, a one-line pitch, icons,
screenshots and a support URL. The repo's launch pack has the visual language
already; the plugin needs its own 3 screenshots and a 512 px icon.

**5. Nothing is submitted.** `canva login` + `npm run upload` has never been run
from this machine as far as the repo shows. That is the actual blocker between
"a plugin exists" and "thousands of designers can find it".

## The plan

| Step                                                   | Effort                     | Why it matters                                |
| ------------------------------------------------------ | -------------------------- | --------------------------------------------- |
| 1. Point the plugin at `qrbuddy.app/api`               | minutes                    | One host, no resubmit when the domain changes |
| 2. Replace the phrase box with "Link Passport" + paste | an hour                    | The difference between 5 free codes and none  |
| 3. Free-allowance line above the button                | an hour                    | Removes the most common support email         |
| 4. Three screenshots + 512 px icon + listing copy      | a couple of hours          | Required to submit                            |
| 5. `canva login`, `npm run upload`, answer review      | half a day, partly waiting | The only step that creates distribution       |

Steps 1–3 are code in this repo. Step 4 is design. **Step 5 needs Pablo**, since
it signs into the Canva developer account and goes through review.

## Why this is worth doing at all

Canva's own QR tool makes static squares with no editing and no tracking. Every
menu, poster and label made in Canva that wants an editable code is a session
that has to leave Canva, make a code elsewhere, and come back — or install a
plugin. Hovercode's public reviews credit exactly this surface for a large share
of its organic growth.

The plugin also happens to be the best possible demo of the product: a designer
sees a QRBuddy gradient code inside their own poster, at full size, before
paying anything.

## What NOT to do

No Canva Data Connectors bulk-batch inside the plugin on day one. It is the most
complex SDK surface and the least tested. Ship the single-code plugin, learn
from review and installs, then add bulk.
