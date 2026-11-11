# Art mode — a QR ControlNet, measured

**2026-11-09.** `/art`. The one lane in the studio that is not deterministic: a
picture either scans or it does not, so it sits behind its own route, its own
spend cap and its own decoder gate instead of beside looks that are vector work.

## The model

`andreasjansson/illusion` on Replicate — Monster Labs' QR ControlNet on SD 1.5.
**$0.0029 a run**, a few seconds on an L40S, 344 pictures per dollar.

Pinned version:
`75d51a73fce3c00de31ed9ab4358c73e8fc0f627dc8ce975818e653317cb919b`. It has not
moved since 2023, and a floating version would silently change the look of every
link that ever used it.

`POST /v1/predictions` with an explicit version is the only route that answers —
`/v1/models/<owner>/<name>/predictions` 404s for this one.

## What was measured

Twelve generations across two models, decoded at the same **250px probe** the
Look gallery uses. The probe is the bar: a picture that only reads at full size
is not a code, it is a poster.

| Setting                                          | 250px | 512px | Look                         |
| ------------------------------------------------ | ----- | ----- | ---------------------------- |
| illusion, `qr_code_content` only, cond 1.6–2.0   | fail  | fail  | a photo with no code in it   |
| illusion, `qr_code_content` only, cond 2.4       | fail  | fail  | a faint code ghost           |
| zylim `qr_code_controlnet`, cond 1.0–2.1         | pass  | pass  | a flat code over a photo     |
| illusion, **our control raster**, cond 2.0       | pass  | pass  | pale, code barely integrated |
| illusion, **our control raster**, cond 2.2 @1024 | fail  | pass  | prettiest, does not read     |
| illusion, **our control raster**, cond 2.4–2.6   | pass  | pass  | code made of picture         |

Two conclusions:

1. **Pass the control image.** Letting the model draw its own code from
   `qr_code_content` produces pictures that do not scan — its default
   `qrcode_background` is grey and the code it draws is not error-correction H.
   `utils/png.ts` hands it a greyscale H raster with a 4-module quiet zone, and
   the read rate goes from zero to reliable.
2. **Conditioning 2.6, 1024px, 50 steps.** 2.2 is the prettier picture and fails
   the probe. 2.6 still reads as a picture and survives. Below 2.0 nothing
   decodes.

`zylim0702/qr_code_controlnet` is the more popular model (850k runs) and its
codes read, but it paints the code _over_ the photo rather than out of it. Not
the look.

## Prompts

Flat landscape prompts paint a pale code on a pale sky and the read goes thin.
Texture and colour words are what the modules have to be made of, so the panel
offers four seeds that were tested rather than invented:

`coral reef, underwater, vivid` · `neon city at night, rain` ·
`marble and gold, ornate` · `a misty pine forest at dawn`

## Spend

`routes/api/art.ts` is the only route that spends money per request:

- **8 an hour per address**, 200 a day per isolate. In-memory, so it is a speed
  bump rather than a ledger — enough to stop a tab in a loop, cheap enough to
  need no storage.
- **180-character payload ceiling.** A dense code leaves the model no room, and
  a long link is the fastest way to buy a dud.
- A 402 from the press reads as _"the press is out of credit"_, not as their
  billing text.

## The gate

Every result is decoded at 250px in the browser before it is offered. A picture
that does not read is retried, up to three times, rather than shown with a
shrug. That is the line between this lane and the vector looks: the model may be
non-deterministic, the handover is not.

## Files

- `routes/art.tsx`, `islands/ArtStudio.tsx` — the panel
- `routes/api/art.ts` — the spend cap and the call
- `utils/replicate-art.ts` — the model, the pinned version, the field names
- `utils/png.ts` — greyscale PNG encoder for the control raster
