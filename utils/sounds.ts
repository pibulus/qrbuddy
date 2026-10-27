/**
 * 🪶 WEIGHTLESS ("Elsewhere" Edition for QRBuddy)
 * Procedural Web Audio synthesis engine — 0kb assets, 100% tactile soul.
 *
 * Tuned with splooshy, scloppy, bloopy resonant lowpass filter voices,
 * harmonic partials, pitch-bend envelopes, stereo micro-panning, and
 * positional scale mapping (`noteAt` / `playAt`).
 */

const MASTER_LEVEL = 0.65;
const MIN_GAIN = 0.0001;
const STORAGE_KEY = "softstack:sound";

// Utility: Convert cents to frequency ratio
const centsToRatio = (cents: number): number => Math.pow(2, cents / 1200);

export interface WeightlessPartial {
  ratio: number;
  gain: number;
  type?: OscillatorType;
}

export interface WeightlessVoice {
  type: OscillatorType;
  lowpass?: number;
  q?: number;
  attack?: number;
  bendCents?: number;
  partials?: WeightlessPartial[];
}

export interface WeightlessNote {
  frequency: number;
  duration: number;
  gain?: number;
  offset?: number;
  voice?: string;
}

export interface WeightlessCue {
  cooldownMs?: number;
  detuneCents?: number;
  variants: WeightlessNote[][];
}

export interface WeightlessPlayOptions {
  frequency?: number;
  gain?: number;
  delay?: number;
  force?: boolean;
}

export interface WeightlessNoteAtOptions {
  total?: number;
  offset?: number;
}

export interface WeightlessPlayAtOptions
  extends WeightlessNoteAtOptions, WeightlessPlayOptions {}

export interface WeightlessOptions {
  enabled?: boolean;
  volume?: number;
  sharedState?: boolean;
  randomness?: number;
  masterLevel?: number;
  panWidth?: number;
  humanizeMs?: number;
  compressor?: boolean;
  cues?: Record<string, WeightlessCue>;
  voices?: Record<string, WeightlessVoice>;
  scale?: number[];
}

export interface SoundEffects {
  click: (options?: WeightlessPlayOptions) => boolean;
  select: (options?: WeightlessPlayOptions) => boolean;
  bloop: (options?: WeightlessPlayOptions) => boolean;
  sclop: (options?: WeightlessPlayOptions) => boolean;
  sploosh: (options?: WeightlessPlayOptions) => boolean;
  shuffle: () => void;
  success: (options?: WeightlessPlayOptions) => boolean;
  copy: (options?: WeightlessPlayOptions) => boolean;
  error: (options?: WeightlessPlayOptions) => boolean;
  hover: (options?: WeightlessPlayOptions) => boolean;
  toggleOn: (options?: WeightlessPlayOptions) => boolean;
  toggleOff: (options?: WeightlessPlayOptions) => boolean;
  notify: (options?: WeightlessPlayOptions) => boolean;
  play: (cueName: string, options?: WeightlessPlayOptions) => boolean;
  playAt: (
    cueName: string,
    index: number,
    opts?: WeightlessPlayAtOptions,
  ) => boolean | undefined;
  noteAt: (index: number, opts?: WeightlessNoteAtOptions) => number | null;
  setEnabled: (enabled: boolean) => void;
  setVolume: (volume: number) => void;
  isAudioEnabled: () => boolean;
}

/**
 * Default Voice Presets — Elsewhere Liquid & Soft Neo-Toybrut Voices
 */
export const WEIGHTLESS_VOICES: Record<string, WeightlessVoice> = {
  bloop: {
    type: "sine",
    lowpass: 2200,
    q: 3.2,
    attack: 0.005,
    bendCents: 240,
    partials: [{ ratio: 2.0, gain: 0.16, type: "sine" }],
  },
  sclop: {
    type: "triangle",
    lowpass: 1600,
    q: 2.8,
    attack: 0.006,
    bendCents: -190,
    partials: [
      { ratio: 0.667, gain: 0.22, type: "sine" },
      { ratio: 1.5, gain: 0.12, type: "sine" },
    ],
  },
  sploosh: {
    type: "sine",
    lowpass: 2600,
    q: 3.6,
    attack: 0.005,
    bendCents: 160,
    partials: [
      { ratio: 1.5, gain: 0.18, type: "triangle" },
      { ratio: 2.02, gain: 0.12, type: "sine" },
    ],
  },
  tap: {
    type: "triangle",
    lowpass: 2800,
    q: 1.8,
    attack: 0.006,
    bendCents: 80,
    partials: [{ ratio: 2.01, gain: 0.2, type: "sine" }],
  },
  bloom: {
    type: "sine",
    lowpass: 3800,
    q: 1.4,
    attack: 0.01,
    partials: [{ ratio: 1.5, gain: 0.12, type: "triangle" }],
  },
  knock: {
    type: "sine",
    lowpass: 1400,
    q: 2.0,
    attack: 0.005,
    bendCents: -60,
  },
  sparkle: {
    type: "sine",
    lowpass: 4300,
    q: 1.5,
    attack: 0.004,
    partials: [{ ratio: 2, gain: 0.15, type: "sine" }],
  },
  warn: {
    type: "sine",
    lowpass: 1200,
    q: 2.2,
    attack: 0.007,
    bendCents: -45,
  },
};

/**
 * Default Sound Cues
 */
export const WEIGHTLESS_CUES: Record<string, WeightlessCue> = {
  select: {
    cooldownMs: 40,
    detuneCents: 9,
    variants: [
      [{ frequency: 540, duration: 0.048, gain: 0.024, voice: "bloop" }],
      [{ frequency: 620, duration: 0.044, gain: 0.021, voice: "tap" }],
      [{ frequency: 580, duration: 0.046, gain: 0.023, voice: "bloop" }],
    ],
  },
  bloop: {
    cooldownMs: 45,
    detuneCents: 8,
    variants: [
      [
        { frequency: 480, duration: 0.065, gain: 0.028, voice: "bloop" },
        {
          frequency: 680,
          offset: 0.028,
          duration: 0.075,
          gain: 0.02,
          voice: "bloom",
        },
      ],
      [
        { frequency: 520, duration: 0.068, gain: 0.028, voice: "bloop" },
        {
          frequency: 740,
          offset: 0.03,
          duration: 0.075,
          gain: 0.018,
          voice: "sparkle",
        },
      ],
    ],
  },
  sclop: {
    cooldownMs: 60,
    detuneCents: 8,
    variants: [
      [
        { frequency: 410, duration: 0.065, gain: 0.028, voice: "sclop" },
        {
          frequency: 285,
          offset: 0.032,
          duration: 0.08,
          gain: 0.024,
          voice: "sclop",
        },
      ],
      [
        { frequency: 385, duration: 0.07, gain: 0.028, voice: "sclop" },
        {
          frequency: 265,
          offset: 0.035,
          duration: 0.085,
          gain: 0.022,
          voice: "knock",
        },
      ],
    ],
  },
  sploosh: {
    cooldownMs: 90,
    detuneCents: 10,
    variants: [
      [
        { frequency: 392.0, duration: 0.065, gain: 0.024, voice: "sploosh" },
        {
          frequency: 523.25,
          offset: 0.038,
          duration: 0.075,
          gain: 0.026,
          voice: "bloop",
        },
        {
          frequency: 659.25,
          offset: 0.078,
          duration: 0.095,
          gain: 0.022,
          voice: "sploosh",
        },
      ],
      [
        { frequency: 440.0, duration: 0.065, gain: 0.024, voice: "sploosh" },
        {
          frequency: 587.33,
          offset: 0.04,
          duration: 0.075,
          gain: 0.026,
          voice: "bloop",
        },
        {
          frequency: 783.99,
          offset: 0.082,
          duration: 0.095,
          gain: 0.022,
          voice: "bloom",
        },
      ],
    ],
  },
  copy: {
    cooldownMs: 100,
    detuneCents: 6,
    variants: [
      [
        { frequency: 587.33, duration: 0.055, gain: 0.026, voice: "bloop" },
        {
          frequency: 880.0,
          offset: 0.052,
          duration: 0.075,
          gain: 0.024,
          voice: "sparkle",
        },
      ],
    ],
  },
  success: {
    cooldownMs: 180,
    detuneCents: 8,
    variants: [
      [
        { frequency: 523.25, duration: 0.08, gain: 0.028, voice: "bloop" },
        {
          frequency: 659.25,
          offset: 0.055,
          duration: 0.095,
          gain: 0.026,
          voice: "sploosh",
        },
        {
          frequency: 783.99,
          offset: 0.11,
          duration: 0.14,
          gain: 0.024,
          voice: "bloom",
        },
        {
          frequency: 1046.5,
          offset: 0.165,
          duration: 0.18,
          gain: 0.018,
          voice: "sparkle",
        },
      ],
    ],
  },
  error: {
    cooldownMs: 150,
    detuneCents: 6,
    variants: [
      [
        { frequency: 260, duration: 0.095, gain: 0.028, voice: "sclop" },
        {
          frequency: 196,
          offset: 0.075,
          duration: 0.13,
          gain: 0.024,
          voice: "warn",
        },
      ],
    ],
  },
  hover: {
    cooldownMs: 60,
    detuneCents: 4,
    variants: [
      [{ frequency: 950, duration: 0.03, gain: 0.005, voice: "sparkle" }],
    ],
  },
  toggleOn: {
    cooldownMs: 80,
    detuneCents: 5,
    variants: [
      [
        { frequency: 440, duration: 0.045, gain: 0.022, voice: "bloop" },
        {
          frequency: 587.33,
          offset: 0.05,
          duration: 0.06,
          gain: 0.02,
          voice: "bloom",
        },
      ],
    ],
  },
  toggleOff: {
    cooldownMs: 80,
    detuneCents: 5,
    variants: [
      [
        { frequency: 587.33, duration: 0.045, gain: 0.022, voice: "tap" },
        {
          frequency: 392.0,
          offset: 0.05,
          duration: 0.06,
          gain: 0.018,
          voice: "sclop",
        },
      ],
    ],
  },
  notify: {
    cooldownMs: 300,
    detuneCents: 6,
    variants: [
      [
        { frequency: 880, duration: 0.08, gain: 0.022, voice: "sparkle" },
        {
          frequency: 1174.66,
          offset: 0.09,
          duration: 0.12,
          gain: 0.018,
          voice: "bloom",
        },
      ],
    ],
  },
};

function prefersReducedMotion(): boolean {
  if (typeof globalThis.matchMedia !== "function") return false;
  try {
    return globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export class Weightless implements SoundEffects {
  private context: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  public enabled: boolean;
  public volume: number;
  public sharedState: boolean;
  public randomness: number;
  public masterLevel: number;
  public panWidth: number;
  public humanize: number;
  public compressor: boolean;
  public cues: Record<string, WeightlessCue>;
  public voices: Record<string, WeightlessVoice>;
  public scale: number[];
  private lastPlayed = new Map<string, number>();
  private lastRichCueTime = 0;

  constructor(options: WeightlessOptions = {}) {
    const defaultEnabled = !prefersReducedMotion();
    this.enabled = options.enabled ?? defaultEnabled;
    this.volume = options.volume ?? 0.8;
    this.sharedState = options.sharedState ?? true;

    // Shared SoftStack sound state: siblings like @softstack/juicy-sounds
    // write the same 'softstack:sound' key — one mute choice rules them all.
    if (this.sharedState && typeof globalThis.localStorage !== "undefined") {
      try {
        const raw = globalThis.localStorage.getItem(STORAGE_KEY);
        if (raw) {
          const stored = JSON.parse(raw);
          if (stored && typeof stored === "object") {
            if (typeof stored.enabled === "boolean") {
              this.enabled = stored.enabled;
            }
            if (typeof stored.volume === "number") {
              this.volume = stored.volume;
            }
          }
        }
      } catch {
        /* SSR / privacy mode / bad JSON — use defaults */
      }
    }

    this.randomness = options.randomness ?? 1.0;
    this.masterLevel = options.masterLevel ?? MASTER_LEVEL;
    this.panWidth = options.panWidth ?? 0.15;
    this.humanize = (options.humanizeMs ?? 5) / 1000;
    this.compressor = options.compressor ?? true;
    this.cues = { ...WEIGHTLESS_CUES, ...options.cues };
    this.voices = { ...WEIGHTLESS_VOICES, ...options.voices };
    this.scale = options.scale || [
      392.0,
      440.0,
      523.25,
      587.33,
      659.25,
      783.99,
      880.0,
      1046.5,
      1174.66,
      1318.51,
    ];
  }

  async getContext(): Promise<AudioContext | null> {
    if (typeof globalThis.AudioContext === "undefined") {
      const webkitCtx = (
        globalThis as unknown as { webkitAudioContext?: typeof AudioContext }
      ).webkitAudioContext;
      if (!webkitCtx) return null;
      if (!this.context || this.context.state === "closed") {
        this.context = new webkitCtx();
        this.masterGain = null;
      }
    } else if (!this.context || this.context.state === "closed") {
      this.context = new globalThis.AudioContext();
      this.masterGain = null;
    }

    if (this.context.state === "suspended") {
      try {
        await this.context.resume();
      } catch {
        return null;
      }
    }
    return this.context;
  }

  private ensureMasterChain(context: AudioContext): GainNode {
    if (this.masterGain && this.context === context) {
      this.masterGain.gain.setTargetAtTime(
        this.masterLevel * this.volume,
        context.currentTime,
        0.01,
      );
      return this.masterGain;
    }

    const masterGain = context.createGain();
    masterGain.gain.value = this.masterLevel * this.volume;

    if (this.compressor) {
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-20, context.currentTime);
      compressor.knee.setValueAtTime(18, context.currentTime);
      compressor.ratio.setValueAtTime(4, context.currentTime);
      compressor.attack.setValueAtTime(0.003, context.currentTime);
      compressor.release.setValueAtTime(0.08, context.currentTime);

      masterGain.connect(compressor);
      compressor.connect(context.destination);
    } else {
      masterGain.connect(context.destination);
    }

    this.masterGain = masterGain;
    this.context = context;
    return masterGain;
  }

  // Centered humanization: randomness 0 = exactly `center`, 1 = full ±spread
  jitter(center: number, spread: number): number {
    return center + (Math.random() - 0.5) * 2 * spread * this.randomness;
  }

  play(cueName: string, options: WeightlessPlayOptions = {}): boolean {
    if (!this.enabled || prefersReducedMotion()) return false;

    const resolvedName = cueName === "click" ? "select" : cueName;
    const cue = this.cues[resolvedName] || this.cues.select;
    const now = Date.now();
    const lastTime = this.lastPlayed.get(resolvedName) || 0;

    // Never let a generic "select" tap stack on top of a richer cue ("bloop",
    // "sploosh", "sclop", "success", etc.) fired in the same interaction tick.
    if (
      resolvedName === "select" &&
      now - this.lastRichCueTime < 45 &&
      !options.force
    ) {
      return false;
    }

    if (now - lastTime < (cue.cooldownMs || 0) && !options.force) {
      return false;
    }

    // When a modal closes immediately after a positional "bloop" (e.g. picking
    // a palette tile in StyleSelector), stagger the closing "sclop" by 55ms so
    // both liquid gestures breathe as a two-beat phrase instead of colliding.
    const effectiveOptions =
      resolvedName === "sclop" && now - (this.lastPlayed.get("bloop") || 0) < 45
        ? { ...options, delay: (options.delay || 0) + 0.055 }
        : options;

    this.lastPlayed.set(resolvedName, now);
    if (resolvedName !== "select" && resolvedName !== "hover") {
      this.lastRichCueTime = now;
    }
    void this._executePlay(cue, effectiveOptions);
    return true;
  }

  private async _executePlay(
    cue: WeightlessCue,
    options: WeightlessPlayOptions = {},
  ): Promise<void> {
    try {
      const context = await this.getContext();
      if (!context) return;

      const masterNode = this.ensureMasterChain(context);
      const variants = cue.variants || [];
      const variant = variants[Math.floor(Math.random() * variants.length)] ||
        variants[0];
      if (!variant) return;

      variant.forEach((note) =>
        this.scheduleTone(context, cue, note, masterNode, options)
      );
    } catch {
      // Silently ignore Web Audio gesture/playback errors
    }
  }

  private scheduleTone(
    context: AudioContext,
    cue: WeightlessCue,
    note: WeightlessNote,
    masterNode: AudioNode,
    options: WeightlessPlayOptions = {},
  ): void {
    const voice = (note.voice && this.voices[note.voice]) || this.voices.bloop;
    const delay = Math.max(
      0,
      (note.offset || 0) + (options.delay || 0) +
        this.jitter(0, this.humanize),
    );
    const startAt = context.currentTime + delay;
    const duration = note.duration || 0.05;

    const detuneRatio = centsToRatio(this.jitter(0, cue.detuneCents || 0));
    const frequency = (options.frequency ?? note.frequency ?? 440) *
      detuneRatio;
    const gainValue = Math.max(
      MIN_GAIN,
      (options.gain ?? note.gain ?? 0.02) * this.jitter(1, 0.1),
    );

    const noteGain = context.createGain();
    const panner = typeof context.createStereoPanner === "function"
      ? context.createStereoPanner()
      : null;

    let lastNode: AudioNode = noteGain;

    if (voice.lowpass) {
      const filter = context.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(voice.lowpass, startAt);
      filter.Q.setValueAtTime(voice.q ?? 0.7, startAt);
      if (voice.bendCents) {
        const targetCutoff = Math.max(
          160,
          Math.min(12000, voice.lowpass * centsToRatio(voice.bendCents * 0.5)),
        );
        filter.frequency.exponentialRampToValueAtTime(
          targetCutoff,
          startAt + duration,
        );
      }
      lastNode.connect(filter);
      lastNode = filter;
    }

    if (panner) {
      panner.pan.value = this.jitter(0, this.panWidth);
      lastNode.connect(panner);
      lastNode = panner;
    }

    lastNode.connect(masterNode);

    noteGain.gain.setValueAtTime(MIN_GAIN, startAt);
    noteGain.gain.exponentialRampToValueAtTime(
      gainValue,
      startAt + (voice.attack || 0.005),
    );
    noteGain.gain.exponentialRampToValueAtTime(MIN_GAIN, startAt + duration);

    const partials: WeightlessPartial[] = [
      { ratio: 1, gain: 1, type: voice.type },
      ...(voice.partials || []),
    ];

    partials.forEach((partial) => {
      const osc = context.createOscillator();
      const pGain = context.createGain();
      const baseFreq = frequency * (partial.ratio || 1);

      osc.type = partial.type || "sine";
      osc.frequency.setValueAtTime(baseFreq, startAt);

      if (voice.bendCents) {
        osc.frequency.exponentialRampToValueAtTime(
          Math.max(20, baseFreq * centsToRatio(voice.bendCents)),
          startAt + duration,
        );
      }

      pGain.gain.value = partial.gain || 1;
      osc.connect(pGain);
      pGain.connect(noteGain);

      osc.start(startAt);
      osc.stop(startAt + duration + 0.08);

      osc.onended = () => {
        osc.disconnect();
        pGain.disconnect();
      };
    });

    setTimeout(() => {
      noteGain.disconnect();
      try {
        lastNode.disconnect();
      } catch {
        // Ignore already-disconnected node
      }
    }, (delay + duration + 0.18) * 1000);
  }

  getSparkleNote(offset = 0): number {
    const index = Math.floor(Math.random() * this.scale.length);
    return this.scale[(index + offset + this.scale.length) % this.scale.length];
  }

  /**
   * The note for a POSITION rather than a random one.
   * Pairs visual palette/gradient positions with rising musical scale degrees.
   */
  noteAt(
    index: number,
    { total, offset = 0 }: WeightlessNoteAtOptions = {},
  ): number | null {
    const len = this.scale.length;
    if (!len || !Number.isFinite(index)) return null;

    const degree = typeof total === "number" && Number.isFinite(total) &&
        total > 1
      ? Math.round(
        (Math.min(Math.max(index, 0), total - 1) / (total - 1)) * (len - 1),
      )
      : Math.floor(index);

    return this.scale[(((degree + offset) % len) + len) % len];
  }

  /**
   * Play a cue at a position's pitch (e.g. across the 8 pastel-punk palettes).
   */
  playAt(
    cueName: string,
    index: number,
    opts: WeightlessPlayAtOptions = {},
  ): boolean | undefined {
    const { total, offset, ...playOpts } = opts;
    const frequency = this.noteAt(index, { total, offset });
    if (frequency === null) return undefined;
    return this.play(cueName, { ...playOpts, frequency });
  }

  /**
   * Sequence a melody (frequencies in Hz, or {frequency, gain} objects)
   */
  async sequence(
    notes: Array<number | { frequency: number; gain?: number }>,
    interval = 0.06,
    cueName = "bloop",
  ): Promise<void> {
    if (!this.enabled || prefersReducedMotion()) return;
    const context = await this.getContext();
    if (!context) return;

    notes.forEach((note, i) => {
      const freq = typeof note === "number" ? note : note.frequency;
      const gain = typeof note === "number" ? undefined : note.gain;
      this.play(cueName, {
        frequency: freq,
        gain,
        delay: i * interval,
        force: true,
      });
    });
  }

  /**
   * Play a coherent arpeggio: one random root, then scale degrees relative to it.
   */
  phrase(
    degrees: number[] = [0, 2, 4, 7],
    interval = 0.055,
    cueName = "bloop",
  ): Promise<void> {
    const len = this.scale.length;
    const root = Math.floor(Math.random() * Math.max(1, len - 4));
    const notes = degrees.map((d) =>
      this.scale[(((root + d) % len) + len) % len]
    );
    return this.sequence(notes, interval, cueName);
  }

  // Named cue methods (backwards-compatible + Elsewhere liquid cues)
  select(options?: WeightlessPlayOptions): boolean {
    return this.play("select", options);
  }

  click(options?: WeightlessPlayOptions): boolean {
    return this.play("select", options);
  }

  bloop(options?: WeightlessPlayOptions): boolean {
    return this.play("bloop", options);
  }

  sclop(options?: WeightlessPlayOptions): boolean {
    return this.play("sclop", options);
  }

  sploosh(options?: WeightlessPlayOptions): boolean {
    return this.play("sploosh", options);
  }

  shuffle(): void {
    void this.phrase([0, 2, 4, 7], 0.055, "bloop");
  }

  success(options?: WeightlessPlayOptions): boolean {
    return this.play("success", options);
  }

  copy(options?: WeightlessPlayOptions): boolean {
    return this.play("copy", options);
  }

  error(options?: WeightlessPlayOptions): boolean {
    return this.play("error", options);
  }

  hover(options?: WeightlessPlayOptions): boolean {
    return this.play("hover", options);
  }

  toggleOn(options?: WeightlessPlayOptions): boolean {
    return this.play("toggleOn", options);
  }

  toggleOff(options?: WeightlessPlayOptions): boolean {
    return this.play("toggleOff", options);
  }

  notify(options?: WeightlessPlayOptions): boolean {
    return this.play("notify", options);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled && this.context) {
      this.context.suspend().catch(() => {});
    }
    this._saveSharedState();
  }

  setVolume(v: number): void {
    this.volume = Math.max(0, Math.min(1, v));
    if (this.masterGain && this.context) {
      this.masterGain.gain.setTargetAtTime(
        this.masterLevel * this.volume,
        this.context.currentTime,
        0.01,
      );
    }
    this._saveSharedState();
  }

  isAudioEnabled(): boolean {
    return this.enabled;
  }

  private _saveSharedState(): void {
    if (!this.sharedState || typeof globalThis.localStorage === "undefined") {
      return;
    }
    try {
      globalThis.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ enabled: this.enabled, volume: this.volume }),
      );
    } catch {
      /* SSR / privacy mode — no persistence */
    }
  }

  panic(): void {
    if (this.context) {
      this.context.close().catch(() => {});
      this.context = null;
      this.masterGain = null;
    }
  }
}

export const weightless = new Weightless();
export const sounds = weightless;
