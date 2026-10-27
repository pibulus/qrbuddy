# QRBuddy Commercial, Pricing and Conversion Audit — 13 October 2026

**Author**: Antigravity (Gemini 3.8 Flash)\
**Target Repository**: `/Users/pabloalvarado/Projects/active/apps/qrbuddy`\
**Reference Release Snapshot**: Commit `7238849` (Live Deno Deploy digest
`c8bf4445ee15...`)\
**Working Tree State**: Clean working tree with uncommitted UX/accessibility
follow-ups in `CreateModal.tsx`, `EditQRForm.tsx`, `FileSlideshow.tsx`,
`OwnerStrip.tsx`, `RoutingConfigForm.tsx`, `FileUploadOptions.tsx`,
`ShareReady.tsx`, and `utils/history.ts`. (All verified and preserved; offline
unit tests: **55 passed, 0 failed, 1 ignored**).

---

## Executive Verdict

QRBuddy is an exceptionally crafted, aesthetic triumph suffering from
**generosity paralysis** and a **commercial identity mismatch**.

1. **The Product is Genuinely Loved for the Wrong Commercial Reason**: QRBuddy
   gives away 100% of its best, highest-leverage utility for zero dollars:
   unlimited static QR codes, 8 pastel-punk gradient themes, custom gradient
   creator, center logo upload, "SCAN ME" print frames, PNG/SVG vector exports,
   3 dynamic editable links, link rotation, and 10-track mixtape / 10-photo
   slideshow hosted experiences.
2. **The Current Paid Offer Sells the Wrong Job to the Wrong Buyer**: The
   existing A$49/year "Supporter Pass" pitches _500 MB single-file uploads with
   30-day expiry_ and _unbranded locker pages_. This positions QRBuddy as an
   awkward, expensive WeTransfer competitor rather than a premium design and
   print tool. Furthermore, physical print users (merch makers, musicians,
   brides, restaurants) cannot use 30-day expiring links on physical collateral.
3. **The Purchase Flow is Buried**: The paid offer is only discoverable via a
   tiny "Supporter ✨" button tucked inside the footer dock and an obscure
   secondary button inside the About modal. It is completely absent from the
   generator flow, the options sheet, the export tab, and the owner management
   strip.
4. **The Path to Income**: Pivot from "file locker bandwidth" to **"Print
   Confidence, Link Immortality & Merch Permanence"**. Sell an
   **A$39 AUD / year Maker Pass** (and an optional **A$19 AUD one-off Release
   Pass**) to independent makers, creative brands, and DIY musicians who print
   physical merchandise and need guaranteed, unbranded, permanent redirects
   without predatory SaaS traps.

---

## 1. Target Buyers: Primary and Secondary

### Primary Buyer: The Independent Maker & Micro-Brand Creator

_(Boutique apparel, craft food/beverage, candle makers, stationery designers,
independent publishers, pop-up market vendors)_

- **The Trigger**: The maker is preparing a physical print run (product
  packaging, product labels, custom die-cut stickers, table displays, or swing
  tags). They need a QR code that looks like a considered design piece matching
  their aesthetic, not an ugly, clinical black-and-white hospital barcode.
- **What They Make**: 200 to 2,000 branded physical items directing customers to
  an online storefront, provenance story, care instructions, or social profile.
- **Why Free is Enough Today**: Free provides unlimited static QRs, custom
  palettes, custom center logo embedding, print frames, and high-resolution
  PNG/SVG vector downloads. If their destination URL never changes, free solves
  100% of their needs today.
- **The Concrete Reason They Will Pay**:
  - **Print Insurance & Repointing**: When printing $500–$2,000 worth of
    physical packaging, a broken link, a domain migration, or a changed
    Etsy/Shopify URL ruins inventory. They pay for the insurance that their QR
    code is permanently editable.
  - **Anti-Hostage Guarantee**: Commercial competitors (QR Code Generator by
    Bitly, QR Tiger) bait users with "free" dynamic codes that stop scanning
    after 14 days or 500 scans unless they pay $120–$350 USD/year. Independent
    makers despise this extortion. QRBuddy's promise—_"Pay once, never held
    hostage, no automatic card charges"_—is a massive competitive relief.
  - **Unbranded / Clean Redirects**: When a customer scans a boutique product,
    the maker does not want a third-party redirect interstitial or URL branding.
- **Evidence vs. Hypothesis**:
  - _Evidence_: High usage and rigorous maintenance of the vector SVG export,
    custom logo rendering, scannability verification (`checkQRScannability`),
    and dynamic redirect table (`dynamic_qr_codes`).
  - _Hypothesis_: That indie makers will pay A$39/year specifically for redirect
    longevity insurance if presented at the exact moment they export or
    configure an editable link.

### Secondary Buyer: The Independent Musician & Physical Merch Creator

_(DIY cassette tape labels, vinyl record self-releases, zine creators, gig tour
posters)_

- **The Trigger**: Releasing a physical cassette, 7" vinyl, CD sleeve, or gig
  poster. They want fans to scan a sticker or sleeve insert and immediately
  stream bonus demos, unreleased tracks, or a complete mixtape in the browser
  without forcing fans into Spotify, Apple Music, or SoundCloud app installs.
- **What They Make**: Physical cassette J-cards, vinyl insert cards, merch table
  stickers with a 5–10 track curated playlist.
- **Why Free is Enough Today**: Free allows uploading up to 10 audio tracks (≤5
  MB each) into QRBuddy's mixtape player with browser auto-advance, track
  switching, and ZIP download. For a 1-week art show, free is plenty.
- **The Concrete Reason They Will Pay**:
  - **Merch Permanence**: _The current free 30-day expiry kills physical media
    releases._ A musician cannot print a QR code on a cassette tape that expires
    in 30 days. Currently, even paying A$49 does _not_ extend retention beyond
    30 days.
  - If QRBuddy offers a **1-Year or Multi-Year Release Pass
    (A$19 one-off or part of the A$39 Maker Pass)** that keeps their mixtape
    page alive for 365+ days with up to 15–20 MB per track (proper 320kbps
    MP3s), musicians will happily pay.
- **Evidence vs. Hypothesis**:
  - _Evidence_: The mixtape player (`FileSlideshow.tsx`) is already fully
    functional, featuring real audio playback, auto-advance, track names, and
    owner stats (`_shared/conditions.ts`). Dedicated music sales route exists at
    `/for/music`.
  - _Hypothesis_: That indie tape/vinyl artists are willing to pay A$19–A$39 to
    host their merch audio, provided the 30-day expiration is removed.

---

## 2. Offer Comparison and Recommendation

| Evaluation Dimension      | Model 1: Current Baseline (A$49 Annual Supporter Pass)                                                                                                   | Model 2: Pay-Per-Campaign / Event (A$19 AUD One-Off)                                                                                   | Model 3: **Recommended** — Maker Pass (A$39 AUD/yr or A$19 Event)                                                                                                                                                                                                                                                                                             |
| :------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **What Stays Free**       | Unlimited static QRs; styles; logos; frames; 3 dynamic links; 10 photos/tracks (30-day expiry); 50 MB single-file transfers.                             | Same free baseline.                                                                                                                    | Unlimited static QRs; full styling; logos; frames; PNG/SVG export; 3 pilot dynamic links with basic stats; 30-day temporary file drops (10 photos/tracks).                                                                                                                                                                                                    |
| **What Payment Buys**     | Single file up to 500 MB (via R2); unbranded note/locker pages; higher rate limits. _Shares still expire in 30 days._                                    | 1 Dynamic QR code OR 1 Hosted Mixtape/Slideshow with **1-Year Guaranteed Retention**, direct unbranded redirect, and vector print kit. | **1. Print Fleet**: Up to 15 permanent editable QRs with zero-delay direct redirects.<br>**2. Merch Permanence**: 1-Year retention for up to 5 hosted mixtapes/slideshows (up to 20 MB/track).<br>**3. Print Kit**: CMYK-ready vector PDF with bleed guides & scannability seal.<br>**4. Clean Branding**: No QRBuddy branding on redirects or share footers. |
| **Price & Billing**       | A$49 AUD, 365 days, one-time payment, no auto-renewal.                                                                                                   | A$19 AUD, one-time payment per asset/release, no renewal.                                                                              | **A$39 AUD / year** (Maker Pass, 365 days, no auto-renewal) OR **A$19 AUD** (Single Release Pass).                                                                                                                                                                                                                                                            |
| **Why the Buyer Pays**    | Altruism ("support Pablo") or temporary transfer of large files.                                                                                         | Immediate project need (printing wedding invitations, launching a single cassette tape, opening a seasonal pop-up).                    | Genuine commercial utility: print insurance for multiple packaging runs, peace of mind that printed collateral will never break, professional unbranded links.                                                                                                                                                                                                |
| **Delivery & Ops Burden** | **High & Dangerous**: 500 MB files create potential R2 storage and bandwidth exposure. Cleanup scripts must constantly police large files.               | **Extremely Low**: Only database redirects and small audio files (capped at ~100 MB per release). Minimal storage liability.           | **Very Low & Predictable**: 15 dynamic redirects consume bytes in PostgreSQL. 5 hosted releases @ 100 MB max = 500 MB per active user. 100 users = 50 GB storage (~$0.75/month on Cloudflare R2, $0 egress).                                                                                                                                                  |
| **Main Reason It Fails**  | **Product-market disconnect**: Nobody wants to pay A$49/yr for temporary file storage that deletes in 30 days when Google Drive and WeTransfer are free. | Low lifetime value; maker has to re-acquire the customer for every sticker run.                                                        | Makers remain satisfied with free static QRs and don't value editable repointing enough to pay.                                                                                                                                                                                                                                                               |

### Why Model 3 Wins

Model 3 aligns directly with QRBuddy's character: **weaponized simplicity and
anti-corporate honesty**. It does not compete with Dropbox on gigabytes. It
competes with Bitly and QR Code Generator on **trust, aesthetic beauty, and
respect for physical print runs**.

- **Storage & Bandwidth Economics**: By capping paid audio releases at 10 tracks
  / 20 MB each (200 MB total release ceiling) and guaranteeing 365 days of
  hosting, Cloudflare R2 storage costs remain trivial ($0.015/GB/month). Even
  200 active paying musicians generate under $1.50/month in total R2 hosting
  costs.
- **Transition Plan for Existing Data**: Existing free users keep their 30-day
  shares and 3 free editable links indefinitely. No existing links are revoked
  or shortened. Any user upgrading to the Maker Pass has their existing active
  shares upgraded from 30 days to 365 days via a single database flag update.

---

## 3. Competitive Landscape & Parity Analysis

_Audit Date: 13 October 2026. Data verified against official public pricing._

| Provider                                                                    | Free Tier Dynamic / Static                                    | Entry Paid Tier (Monthly equivalent & Annual total)                                          | Key Restrictions & Dark Patterns                                                                                                              | QRBuddy Strategic Response                                                                                                                                     |
| :-------------------------------------------------------------------------- | :------------------------------------------------------------ | :------------------------------------------------------------------------------------------- | :-------------------------------------------------------------------------------------------------------------------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **[QR Code Generator (Bitly)](https://www.qr-code-generator.com/pricing/)** | Unlimited static. Dynamic QRs require account and trial.      | **Starter**: $9.99 USD/mo (~A$185 AUD/yr billed annually). Only **2 dynamic codes**!         | **Severe**: Traps users with a 14-day trial; printed codes break unless user pays a forced annual subscription. Massive user backlash online. | **Differentiator**: Never trap printed codes. Offer 15 editable links for A$39 AUD once (no auto-renew, no extortion).                                         |
| **[Hovercode](https://hovercode.com/pricing/)**                             | Unlimited static. 3–10 dynamic codes, 30-day stats.           | **Pro**: $12 USD/mo (~A$185–$220 AUD/yr). 100 dynamic codes, 1 custom domain.                | Requires recurring monthly/annual subscription. Clean interface, but generic corporate styling.                                               | **Parity**: Offer unbranded redirects and custom slugs. **Differentiator**: Soft Neo Toybrut visual charm, integrated mixtape player, no monthly subscription. |
| **[QR Tiger](https://www.qrcode-tiger.com/pricing)**                        | Unlimited static. 3 dynamic codes with hard **500-scan cap**. | **Regular**: $7 USD/mo (~A$130 AUD/yr billed annually). 12 dynamic codes, 5 MB file uploads. | Scan limits on free tier deliberately shut down working codes. Bloated dashboard.                                                             | **Differentiator**: No scan count trap (fair-use unlimited). Instant browser vault management without account creation.                                        |
| **[Uniqode (Beaconstac)](https://www.uniqode.com/pricing)**                 | Static only. Dynamic strictly paid.                           | **Starter**: $5–$15 USD/mo billed annually.                                                  | Enterprise-oriented, complex setup, aggressive sales funnel.                                                                                  | **Ignore**: Enterprise SSO, complex CRM integrations, multi-user role permissions.                                                                             |

### Essential Gaps to Close

1. **Print Confidence & High-Resolution Vector Kit**: Professional print shops
   ask for CMYK vectors, bleed boundaries, and 300+ DPI assurance. QRBuddy has
   SVG, but lacks a guided "Print Pack" export (PDF with bleed margins and
   scannability validation).
2. **Clear Redirect Longevity Policy**: Competitor horror stories make buyers
   terrified that dynamic QR codes will deactivate. QRBuddy must state its
   redirect guarantee front and center.
3. **Unbranded / Direct Redirects**: Currently, dynamic links bounce through
   `/r?code=...`. Paid users must have instant 301/302 redirects with zero
   intermediate splash or QRBuddy branding.

### Worthwhile Differentiators to Double Down On

1. **Soft Neo Toybrut & Pastel-Punk Aesthetic**: QRBuddy is the _only_ tool
   where the QR code looks like a collectible vinyl sticker or album art.
2. **Ethical Anti-SaaS Contract**: One payment. 365 days. No recurring credit
   card surprises. No held-hostage print runs.
3. **Integrated Mixtape / Slideshow Player**: Instant browser-native player with
   zero ad tracking.
4. **Local Browser Vault**: Zero mandatory account creation or password
   management.

### Features to Ignore

- Multi-user corporate team permissions (RBAC)
- Facebook Pixel / Google Tag Manager retargeting injection (creepy, violates
  QRBuddy privacy stance)
- Enterprise SSO / SAML
- Multi-gigabyte cloud storage lockers

---

## 4. Experience, Presentation and Conversion Flow

### Browser Flow Observations (Verified from Production & Test Runs)

- **First Visit → Create → Download**: Instant, delightful, zero friction. A
  user types a URL and clicks "↓ Save PNG" in under 5 seconds.
- **Photo/Audio Selection → Publish → Recipient Page**: Staging card previews
  thumbnails/tracks with reordering (Gemini follow-up). Recipient page
  `/f/{code}` plays cleanly, but displays "Powered by QRBuddy" and expires in 30
  days.
- **Return → Find → Manage**: The browser vault remembers owned items in History
  (🔍), showing "👑 Manage" reliably.
- **Discover Paid Offer**: **The primary conversion failure.** The paid offer is
  completely invisible during the creation, customization, and export workflows.

### The 3 Non-Intrusive Conversion Touchpoints

```
┌────────────────────────────────────────────────────────────────────────┐
│ TOUCHPOINT 1: CreateModal -> Behavior Tab (When selecting "Editable")  │
├────────────────────────────────────────────────────────────────────────┤
│ [⚡ Static]              [🔗 Editable]                                 │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 👑 Free pilot: 3 active editable links included.                   │ │
│ │ Need permanent redirects for commercial packaging or menus?        │ │
│ │ [Get the Maker Pass — 15 permanent links · A$39/yr →]              │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ TOUCHPOINT 2: CreateModal -> Design Tab (At the Download Section)      │
├────────────────────────────────────────────────────────────────────────┤
│ [ ⬇ PNG ]                [ ⬇ SVG ]                                    │
│                                                                        │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ 🖨️ Printing physical stickers, boxes, or signs?                    │ │
│ │ Export the Print-Shop Kit (CMYK PDF, bleed marks & scan seal)      │ │
│ │ [Included with Maker Pass · A$39 →]                                │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│ TOUCHPOINT 3: OwnerStrip (On Mixtapes and Slideshows)                  │
├────────────────────────────────────────────────────────────────────────┤
│ 👑 IT'S YOURS · Managed in this browser                                │
│ ⚠️ Temporary share: expires in 30 days.                                │
│ ┌────────────────────────────────────────────────────────────────────┐ │
│ │ Printing this on cassette sleeves, vinyl or wedding invites?       │ │
│ │ Keep this release alive for a full year:                           │ │
│ │ [Extend to 1 Year — A$19 Single Release / A$39 Maker Pass →]       │ │
│ └────────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Exact Proposed UI Copy (In QRBuddy Voice)

- **Behavior Tab Callout**:
  > _"Free includes 3 editable links for testing. Printing a big run of labels,
  > menus, or stickers? The Maker Pass gives you 15 permanent editable links
  > with instant redirects and zero renewal traps."_
- **Design Tab Print Kit Callout**:
  > _"Need print-shop confidence? Download a 300 DPI vector PDF with bleed
  > guides, color safety checks, and link protection so you never waste paper."_
- **Mixtape Retention Callout**:
  > _"This mixtape stays live for 30 days for free. Putting it on a real
  > cassette, record sleeve, or gig flyer? Keep it spinning for 365 days with a
  > Release Pass."_
- **Updated Pricing Modal Subtitle**:
  > _"No subscriptions. No hostage-taking. One payment gives your physical print
  > runs permanent peace of mind for a full year."_

---

## 5. Commercial Feasibility & Income Projections

### Unit Economics (AUD)

- **Maker Pass**: A$39.00 once (valid 365 days)
- **Single Release Pass**: A$19.00 once (valid 365 days)
- **Square Processing Fee (Australia Online Checkout)**: 2.2% + A$0.30
  - On A$39.00: Fee = A$1.16 | **Net Contribution = A$37.84 (97.0%)**
  - On A$19.00: Fee = A$0.72 | **Net Contribution = A$18.28 (96.2%)**
- **Infrastructure Marginal Costs per Active Customer**:
  - Cloudflare R2 Storage (150 MB average hosted media): ~$0.002 / month
  - PostgreSQL DB storage & scan logs (coarse tallies, 90-day retention):
    ~$0.001 / month
  - Deno Deploy requests: within existing baseline
  - **Estimated Net Marginal Contribution: >95%**

### Realistic Annualized Scenarios

| Metric                             | Low Scenario (Early Traction)    | Base Scenario (Established Niche)   | High Scenario (Indie Standard)       |
| :--------------------------------- | :------------------------------- | :---------------------------------- | :----------------------------------- |
| **Monthly Qualified Visitors**     | 1,500 (~50/day)                  | 5,000 (~165/day)                    | 15,000 (~500/day)                    |
| **QR Creation / Export Actions**   | 900 (60%)                        | 3,250 (65%)                         | 10,500 (70%)                         |
| **Paid Checkout Conversion Rate**  | 0.6% of creators                 | 1.0% of creators                    | 1.5% of creators                     |
| **Monthly Paid Purchases**         | **5 sales** (3 @ A$19, 2 @ A$39) | **32 sales** (20 @ A$19, 12 @ A$39) | **150 sales** (90 @ A$19, 60 @ A$39) |
| **Monthly Gross Revenue**          | A$135 AUD                        | A$848 AUD                           | A$4,050 AUD                          |
| **Annual Gross Revenue**           | **A$1,620 AUD**                  | **A$10,176 AUD**                    | **A$48,600 AUD**                     |
| **Square Payment Fees**            | -A$54 AUD                        | -A$335 AUD                          | -A$1,595 AUD                         |
| **Operating Infrastructure Costs** | -A$360 AUD (Supabase baseline)   | -A$450 AUD (Supabase Pro)           | -A$600 AUD (Supabase + R2)           |
| **Annual Net Contribution**        | **A$1,206 AUD**                  | **A$9,391 AUD**                     | **A$46,405 AUD**                     |

_Missing Cost Data Transparently Acknowledged_:

- Supabase Pro threshold ($25 USD / ~A$38 AUD/mo) is required once concurrent
  connection spikes or database storage exceed the free tier.
- Square transaction fees for international credit cards (e.g. US/UK cards) may
  incur a ~1.0% cross-border fee (~A$0.39 additional per transaction).

### The First 20 Paying Customers: Two Grounded Channels

1. **Channel 1: Independent Cassette & Vinyl Labels (r/cassetteculture, Bandcamp
   DIY community, Melbourne tape labels)**
   - _Pitch_: "Put a streaming mixtape on your cassette J-card sticker without
     sending fans to Spotify or building an app. 1-year hosted mixtape with
     auto-advance and ZIP download for A$19."
   - _Action_: Direct personal demo to 10 small DIY tape labels showcasing an
     actual working tape release with audio samples.
2. **Channel 2: Micro-Brand Packaging & Pop-Up Market Vendors (Etsy packaging
   forums, local craft market stallholders)**
   - _Pitch_: "The anti-SaaS QR code for your product labels. Beautiful
     pastel/custom styling, vector print download, and permanent editable
     redirects so you never waste a print run."
   - _Target_: 10 boutique makers printing physical packaging stickers.

---

## 6. Measurement and Analytics Plan

### Critique of Existing Telemetry

1. **False Positive Generation**: `islands/Analytics.tsx` currently triggers
   `qr_generated` upon debounced typing in the input box. A user typing a
   mistyped URL or clearing the box counts as a generation.
2. **Vulnerable Conversion Tracking**: `Analytics.tsx` lines 60–90 listens for
   `?upgrade=success` in the query string and fires `upgrade_completed`. Anyone
   typing that URL param manually registers a false conversion.
3. **Missing Denominators**: Downloads (PNG/SVG) and modal tab transitions have
   zero telemetry. There is currently no way to know what percentage of actual
   creators view the paid offer.

### Trustworthy 5-Stage Conversion Funnel

```
[1. Session Started] ──> [2. Real QR Exported / Media Published] ──> [3. Paid Offer Viewed] ──> [4. Checkout Opened] ──> [5. Pass Fulfilled & Active]
     (Unique visit)             (PNG/SVG saved or /f/ created)           (Modal open via trigger)       (Square link visited)     (Webhook verified + Vault set)
```

1. `visit_engaged`: User interacted with controls or created a QR.
2. `qr_exported`: Real export event fired (PNG download completed, SVG
   downloaded, or media batch created).
3. `pro_offer_viewed`: Pricing modal opened, tagged with entry source
   (`source: "behavior_tab" | "design_tab" | "owner_strip" | "footer"`).
4. `checkout_started`: Square checkout URL successfully received from
   `create-checkout` edge function.
5. `pass_activated`: Webhook confirms settled payment, HMAC token issued and
   verified in client vault.

### Privacy and Anti-Leak Guarantees

- **No URLs or Destinations**: Destination URLs and file payloads are never
  included in analytics events.
- **No Bearer Tokens or Owner Keys**: Owner tokens, checkout IDs, and HMAC
  license tokens are excluded from Umami payloads and stripped from browser
  query parameters (`stripCheckoutParam`).
- **Low-Traffic Experimentation**: At low traffic (1,000–5,000 visits/mo), A/B
  testing is statistically invalid. Use **direct observational telemetry**
  (monitoring funnel ratios) and **qualitative feedback** (e.g. asking the first
  20 buyers directly what triggered their purchase).

---

## Action Plan: Do Now / Validate Next / Leave Alone

```
┌───────────────────────────────────┬───────────────────────────────────┬───────────────────────────────────┐
│              DO NOW               │           VALIDATE NEXT           │            LEAVE ALONE            │
│       (High impact, 80/20)        │      (Requires live feedback)     │       (Complexity traps)          │
├───────────────────────────────────┼───────────────────────────────────┼───────────────────────────────────┤
│ 1. Realign Offer & Price in types │ 1. Physical mobile camera scans & │ 1. Enterprise team logins / SSO   │
│    and PricingModal (A$39 Maker   │    print readability in low light │ 2. Mandatory accounts / passwords │
│    Pass + A$19 Release Pass).     │ 2. 1-Year media retention uptake  │ 3. Facebook/Google ad retargeting │
│ 2. Add 3 Contextual Entry Points  │    among real cassette/music      │    pixels                         │
│    in CreateModal and OwnerStrip. │    creators                       │ 4. Heavyweight 500 MB file locker │
│ 3. Fix Analytics Telemetry        │ 3. Test conversion rate of A$39   │    marketing (Dropbox competitor) │
│    (real download triggers, kill  │    annual vs. A$19 single event   │ 5. Complex Zapier integrations    │
│    URL-based fake conversions).   │ 4. Print-Shop CMYK PDF export pack│ 6. Automatic recurring billing /  │
│ 4. Verify Real Square Checkout    │    feedback from professional     │    subscription engine            │
│    with live A$39 test charge &   │    commercial printers            │                                   │
│    enable public checkout gate.   │                                   │                                   │
└───────────────────────────────────┴───────────────────────────────────┴───────────────────────────────────┘
```

---

## Top 5 Ranked Changes

### Change 1: Re-align the Paid Offer and Positioning (Maker Pass & Release Pass)

- **Evidence**: The current A$49 offer for 500 MB temporary file hosting is
  disconnected from why users love QRBuddy. Media shares expire in 30 days even
  for paying supporters, breaking physical print use cases.
- **Expected Effect**: Gives independent makers and musicians a compelling,
  logical reason to buy (permanent print redirects + 1-year hosted media).
- **Effort**: Low (Modifying `types/pricing.ts`, `islands/PricingModal.tsx`,
  `_shared/square.ts`, and vertical sales copy).
- **Dependencies**: None.
- **Acceptance Checks**: Pricing modal displays A$39 Maker Pass with clear
  print-confidence and 1-year media retention benefits; Square price money
  aligns.

### Change 2: Contextual Purchase Entry Points (Behavior Tab, Design Tab, Owner Strip)

- **Evidence**: Current discovery is restricted to the footer and About modal.
  99% of creators never see the paid offer.
- **Expected Effect**: 5× to 10× increase in offer impressions at the exact
  moment purchase intent is highest (when choosing editable redirects or viewing
  share expiration).
- **Effort**: Low-Medium (Modifying `CreateModal.tsx`, `DesignTab.tsx`, and
  `OwnerStrip.tsx`).
- **Dependencies**: Change 1.
- **Acceptance Checks**: Non-intrusive callouts appear in Behavior tab when
  toggling Editable, below export buttons in Design tab, and in OwnerStrip on
  30-day shares. Home screen and free flow remain 100% compact and
  uninterrupted.

### Change 3: Fix Analytics Telemetry & Conversion Accuracy

- **Evidence**: `Analytics.tsx` counts keystroke debounces as generations,
  misses PNG/SVG downloads, and logs fake conversions if `?upgrade=success` is
  visited.
- **Expected Effect**: Reliable, tamper-proof baseline data for visits, real
  exports, offer views, and confirmed activations.
- **Effort**: Low (Modifying `islands/Analytics.tsx` and export event handlers).
- **Dependencies**: None.
- **Acceptance Checks**: `qr_exported` fires only on actual PNG/SVG export or
  file publish; fake URL query conversions are eliminated; Umami payloads
  contain zero private URLs or bearer keys.

### Change 4: Implement 1-Year Media Retention for Paid Passes

- **Evidence**: Cassette, vinyl, and wedding print runs are completely unviable
  with 30-day expiration.
- **Expected Effect**: Unlocks the entire independent music and physical merch
  market for hosted mixtapes.
- **Effort**: Medium (Add pass verification to `upload-file` / `update-file`,
  set 365-day expiry in `destructible_files`, update cleanup RPC to respect pass
  status).
- **Dependencies**: Change 1.
- **Acceptance Checks**: Media uploads with an active supporter pass get
  `expires_at = NOW() + 365 days`; cleanup-expired preserves paid shares.

### Change 5: Complete Paid Launch Gates and Enable Checkout

- **Evidence**: Square checkout is fully wired but deliberately disabled
  (`SQUARE_CHECKOUT_ENABLED=false`).
- **Expected Effect**: QRBuddy can accept real commercial payments.
- **Effort**: Low-Medium (Perform live test purchase, verify webhook, verify
  pass restore across browsers, verify refund drill, toggle flag).
- **Dependencies**: Changes 1 & 4.
- **Acceptance Checks**: Live test transaction on Square returns 200, fulfills
  pass, restores pass in second browser via phrase backup, customer receipt
  verified.

---

## Paste-Ready Implementation Prompts

### Work Package 1: Pricing Model & Modal Copy Realignment

```markdown
Work in /Users/pabloalvarado/Projects/active/apps/qrbuddy.

### Objective

Update QRBuddy's paid pricing model and modal copy to reflect the Maker Pass
(A$39 AUD / 365 days) focused on Print Confidence, Permanent Editable Links, and
1-Year Media Retention.

### File Ownership

- types/pricing.ts
- islands/PricingModal.tsx
- supabase/functions/_shared/square.ts
- tests/square_test.ts

### Requirements

1. Update `types/pricing.ts`:
   - Set `PRICING_TIERS.pro.price = 39`.
   - Update `PRICING_TIERS.pro.name = "Maker Pass"`.
   - Update perks to:
     - "15 permanent editable links with instant, unbranded redirects"
     - "1-year retention for up to 5 hosted mixtapes & photo galleries (≤20
       MB/track)"
     - "Print-shop confidence: vector SVG & CMYK print kit guidance"
     - "One payment of A$39 for 365 days. No auto-renewal, no held-hostage
       links"
2. Update `supabase/functions/_shared/square.ts`:
   - Update default price money in `getSupporterPriceMoney()` to 3900 cents
     (A$39 AUD).
   - Ensure Square order description reflects "QRBuddy Maker Pass (1 year)".
3. Update `islands/PricingModal.tsx`:
   - Align Spanish and English copy with the new Maker Pass positioning.
   - Retain the exact CardModal shell, tilted sticker badge, and single-card
     manifesto style.
   - Do not break the claim poller, pass copy/restore flow, or modal dismissal.
4. Update `tests/square_test.ts`:
   - Update expected cents from 4900 to 3900 in test assertions.

### Verification & Handoff

- Run `deno task test:unit` and ensure all 55+ tests pass.
- Run `deno task check` to verify formatting, linting, and types.
- Inspect `git diff` to confirm only the specified pricing definitions and copy
  were altered.
```

---

### Work Package 2: Contextual Upsell Triggers & Funnel Telemetry

```markdown
Work in /Users/pabloalvarado/Projects/active/apps/qrbuddy.

### Objective

Add non-intrusive, contextual purchase discovery moments in CreateModal and
OwnerStrip, and fix conversion analytics telemetry.

### File Ownership

- islands/CreateModal.tsx
- islands/create-modal/DesignTab.tsx
- islands/OwnerStrip.tsx
- islands/Analytics.tsx
- islands/QRCanvas.tsx

### Requirements

1. Contextual Entry Points:
   - In `islands/CreateModal.tsx` on the "Behavior" tab: below the Editable link
     settings, add a compact, subtle banner explaining: "Free includes 3
     editable links. Need permanent redirects for commercial packaging or menus?
     [Get Maker Pass →]" which triggers `openPricingModal()`.
   - In `islands/create-modal/DesignTab.tsx`: below the PNG and SVG export
     buttons, add a subtle text trigger: "Printing physical stickers or
     packaging? [Print confidence & permanent links →]".
   - In `islands/OwnerStrip.tsx`: next to the 30-day share expiration note, add
     an action pill: "Printing on tape sleeves or flyers? [Keep active for 1
     year →]".
2. UI Rules:
   - Match the Soft Neo Toybrut design system (cream background, chunky 2px
     borders, amber/pink accents).
   - Keep the primary task completely uninterrupted; do not show blocking modals
     or forced popups.
   - Speak in QRBuddy voice (no "we/us").
3. Analytics Telemetry Fix in `islands/Analytics.tsx`:
   - Remove the `upgrade=success` query-string listener that allows false
     positive conversion spoofing.
   - Add a global event listener for `qr-export-completed` that tracks
     `qr_exported` in Umami with `{ format: "png" | "svg", style: string }`.
   - In `QRCanvas.tsx`, dispatch `qr-export-completed` after a download
     successfully initiates.
   - In `PricingModal.tsx`, ensure `openPricingModal` tracks `offer_viewed` with
     the triggering source.

### Verification & Handoff

- Run `deno task check` and `deno task test:unit`.
- Verify in browser that the compact home layout is completely preserved.
- Verify that clicking any of the new triggers opens `PricingModal`.
```

---

## Recommended Single Next Action

**The Single Next Action**: **Execute a live A$39 AUD test purchase through
Square into QRBuddy's webhook handler, verify that the signed HMAC supporter
pass is successfully issued, stored in the browser vault, and restored via the
4-word backup phrase on a second device, then set
`SQUARE_CHECKOUT_ENABLED=true`.**

**Why**: An audit and commercial proposal do not generate revenue until real
money can change hands. QRBuddy's entire payment stack (Square online checkout,
webhook signature verification, license signing, token vault) is already
implemented and verified in isolation. The only operational blocker preventing
QRBuddy from earning its first dollar is proving the live purchase lifecycle and
flipping the checkout gate to open.
