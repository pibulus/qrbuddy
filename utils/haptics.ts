// Enhanced haptic + tactile audio feedback system for QRBuddy
// Bridges device vibration with Weightless ("Elsewhere") procedural audio cues

import { sounds } from "./sounds.ts";

export interface HapticPattern {
  light: () => void;
  medium: () => void;
  heavy: () => void;
  success: () => void;
  error: () => void;
  shuffle: () => void;
  copy: () => void;
}

class HapticManager implements HapticPattern {
  private isSupported: boolean;

  constructor() {
    this.isSupported = typeof navigator !== "undefined" &&
      "vibrate" in navigator;
  }

  private vibrate(pattern: number | number[]): void {
    if (this.isSupported) {
      navigator.vibrate?.(pattern);
    }
  }

  light(): void {
    this.vibrate(10);
    sounds.select();
  }

  medium(): void {
    this.vibrate(25);
    sounds.bloop();
  }

  heavy(): void {
    this.vibrate(50);
    sounds.sclop();
  }

  success(): void {
    // Triple tap success pattern + harmonic bloom chord
    this.vibrate([10, 30, 10, 30, 10]);
    sounds.success();
  }

  error(): void {
    // Double buzz + warm low double-sclop
    this.vibrate([100, 30, 100]);
    sounds.error();
  }

  shuffle(): void {
    // Playful shuffle pattern + pentatonic droplet cascade
    this.vibrate([15, 20, 15, 20, 25]);
    sounds.shuffle();
  }

  copy(): void {
    // Quick double tap + crisp double-droplet bloop
    this.vibrate([20, 40, 20]);
    sounds.copy();
  }

  // Check if device supports haptics
  isHapticsSupported(): boolean {
    return this.isSupported;
  }

  // Test function for debugging
  testPattern(): void {
    this.vibrate([100, 50, 100, 50, 200]);
  }
}

export const haptics = new HapticManager();
