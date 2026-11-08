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

const PILL =
  "min-h-[44px] rounded-xl border-[3px] border-[#1e1714] px-4 font-black transition-[transform,background-color] duration-[70ms] active:translate-y-[1px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]";

async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  const response = await fetch(dataUrl);
  return await response.blob();
}

/**
 * Art mode: a QR ControlNet repaints the code into a picture.
 *
 * The one honest thing this panel does is refuse to hand over a dud. Every
 * generation is decoded at the same 250px probe the Look gallery uses, and a
 * picture that does not read is retried rather than shown with a shrug.
 */
export default function ArtStudio() {
  const [url, setUrl] = useState("https://qrbuddy.app");
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState("");
  const [verdict, setVerdict] = useState<Verdict>("idle");
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const abort = useRef<AbortController | null>(null);

  useEffect(() => () => abort.current?.abort(), []);

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
      let data: { ok: boolean; image?: string; error?: string };
      try {
        const response = await fetch("/api/art", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: url.trim(), prompt: prompt.trim() }),
          signal: controller.signal,
        });
        data = await response.json();
      } catch (caught) {
        if (controller.signal.aborted) return;
        setError(caught instanceof Error ? caught.message : "request failed");
        setVerdict("idle");
        return;
      }
      if (!data.ok || !data.image) {
        setError(data.error ?? "art failed");
        setVerdict("idle");
        return;
      }
      setImage(data.image);
      const read = await checkBlobScannability(
        await dataUrlToBlob(data.image),
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
      <div class="rounded-2xl border-[3px] border-[#1e1714] bg-[#fffef7] p-4 space-y-3">
        <label class="block space-y-1.5">
          <span class="block text-[11px] font-black uppercase tracking-wider opacity-60">
            Link
          </span>
          <input
            value={url}
            maxLength={MAX_PAYLOAD}
            onInput={(e) => setUrl(e.currentTarget.value)}
            class="w-full min-h-[44px] rounded-xl border-[3px] border-[#1e1714] bg-[#fbf1e4] px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]"
            placeholder="https://qrbuddy.app"
          />
        </label>

        <div class="space-y-1.5">
          <span class="block text-[11px] font-black uppercase tracking-wider opacity-60">
            Picture
          </span>
          <input
            value={prompt}
            maxLength={MAX_PROMPT}
            onInput={(e) => setPrompt(e.currentTarget.value)}
            class="w-full min-h-[44px] rounded-xl border-[3px] border-[#1e1714] bg-[#fbf1e4] px-3 font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]"
            placeholder="fireworks over a harbour at night"
          />
          <div class="flex flex-wrap gap-1.5">
            {SEEDS.map((seed) => (
              <button
                key={seed}
                type="button"
                onClick={() => setPrompt(seed)}
                class="min-h-[32px] rounded-lg border-2 border-[#1e1714]/30 px-2 text-[11px] font-bold hover:border-[#1e1714] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e1714] focus-visible:ring-offset-2 focus-visible:ring-offset-[#fbf1e4]"
              >
                {seed}
              </button>
            ))}
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={busy || !ready}
            onClick={paint}
            class={`${PILL} bg-[#ffd04a] disabled:opacity-40`}
          >
            {busy ? "Painting…" : "Paint a code"}
          </button>
          {busy && attempt > 1 && (
            <span class="text-[11px] font-bold opacity-60">
              attempt {attempt} of {ATTEMPTS}
            </span>
          )}
          {!busy && verdict === "clean" && (
            <span class="text-[11px] font-black text-[#2f6b3a]">
              Scans clean
            </span>
          )}
          {!busy && verdict === "dud" && (
            <span class="text-[11px] font-black opacity-60">
              Nothing readable after {ATTEMPTS} tries — try another picture
            </span>
          )}
          {error && (
            <span class="text-[11px] font-black text-[#8a2b1f]">{error}</span>
          )}
        </div>
      </div>

      <div class="rounded-2xl border-[3px] border-[#1e1714] bg-[#fffef7] p-3 mx-auto w-full max-w-[460px]">
        <div class="aspect-square w-full rounded-xl bg-[#fbf1e4] overflow-hidden flex items-center justify-center">
          {image
            ? (
              <img
                src={image}
                alt="A QR code painted into a picture"
                class="w-full h-full object-contain"
              />
            )
            : (
              <span class="text-[11px] font-black uppercase tracking-wider opacity-35">
                {busy ? "Painting…" : "Nothing painted yet"}
              </span>
            )}
        </div>
        {image && (
          <div class="mt-3 flex flex-wrap gap-2">
            <a
              href={image}
              download="qrbuddy-art.png"
              class={`${PILL} bg-[#c8f08f] inline-flex items-center`}
            >
              Save PNG
            </a>
            <span class="text-[11px] font-bold opacity-50 self-center">
              Raster, not vector. The picture is the artifact.
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
