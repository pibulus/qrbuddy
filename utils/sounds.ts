// Sound effects system for QRBuddy
// Provides subtle audio feedback for interactions

export interface SoundEffects {
  click: () => void;
  shuffle: () => void;
  success: () => void;
  copy: () => void;
  error: () => void;
}

class SoundManager implements SoundEffects {
  private audioCache = new Map<string, HTMLAudioElement>();
  private isEnabled: boolean = true;
  private volume: number = 0.1;

  constructor() {
    // Check user preference for reduced motion (applies to audio too)
    // Only check on client side
    this.isEnabled = typeof globalThis !== "undefined" && globalThis.matchMedia
      ? !globalThis.matchMedia("(prefers-reduced-motion: reduce)").matches
      : true;
  }

  private loadSound(
    name: string,
    url: string,
  ): Promise<HTMLAudioElement> {
    if (this.audioCache.has(name)) {
      return Promise.resolve(this.audioCache.get(name)!);
    }

    const audio = new Audio(url);
    audio.volume = this.volume;
    audio.preload = "auto";

    return new Promise((resolve, reject) => {
      audio.addEventListener("canplaythrough", () => {
        this.audioCache.set(name, audio);
        resolve(audio);
      }, { once: true });

      audio.addEventListener("error", reject, { once: true });
      audio.load();
    });
  }

  private async playSound(
    soundName: string,
    fallbackUrl?: string,
  ): Promise<void> {
    if (!this.isEnabled) return;

    try {
      let audio = this.audioCache.get(soundName);

      if (!audio && fallbackUrl) {
        audio = await this.loadSound(soundName, fallbackUrl);
      }

      if (audio) {
        audio.currentTime = 0;
        await audio.play();
      } else {
        // Create simple beep as fallback
        this.createBeep(200, 0.05, "sine");
      }
    } catch (_error) {
      // Silently fail - audio is enhancement, not critical
      console.debug("Sound playback failed:", _error);
    }
  }

  // Create synthetic beep using Web Audio API as fallback
  private createBeep(
    frequency: number,
    duration: number,
    type: OscillatorType = "sine",
  ): void {
    try {
      const audioContext = new (globalThis.AudioContext ||
        // @ts-ignore - webkitAudioContext is a non-standard property
        globalThis.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);

      oscillator.frequency.value = frequency;
      oscillator.type = type;
      gainNode.gain.setValueAtTime(0, audioContext.currentTime);
      gainNode.gain.linearRampToValueAtTime(
        this.volume,
        audioContext.currentTime + 0.01,
      );
      gainNode.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration,
      );

      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + duration);
    } catch (_error) {
      // Web Audio API not supported, silently fail
      console.debug("Web Audio API not supported");
    }
  }

  click(): void {
    // Warmer, gooier click - deeper with a tiny reverb tail
    this.createBeep(320, 0.08, "sine");
    setTimeout(() => this.createBeep(480, 0.06, "sine"), 20);
  }

  shuffle(): void {
    // Playful shuffle sound - ascending tones
    const frequencies = [400, 500, 600];
    for (let i = 0; i < frequencies.length; i++) {
      setTimeout(() => {
        this.createBeep(frequencies[i], 0.08, "sine");
      }, i * 60);
    }
  }

  success(): void {
    // Success chime - major chord
    const chord = [523, 659, 784]; // C, E, G
    chord.forEach((freq, i) => {
      setTimeout(() => {
        this.createBeep(freq, 0.3, "sine");
      }, i * 30);
    });
  }

  copy(): void {
    // Quick double beep
    this.createBeep(600, 0.06, "sine");
    setTimeout(() => {
      this.createBeep(600, 0.06, "sine");
    }, 80);
  }

  error(): void {
    // Lower, longer tone for errors
    this.createBeep(200, 0.2, "sawtooth");
  }

  // Control methods
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  isAudioEnabled(): boolean {
    return this.isEnabled;
  }
}

export const sounds = new SoundManager();

// Utility to add sound to any clickable element
export function addSoundToElement(
  element: HTMLElement,
  soundType: keyof SoundEffects = "click",
): void {
  element.addEventListener("click", () => {
    sounds[soundType]();
  });
}
