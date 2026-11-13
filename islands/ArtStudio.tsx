import { useEffect, useRef, useState } from "preact/hooks";
import { checkBlobScannability } from "../utils/qr-decode.ts";

type Verdict = "idle" | "painting" | "clean" | "dud";

const MAX_PAYLOAD = 180;
const MAX_PROMPT = 220;
const ATTEMPTS = 3;

/**
 * Measured, not decorative: a flat landscape prompt paints a pale code on a
 * pale sky and the read gets thin. Texture and colour words are what give the
 * modules something to be made of.
 */
const SEEDS = [
  "coral reef, underwater, vivid",
  "neon city at night, rain",
  "marble and gold, ornate",
  "a misty pine forest at dawn",
];

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

/**
 * Art press: repaints a QR code into an illustrated raster plate.
 *
 * Every generation is decoded at the same 250px probe the Look gallery uses,
 * and a picture that does not read is retried rather than shown with a shrug.
 */
export default function ArtStudio() {
  const [url, setUrl] = useState("https://qrbuddy.app");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => {
    try {
      const params = new URLSearchParams(globalThis.location?.search ?? "");
      const incoming = params.get("url")?.trim();
      if (incoming && incoming.length <= MAX_PAYLOAD) {
        setUrl(incoming);
      }
    } catch {
      // Ignore malformed query params
    }
    return () => abort.current?.abort();
  }, []);

  const paint = async () => {
    if (verdict === "painting") return;
    setError("");
    setImage("");
    setVerdict("painting");
    setAttempt(0);
    abort.current?.abort();
    const controller = new AbortController();
    abort.current = controller;

    for (let round = 1; round <= ATTEMPTS; round++) {
      setAttempt(round);
      let started: { ok: boolean; id?: string; error?: string };
      try {
        const response = await fetch("/api/art", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Each retry leans harder on the code: attempt 1 is the pretty one,
          // attempt 3 is the one that reads. Take whatever lands.
          body: JSON.stringify({
            url: url.trim(),
            prompt: prompt.trim(),
            tune: round - 1,
          }),
          signal: controller.signal,
        });
        started = await response.json();
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "request failed");
        setVerdict("idle");
        return;
      }
      if (!started.ok || !started.id) {
        setError(started.error ?? "art failed");
        setVerdict("idle");
        return;
      }

      // Poll in short reads: a cold prediction runs 25–30s and a held request
      // is what the edge answers with an HTML page instead of JSON.
      let image = "";
      let failure = "";
      for (let tick = 0; tick < 60; tick++) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        if (controller.signal.aborted) return;
        let progress: {
          ok: boolean;
          status?: string;
          image?: string;
          error?: string;
        };
        try {
          const response = await fetch(`/api/art?id=${started.id}`, {
            signal: controller.signal,
          });
          progress = await response.json();
        } catch (caught) {
          if (controller.signal.aborted) return;
          failure = caught instanceof Error ? caught.message : "poll failed";
          break;
        }
        if (!progress.ok) {
          failure = progress.error ?? "the press jammed";
          break;
        }
        if (progress.status === "succeeded" && progress.image) {
          image = progress.image;
          break;
        }
        if (progress.status === "failed" || progress.status === "canceled") {
          failure = progress.error ?? "the press jammed";
          break;
        }
      }
      if (!image) {
        setError(failure || "the press went quiet");
        setVerdict("idle");
        return;
      }

      setImage(image);
      const read = await checkBlobScannability(
        await dataUrlToBlob(image),
        url.trim(),
      );
      if (read) {
        setVerdict("clean");
        return;
      }
      setVerdict("dud");
    }
  };

  const busy = verdict === "painting";
  const ready = url.trim().length > 0 && prompt.trim().length >= 3;

  return (
    <section class="w-full max-w-2xl space-y-4">
      <div class="qr-menu-pod p-4 sm:p-5 space-y-4">
        <label class="block space-y-1.5">
          <span class="qr-section-eyebrow">
            <span class="qr-section-pip" aria-hidden="true" />
            <span>Destination link</span>
          </span>
          <input
            value={url}
            maxLength={MAX_PAYLOAD}
            onInput={(e) => setUrl(e.currentTarget.value)}
            class="qr-input font-bold"
            placeholder="https://qrbuddy.app"
          />
        </label>

        <div class="space-y-2">
          <span class="qr-section-eyebrow">
            <span class="qr-section-pip" aria-hidden="true" />
            <span>Scene description</span>
          </span>
          <input
            value={prompt}
            maxLength={MAX_PROMPT}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            class="qr-input font-bold"
            placeholder="fireworks over a harbour at night"
          />
          <div class="flex flex-wrap gap-1.5 pt-0.5">
            {SEEDS.map((seed) => {
              const active = prompt === seed;
              return (
                <button
                  key={seed}
                  type="button"
                  onClick={() => setPrompt(seed)}
                  class={`min-h-[32px] rounded-full border-2 px-3 text-xs font-black transition-all ${
                    active
                      ? "border-[#1e1714] bg-[#ffbe0b] text-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
                      : "border-[#1e1714]/25 bg-[#fbf1e4] text-[#4a3f39] hover:border-[#1e1714] hover:text-[#1e1714]"
                  }`}
                >
                  {seed}
                </button>
              );
            })}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-3 pt-1">
          <button
            type="button"
            disabled={busy || !ready}
            onClick={paint}
            class="qr-pitch-cta px-6 disabled:opacity-45 disabled:pointer-events-none"
          >
            {busy ? "Pressing plate…" : "Paint QR plate"}
          </button>
          {busy && attempt > 1 && (
            <span class="text-xs font-bold text-[#5c4f47]">
              Proof {attempt} of {ATTEMPTS}
            </span>
          )}
          {!busy && verdict === "clean" && (
            <span class="inline-flex items-center gap-1 rounded-full border-2 border-[#1e1714] bg-[#dcfce7] px-3 py-1 text-xs font-black text-[#1e1714]">
              ✓ Scans clean
            </span>
          )}
          {!busy && verdict === "dud" && (
            <span class="inline-flex items-center gap-1 rounded-full border-2 border-amber-500 bg-amber-100 px-3 py-1 text-xs font-black text-amber-950">
              ⚠ Unreadable after {ATTEMPTS} proofs — try richer texture words
            </span>
          )}
          {error && (
            <span class="inline-flex items-center rounded-xl border-2 border-amber-500 bg-amber-50 px-3 py-1.5 text-xs font-black text-amber-950">
              {error}
            </span>
          )}
        </div>
      </div>

      <div class="qr-menu-pod p-3.5 mx-auto w-full max-w-[460px]">
        <div class="aspect-square w-full rounded-xl border-2 border-[#1e1714]/20 bg-[#fbf1e4] overflow-hidden flex items-center justify-center">
          {image
            ? (
              <img
                src={image}
                alt="Illustrated QR plate"
                class="w-full h-full object-contain"
              />
            )
            : (
              <span class="text-xs font-black uppercase tracking-wider text-[#5c4f47]/60">
                {busy ? "Pressing plate…" : "Plate preview"}
              </span>
            )}
        </div>
        {image && (
          <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
            <a
              href={image}
              download="qrbuddy-art.png"
              class="min-h-[42px] px-4 rounded-xl border-2 border-[#1e1714] bg-[#dcfce7] hover:bg-[#bbf7d0] text-sm font-black text-[#1e1714] shadow-[2px_2px_0_#1e1714] active:translate-y-[1px] inline-flex items-center transition-all"
            >
              ↓ Save PNG
            </a>
            <span class="text-xs font-bold text-[#5c4f47]">
              {verdict === "clean"
                ? "Raster proof · verified scannable"
                : "Raster proof · unverified"}
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
