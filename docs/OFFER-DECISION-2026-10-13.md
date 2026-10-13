# QRBuddy Offer & Product Decision — 13 October 2026

**Author**: Antigravity (Gemini 3.8 Flash)\
**Target Repository**: `/Users/pabloalvarado/Projects/active/apps/qrbuddy`\
**Reference Commit**: `7238849` (Working tree uncommitted UX follow-ups
preserved; tests: 55 passed)

---

## 1. Recommendation Summary

Keep QRBuddy as an **exceptional, general-purpose QR generator** whose playful
visual identity, pastel-punk styling, and creative extensions (mixtapes,
slideshows, editable links) belong to everyone—not just musicians or niche craft
shops.

### Corrected Code Baseline

1. **Free Dynamic Links**: In
   [`create-dynamic-qr/index.ts`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/supabase/functions/create-dynamic-qr/index.ts#L48-L54),
   free creation is throttled hourly (10/hr free, 100/hr with pass), not by a
   3-link ceiling. Free links have no mandatory expiry.
2. **Direct Redirects**: In
   [`redirect-qr/index.ts`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/supabase/functions/redirect-qr/index.ts#L42-L51),
   dynamic links already issue direct HTTP 302 redirects with zero ads or
   interstitials.
3. **Media Storage**: In
   [`upload-file/index.ts`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/supabase/functions/upload-file/index.ts#L275-L335),
   multi-file uploads store directly in Supabase Storage (`qr-files` bucket),
   not Cloudflare R2.
4. **Offer & Price**: Offer the **Maker Pass at A$49 AUD / year** (one-time
   payment, 365 days, no auto-renewal). Do not lower price without evidence.

---

## 2. Three Most Valuable Everyday Gaps

Compared with leading tools ([Hovercode](https://hovercode.com/pricing/),
[Bitly QR Code Generator](https://www.qr-code-generator.com/pricing/)), QRBuddy
has three genuine usability gaps in everyday creation:

### Gap 1: Vector Print Frame Export (Framed SVG)

- **What's Missing**: When users add the print frame ("SCAN ME") via
  `frameConfig` in
  [`QRCanvas.tsx`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/islands/QRCanvas.tsx#L173-L176),
  clicking "Save PNG" bakes the caption into a canvas. Clicking "SVG" in
  [`DesignTab.tsx`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/islands/create-modal/DesignTab.tsx#L124-L129)
  triggers raw library download, completely dropping the frame and text.
- **Why It Matters**: Professional printers and sign/sticker makers require
  vector graphics. Forcing users to choose between a raster PNG or losing their
  frame in SVG breaks print workflows.

### Gap 2: Saved Brand Kits (Local Palette & Logo Presets)

- **What's Missing**: Custom colors and logos in
  [`LogoUploader.tsx`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/islands/LogoUploader.tsx)
  and
  [`GradientCreator.tsx`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/islands/GradientCreator.tsx)
  are ephemeral signals. Users making batches or returning next week must
  re-configure from scratch.
- **Why It Matters**: Anyone making codes for a business, classroom, or project
  makes more than one. Re-configuring every time creates friction.

### Gap 3: Custom Slugs for Dynamic Redirects

- **What's Missing**: Dynamic codes generate opaque hashes (`/r?code=a8f9b2c1`).
- **Why It Matters**: Phone camera scanners show the URL in a yellow preview
  chip before opening. A readable slug like `qrbuddy.app/r/menu` or
  `qrbuddy.app/r/event` looks legitimate and trustworthy.

---

## 3. The Recommended Paid Offer: Maker Pass

- **Name**: QRBuddy Maker Pass
- **Hypothesis Price**: **A$49 AUD / 365 days** (one-time payment, no
  auto-renewal).
- **Billing**: Upfront annual pass via Square.

### What Remains Free

- Unlimited static QR code creation (offline, permanent, zero server cost).
- Full design engine: 8 gradient themes, custom gradient maker, center logo
  upload, "SCAN ME" frame.
- High-res PNG and basic SVG vector downloads.
- All QR content types: WiFi, vCard, Email, SMS, Phone, Text, URLs.
- Standard dynamic links (10 creations/hour, direct 302 redirects, permanent
  unless author sets expiry).
- Standard media drops (up to 10 photos/tracks, 30-day retention).

### The Three Principal Paid Benefits

1. **Custom Slugs & Priority Fleet**: Set custom redirect slugs (`/r/your-slug`)
   and up to 100 dynamic link creations/hour.
2. **Saved Brand Kits & Print-Ready Vector Frames**: Save brand palettes/logos
   across sessions in the browser vault; export framed vector SVGs for print
   shops.
3. **1-Year Hosted Media Retention**: Hosted photo slideshows and audio mixtapes
   stay live for 365 days (instead of 30 days), up to 100 MB per share.

### Day 366 Lifecycle (Entitlement Expiry)

- **Do dynamic redirects keep working?** **YES.** QRBuddy never breaks printed
  codes. Redirects continue resolving indefinitely under fair-use limits.
- **Can the owner edit the destination?** **NO.** Edit controls in
  [`EditQRForm.tsx`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/islands/EditQRForm.tsx)
  freeze on day 366 until renewed.
- **What happens to hosted media (audio/photos)?** Media enters a **30-day grace
  period** with an owner warning in
  [`OwnerStrip.tsx`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/islands/OwnerStrip.tsx),
  then files are pruned by
  [`cleanup-expired`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/supabase/functions/cleanup-expired/index.ts).
- **Can renewal restore an expired page?** Renewing during the grace period
  extends retention for another 365 days.

### Implementation Status

- **Exists Today**: Direct 302 redirects, PNG frame composite, hourly rate
  limiting, Square checkout & HMAC token verification.
- **Requires Development**: Custom slug routing (`/r/:slug`), framed SVG export
  generator, 365-day expiry branch in `upload-file`, and local brand kit
  storage.

---

## 4. The Smallest Useful Release

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Core Generator Fix (Free)                                           │
│    • Framed SVG export (bake frame + caption into downloadable SVG).   │
│    • Clear UI label: "Static codes work forever. Dynamic links never  │
│      expire unless you set a date."                                    │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Paid Offer Implementation                                           │
│    • Add `custom_slug` support to `dynamic_qr_codes` and `redirect-qr`.│
│    • Set `expires_at = NOW() + 365 days` for paid `upload-file` calls. │
│    • Align `PRICING_TIERS.pro` in `types/pricing.ts` and PricingModal. │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Contextual Discovery (2 Touchpoints)                                │
│    • In CreateModal Behavior tab: "Need a custom camera link like     │
│      /r/menu? Custom slugs come with the Maker Pass."                  │
│    • In OwnerStrip: "Temporary 30-day share. Keep active for 1 year    │
│      with the Maker Pass."                                             │
└────────────────────────────────────────────────────────────────────────┘
```

### UI Copy Example (QRBuddy Voice)

> **Maker Pass · A$49 / 365 days**\
> _"Make it yours. Keep it running. Save your custom brand colors and logos,
> pick custom short links for camera previews, and keep photo or audio shares
> live for a full year. No subscriptions, no renewal surprises."_

---

## 5. Five-User Testing Protocol (Pre-Implementation)

Observe 5 everyday creators (e.g., 1 hospitality operator, 1 teacher/event
organizer, 1 office admin, 1 physical merch maker, 1 designer) without sales
pressure.

### Tasks & Questions

1. **Task 1 (Design & Print)**: "Create a QR code for your project with your
   custom colors, logo, and a frame. Download it for print."\
   _Observe_: Did they need vector format? Was re-configuring colors annoying?
2. **Task 2 (Dynamic Link)**: "Make the QR code editable so you can change the
   target URL next month."\
   _Observe_: Do they care about the slug (`/r?code=...` vs `/r/name`)? Did they
   fear the code would expire?
3. **Task 3 (Offer Inspection)**: Present the Maker Pass card (A$49/yr).\
   _Inquire_: "Which benefits matter for your project? Is free sufficient? Would
   you buy this today or close the dialog?"

---

## 6. Implementation Prompt: Work Package 1

```markdown
Work in /Users/pabloalvarado/Projects/active/apps/qrbuddy.

### Objective

Implement framed SVG export in QRCanvas and align Maker Pass copy in
PricingModal.

### File Scope

- islands/QRCanvas.tsx
- islands/create-modal/DesignTab.tsx
- types/pricing.ts
- islands/PricingModal.tsx

### Requirements

1. Framed SVG Export:
   - In `islands/QRCanvas.tsx`, when `qr-export` fires with `format: "svg"` and
     `frameConfig.enabled` is true, wrap the SVG output in an SVG container with
     border and centered caption matching the PNG composite.
   - If frame is disabled, retain the existing
     `qr.download({ extension: "svg" })`.
2. Pricing Copy Alignment:
   - In `types/pricing.ts` and `islands/PricingModal.tsx`, update
     `PRICING_TIERS.pro`:
     - Name: "Maker Pass"
     - Price: 49 AUD / year (no auto-renewal)
     - Features:
       1. "Custom camera preview links (e.g. /r/your-slug)"
       2. "1-year retention for hosted photo and mixtape shares"
       3. "Save custom brand styles and export vector print kits"
3. Design Conventions:
   - Preserve Soft Neo Toybrut styling (cream background, chunky borders,
     CardModal frame).
   - UI copy speaks as QRBuddy (no "we/us").

### Verification & Handoff

- Run `deno task test:unit` (all tests pass).
- Run `deno task check` (formatting and linting).
- Verify framed SVG download outputs valid vector XML with QR and caption.
```
