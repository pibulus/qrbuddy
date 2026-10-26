# 🛂 QRBuddy — Your Launch Homework & "How We Make Money Now" Playbook

> **Status (26 Oct 2026):** Live on `https://qrbuddy.app` &
> `https://qrbuddy.app/es` (`3f8f32f`) **Unit Tests:** `107/107` passing ·
> **Check/Lint/Types:** 100% green **Square Checkout (`create-checkout`):**
> **ENABLED & LIVE** (`~$32 USD / A$49` for 365 days, zero subscription traps)
> **Launch Arsenal Pack:** Refreshed in
> [`/Users/pabloalvarado/Projects/active/apps/launch-arsenal/kit/qrbuddy-arsenal/`](file:///Users/pabloalvarado/Projects/active/apps/launch-arsenal/kit/qrbuddy-arsenal/GOODS.md)
> (`20 pass, 3 warn, 0 fail`)

---

## 🚨 0. Two Huge Catches We Just Fixed

1. **Live Square Checkout Was Parked on `false` (`7059708`)**:
   - Probing
     `GET https://aqydpibnvlhcjcwosrti.supabase.co/functions/v1/create-checkout`
     initially returned `{"available": false}` because `SQUARE_CHECKOUT_ENABLED`
     was still `"false"` in Supabase secrets.
   - **Fixed & Verified Live:** Updated the Square line item to
     **`"QRBuddy Passport (1 year)"`**, set `SQUARE_CHECKOUT_ENABLED=true` on
     production Supabase (`aqydpibnvlhcjcwosrti`), and redeployed
     `create-checkout`. It now returns `{"available": true}` and opens live
     Square checkout.
2. **Launch Arsenal Was Stale (Last Run Oct 15 / July 20 Screenshots) & Framed
   QRBuddy as a "Small Quirky App" (`3f8f32f`)**:
   - The previous `launch-arsenal` output in `kit/qrbuddy-arsenal/` still pulled
     2025 copy (_"a small web app... 7 gradient styles... KABOOM"_) and had zero
     mention of **The QRBuddy Passport 🛂✨**, **Passport Field Report (90-day
     analytics & CSV export)**, **Smart Conditional Routing**, **Street-Safe QR
     Inspector**, or **Bilingual `/es`**.
   - **Fixed & Upgraded:**
     - Upgraded `.launch-hints.yaml`, `README.md`, and the homepage SEO/JSON-LD
       metadata (`routes/index.tsx` & `routes/es/index.tsx`) to position QRBuddy
       head-on against **Bitly, QR Code Monkey, QR Tiger, and Uniqode**.
     - Upgraded the **Bulk / Batch Generator**
       ([`useBatchGenerator.ts`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/hooks/useBatchGenerator.ts)
       &
       [`BatchSettings.tsx`](file:///Users/pabloalvarado/Projects/active/apps/qrbuddy/islands/extras/BatchSettings.tsx))
       so agencies, print shops, and restaurants can paste
       `Table 1 | https://...` rows and download a single ZIP containing
       **1000px PNGs + Vector SVGs + a print-shop `manifest.csv`**.
     - Re-ran `launch-arsenal`
       (`--capture-screenshots --full-docs --announce --web-research`) to
       generate a fresh mainstream-competitor pack in
       [`kit/qrbuddy-arsenal/`](file:///Users/pabloalvarado/Projects/active/apps/launch-arsenal/kit/qrbuddy-arsenal/GOODS.md).

---

## 🥊 Why QRBuddy Beats the "Big Boys" Head-On (Feature-for-Feature Matrix)

QRBuddy is **not** just for indie enthusiasts — it does everything the
$15–$49/month mainstream platforms do, plus four major things none of them can
touch:

| Capability                                                                           | Bitly / QR Code Generator              | QR Code Monkey       | QR Tiger                             | Uniqode (Beaconstac) | **QRBuddy (`qrbuddy.app`)**                                                                                                          |
| :----------------------------------------------------------------------------------- | :------------------------------------- | :------------------- | :----------------------------------- | :------------------- | :----------------------------------------------------------------------------------------------------------------------------------- |
| **Static QRs (URL, Wi-Fi, vCard, Email, SMS, Phone, Text)**                          | Free (pushes account wall)             | Free                 | Free                                 | Free                 | **✅ Free, instant, zero account wall, 1-bar smart auto-detect**                                                                     |
| **Vector SVG + High-Res Print PNG (up to 3000px)**                                   | Paid ($10–$35/mo)                      | Free                 | Paid ($7+/mo)                        | Paid ($15+/mo)       | **✅ Free (True Vector SVG + 1000/2000/3000px PNG)**                                                                                 |
| **Custom Center Logo + Geometry + Gradients + Frames**                               | Paid                                   | Free (dated 2014 UI) | Paid                                 | Paid                 | **✅ Free (8 luminance-tested palettes + custom gradient + logo + frames)**                                                          |
| **Real-Time Print Scannability / Contrast Verifier**                                 | Basic warning                          | ❌ None              | ❌ None                              | Paid                 | **✅ Live WCAG + Michelson contrast meter & browser test-decode**                                                                    |
| **Editable Dynamic QRs (change URL after printing)**                                 | $10–$35/mo (**14-day hostage trial!**) | $12+/mo              | $7–$37/mo (**500-scan cap on free**) | $15–$49/mo           | **✅ 5 Free Dynamic Links + 100 on Passport (`~$32 USD / A$49` once/yr, never held hostage)**                                        |
| **Smart Routing (Breakfast/Lunch/Dinner time-of-day, iOS/Android split, A/B split)** | Enterprise ($35–$199/mo)               | ❌                   | Advanced ($16–$37/mo)                | Pro ($49/mo)         | **✅ Built into `/edit` (Dayparting, Device Split, A/B Split, Sequential Links)**                                                    |
| **Branded Cover Pages + Social Bio Hub + White-Label**                               | Paid                                   | ❌                   | Paid                                 | Paid                 | **✅ Built in (3 themes, 4 starters, Social Hub, Media Hub, 1-click White-Label)**                                                   |
| **Deep Scan Analytics + CSV Export**                                                 | $35/mo+                                | $12/mo+              | $16/mo+                              | $49/mo+              | **✅ Passport Field Report 🛂 (7d/30d/90d, Top Cities, 24h Peak Rush Hour, Browser/Device split, Leaderboard, RFC-4180 CSV export)** |
| **Agency Bulk / Batch ZIP Generator**                                                | $35/mo+                                | Paid only            | $16/mo+                              | $49/mo+              | **✅ Built in (`Create` → `Bulk create`: exports 1000px PNG + Vector SVG + `manifest.csv`)**                                         |
| **Hosted PDF / Photo Gallery / Audio Mixtape + Inbound File Locker**                 | Basic PDF only                         | ❌                   | 5–20 MB file                         | Basic PDF            | **✅ Up to 500 MB drops, 10-photo slideshow, 10-track mixtape player, inbound file lockers, PIN & self-destruct**                    |
| **Safe QR Scanner / Redirect & Webpage Inspector**                                   | ❌                                     | ❌                   | ❌                                   | ❌                   | **✅ Street-Safe Inspector (unrolls 5 redirect hops + live visual webpage preview)**                                                 |
| **Bilingual EN / ES (`/es`)**                                                        | Partial                                | Machine-translated   | Partial                              | English-only         | **✅ Full native English (`/`) + LatAm/Mexican Spanish (`/es`)**                                                                     |

---

## ✅ Part 1: Your 10-Minute Human Homework Checklist (Do This First)

Before you post the launch links below, spend 10 minutes doing this quick taste
check on your Mac + phone:

1. **Test the Live Checkout Link (2 mins)**
   - Open [`https://qrbuddy.app`](https://qrbuddy.app), click **`Passport 🛂`**
     in the bottom dock, and click
     **`Get QRBuddy Passport — ~$32 USD (A$49) / year ✨`**.
   - Confirm it opens the live **Square Checkout** page showing **"QRBuddy
     Passport (1 year) — A$49.00"**.

2. **Test the Tactile Passport Card & Phone Pairing (2 mins)**
   - Inside the **`Passport 🛂`** modal, tap the **`🎲`** button next to your
     animal moniker (`Velvet Axolotl` → `Neon Capybara`, etc.).
   - Expand **`📲 Pair another device (QR & 4-word key)`** and scan that mini QR
     code with your phone camera. Confirm your phone opens `qrbuddy.app` and
     toasts **"✨ Synced with your QRBuddy Passport!"** with your exact moniker
     and pro status.

3. **Test the Upgraded Agency Bulk Generator (`Create` → `Bulk create`) (2
   mins)**
   - Click **`➕ Create`** → **`📦 Bulk create`**, select
     **`PNG + Vector SVG`**, paste:
     ```text
     Table 1 | https://qrbuddy.app/for/menus
     Table 2 | https://qrbuddy.app/for/music
     ```
   - Click **`Download Batch ZIP (QRs + manifest.csv)`** and verify the ZIP
     contains `qr_01_table_1.png`, `qr_01_table_1.svg`, `qr_02_table_2.png`,
     `qr_02_table_2.svg`, and `manifest.csv`.

4. **Test the Street-Safe Mini-Browser Inspector & Media Drops (2 mins)**
   - Tap **`🔍 Inspect`** on the home toolbar, drop any QR image, and watch the
     **Mini-Browser Preview Window** unroll redirects, show the `🔒 HTTPS`
     badge, and render the live webpage screenshot preview.
   - Drop 2–3 photos or MP3s onto the main input card, reorder them with
     `↑`/`↓`, upload, and inspect the **Passport Field Report 🛂** on
     `/f/{code}`.

5. **Check the Spanish (`/es`) Flow (2 mins)**
   - Click **`🇲🇽 ES`** in the bottom footer dock (`https://qrbuddy.app/es`) and
     verify the localized flow.

---

## 💰 Part 2: How QRBuddy Makes Money Now (The 4 Mainstream Conversion Engines)

At **A$49 (`~$32 USD`) per Passport**, **just 21 Passports/month =
~A$1,029/mo** (~A$12.3k/yr) with near-zero marginal cost (Cloudflare R2 +
Supabase).

### Engine 1: The Built-In Trojan Horse Viral Loop (Live in Code)

Every time a free user shares a photo gallery, audio mixtape, or file drop
(`/f/{code}`), or puts a Cover Page on a Dynamic QR (`/r?code=...`), every
visitor who scans it sees our tactile Neo-Toybrut pill at the bottom:

> **`⚡ Made with QRBuddy · Make yours free →`** _(or
> `⚡ Hecho con QRBuddy · Haz el tuyo gratis →`)_

- **How it converts:** Clients, venue guests, and agencies click that pill to
  build their own QR — and when a business, designer, or event organizer wants
  **1-Click Clean White-Label Pages** (zero QRBuddy branding), **100 Dynamic
  Links**, or **500 MB drops**, they buy the **QRBuddy Passport** right from
  their `OwnerStrip` or Cover Page settings.

### Engine 2: The "Bitly / QR Tiger Hostage Rescue" Pitch for Restaurants, Agencies & Print Shops (`/for/menus` & `/es/menus`)

- **The Pain:** Thousands of restaurants, print shops, and small agencies got
  burned by "free" QR generators (Bitly / QR Code Generator / QR Tiger) that
  deactivated their printed menus and packaging after 14 days or 500 scans and
  demanded $120–$420/year.
- **Our Pitch:**
  - Free tier gives you unlimited static QRs (with vector SVG + custom logos),
    Batch ZIP exports (`PNG + SVG + manifest.csv`), and 5 editable dynamic QRs
    that never hold your print run hostage.
  - **QRBuddy Passport (`~$32 USD / A$49` once for a whole year — less than 1
    month of Bitly):** Gives a restaurant group or agency **100 Editable Dynamic
    Links**, **Breakfast / Lunch / Dinner automatic time-of-day menu routing**
    on a single printed sticker, **90-day Peak Rush Hour & City stats with CSV
    export**, **Clean White-Label cover pages**, and **500 MB PDF/menu
    hosting**.

### Engine 3: Indie Musicians, DJs, Merch Tables & Labels (`/for/music` & `/es/musica`)

- **The Pain:** Bands, labels, and DJs printing vinyl/cassette inserts, gig
  posters, or merch signs want to drop an EP, stem pack, or press kit without
  paying for SoundCloud Pro + Linktree + WeTransfer Pro.
- **Our Pitch:** Drop MP3/WAV/FLAC files straight into QRBuddy → instant
  playable **Mixtape Page**, plus the **Passport Field Report** shows a
  **Track-by-Track Play Leaderboard** (which track people actually finished!)
  and **Top Cities** scanning their posters.

### Engine 4: Weddings, Conferences & Event Planners (`/for/weddings` & `/es/bodas`)

- **The Pain:** Event QR tools charge $49–$99 _per event_ just to share a photo
  album, schedule cover page, or guest upload locker without ugly ads.
- **Our Pitch:** One **QRBuddy Passport (`~$32 USD`)** gives an event planner,
  photographer, or venue **Clean White-Label photo slideshows**, **inbound File
  Collection Lockers**, **500 MB heavy-duty drops**, and **100 editable links**
  for the entire year.

---

## 🚀 Part 3: Ready-to-Fire Launch Posts (Mainstream Competitor + Builder Angles)

> **Full Launch Arsenal Dashboard & Assets:**
>
> - Interactive HTML Dashboard:
>   [`/Users/pabloalvarado/Projects/active/apps/launch-arsenal/kit/qrbuddy-arsenal/index.html`](file:///Users/pabloalvarado/Projects/active/apps/launch-arsenal/kit/qrbuddy-arsenal/index.html)
> - Copy Pack:
>   [`/Users/pabloalvarado/Projects/active/apps/launch-arsenal/kit/qrbuddy-arsenal/GOODS.md`](file:///Users/pabloalvarado/Projects/active/apps/launch-arsenal/kit/qrbuddy-arsenal/GOODS.md)

### 1. Show HN (Hacker News)

- **Title:**
  `Show HN: QRBuddy – Full-stack QR studio (SVG, dynamic routing, bulk ZIPs, street-safe inspector) without hostage subscriptions`
- **URL:** `https://qrbuddy.app`
- **First Comment:**

```text
Hey HN — Pablo here (Melbourne, Australia).

I built QRBuddy (https://qrbuddy.app) to go head-to-head with the big commercial QR platforms (Bitly / QR Code Generator, QR Code Monkey, QR Tiger, Uniqode) after watching local restaurants, designers, and friends get burned by two things:

1. Hostage pricing: You print a QR code on 1,000 menus or product boxes using a "free trial" dynamic QR generator, and 14 days later the code stops working unless you pay $35/month ($420/year) forever.
2. Sketchy street QRs: Scanning a random QR sticker on a parking meter or poster usually forces you to open a blind redirect chain in your browser with all your cookies attached.

We built QRBuddy to do everything the enterprise QR platforms do — plus a few things they don't — without the dark patterns:

- Print-Verified Design Engine (Free): 8 luminance-capped gradient palettes (<= 0.40 relative luminance, >= 2:1 contrast), custom 2-stop linear/radial gradients, dot/corner geometry, center logo upload, SCAN ME frames, live WCAG + Michelson contrast meter, and 3000px PNG + true vector SVG export.
- Smart Dynamic QRs & Conditional Routing: Edit destinations anytime after printing, schedule time-of-day routing (e.g., one printed table QR switches from Breakfast to Lunch to Dinner automatically), split by iOS App Store vs. Android Play Store, run weighted A/B splits, or attach branded Cover Pages.
- Agency Bulk / Batch Generator (Free): Paste a list of URLs (or "Table 1 | https://..." rows) and download a single ZIP containing 1000px PNGs, vector SVGs, and a print-shop manifest.csv.
- Media Drops & Inbound File Lockers: Drop photos for an instant swipeable gallery, MP3s/WAVs for a playable mixtape, or open a QR File Locker that others can scan to upload files to you.
- Street-Safe QR Inspector: Click "Inspect" to scan or drop any QR image. Our `/api/peek` endpoint walks up to 5 redirect hops (blocking private/ULA/CGNAT IPs on every hop against SSRF), checks HTTPS, and renders a live webpage screenshot preview before you visit.
- Zero Accounts / Sovereign 4-Word Passport: No email or password walls. Your browser mints a cryptographic Passport that syncs across laptop and phone via a `#` fragment QR code or 4-word key so credentials never touch server access logs.
- Bilingual: Full English (https://qrbuddy.app) and LatAm/Mexican Spanish (https://qrbuddy.app/es).

How it makes money without holding print runs hostage:
Static QRs, vector SVG export, custom logos, Bulk ZIP export, the Street-Safe Inspector, 5 editable dynamic QRs, and 50 MB file drops are free. If a business, venue, or agency needs heavy-duty capacity — 100 editable dynamic links, 500 MB file drops, 1-click white-label pages, and the 90-day Passport Field Report (top cities, 24h peak rush hour window, track/photo leaderboard, and RFC-4180 CSV export) — the QRBuddy Passport is ~$32 USD (A$49) once for 365 days with no auto-renewing subscription.

Happy to answer any questions about the contrast math, the redirect inspector, or the zero-account Passport architecture!
```

---

### 2. Reddit — `r/SideProject` / `r/smallbusiness` / `r/graphic_design` / `r/webdev`

- **Title:**
  `I built a full-stack alternative to Bitly & QR Code Monkey that doesn't hold printed QR codes hostage for $35/mo (Vector SVG, time-of-day routing, bulk ZIP+CSV, 90-day analytics)`
- **Body:**

```text
Every time a restaurant, designer, or small business prints menus, packaging, or event signage, they run into the same trap: mainstream QR generators bait you with a "free" dynamic code, wait until you've printed 500 copies, and then deactivate the link after 14 days unless you pay $30–$35/month forever.

So I built **QRBuddy** (https://qrbuddy.app — and in Spanish at https://qrbuddy.app/es) to compete directly with the big platforms while keeping everything fast, transparent, and print-safe:

- **Print-Verified Vector SVG & 3000px PNG (Free):** 8 luminance-tested gradient palettes + custom gradient builder, custom center logos, dot/corner shapes, frames, and a live WCAG contrast meter so every code scans on the first try.
- **Agency Bulk ZIP + CSV Manifest (Free):** Paste `Table 1 | https://...` rows and download a single ZIP with 1000px PNGs, vector SVGs, and a `manifest.csv` ready for your print shop.
- **Smart Dynamic Routing:** Change where a printed QR points anytime, set automatic time-of-day schedules (Breakfast / Lunch / Dinner on one QR code), split iOS vs. Android, or add a branded Cover Page.
- **Drop PDFs, Photo Galleries, Audio Mixtapes, or File Lockers:** Drop files straight onto the input bar to create an instant gallery, playable audio player, or an inbound dropbox where event guests can upload photos to you.
- **Street-Safe QR Inspector (`🔍 Inspect`):** Scan any sketchy QR code to unroll up to 5 redirect hops and see a live visual preview of the destination webpage before opening it.
- **No Account Wall:** Syncs across your laptop and phone via a scannable Passport QR or 4-word recovery key.

Static QRs, vector SVGs, bulk ZIPs, 5 dynamic links, and 50 MB drops are 100% free. For businesses and agencies that want 100 dynamic links, 500 MB drops, 1-click white-label pages, and the 90-day Passport Field Report (top cities, peak rush hour, item leaderboard & CSV export), the QRBuddy Passport is a flat ~$32 USD (A$49) for a full year with zero auto-renewals.

Would love feedback from anyone who prints QRs for clients, menus, or packaging!
```

---

### 3. Reddit / LatAm & Mexico Communities (`r/mexico`, `r/taquerosprogramadores`, `r/emprendedor`)

- **Title:**
  `Armé QRBuddy en Español: alternativa completa a Bitly y QR Code Monkey sin suscripciones trampa (SVG vectorial, lotes ZIP+CSV, rutas por horario y analíticas)`
- **Body:**

```text
Qué onda banda — soy Pablo (mexicano-australiano) y armé **QRBuddy en Español** (https://qrbuddy.app/es).

Me harté de ver cómo a restaurantes, imprentas, diseñadores y negocios les secuestran sus códigos QR impresos después de 14 días de "prueba gratis" cobrándoles $600+ MXN al mes solo por mantener vivo un link.

Armamos QRBuddy para que haga todo lo que hacen las plataformas grandes (Bitly, QR Tiger, QR Code Monkey), pero mejor y sin trampas:

- **Diseño verificado para imprenta (Gratis):** 8 paletas con luminancia controlada (para que cualquier cámara los lea al instante), degradados personalizados, logo central, marcos y exportación en **SVG vectorial** + PNG de hasta 3000px.
- **Generador en Lote para Imprentas (Gratis):** Pega varios links (ej. `Mesa 1 | https://...`) y descarga un ZIP con todos los PNGs, SVGs vectoriales y un archivo `manifest.csv` listo para imprenta.
- **QRs Dinámicos y Rutas Inteligentes:** Cambia el destino de un QR ya impreso cuando quieras, programa horarios automáticos (Menú de Desayuno en la mañana / Cena en la noche en el mismo QR), o divide por iOS y Android.
- **Archivos, Galerías, Mixtapes y Buzones:** Suelta un PDF de tu menú, hasta 10 fotos para una galería, pistas MP3 para un mixtape reproducible, o abre un buzón para recibir archivos.
- **Inspector Callejero Seguro (`🔍 Revisar`):** Escanea cualquier QR sospechoso para desenrollar redireccionamientos ocultos y ver una vista previa visual de la página antes de abrirla.
- **Cero cuentas ni contraseñas:** Tu biblioteca se sincroniza entre tu cel y tu compu escaneando tu tarjeta de Pasaporte QR o con tu clave de 4 palabras.

Los QRs estáticos, exportación SVG, lotes ZIP, el inspector de seguridad, 5 links dinámicos y envíos de 50 MB son 100% gratis. Si un negocio o agencia ocupa 100 links dinámicos, entregas de 500 MB, páginas en marca blanca (White-Label) y el **Reporte de Campo de 90 días** (ciudades top, hora pico, ranking por archivo y exportación CSV), el Pasaporte QRBuddy cuesta ~$32 USD al año en un solo pago sin renovación automática.

¡Échenle un ojo en https://qrbuddy.app/es y díganme qué les parece!
```
