// Enhanced haptic feedback system for QRBuddy
// Provides tactile feedback on mobile devices with fallback patterns

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
    this.isSupported = 'vibrate' in navigator;
  }

  private vibrate(pattern: number | number[]): void {
    if (this.isSupported) {
      navigator.vibrate?.(pattern);
    }
  }

  light(): void {
    this.vibrate(10);
  }

  medium(): void {
    this.vibrate(25);
  }

  heavy(): void {
    this.vibrate(50);
  }

  success(): void {
    // Triple tap success pattern
    this.vibrate([10, 30, 10, 30, 10]);
  }

  error(): void {
    // Strong double buzz for errors
    this.vibrate([100, 30, 100]);
  }

  shuffle(): void {
    // Playful shuffle pattern
    this.vibrate([15, 20, 15, 20, 25]);
  }

  copy(): void {
    // Quick double tap for copy
    this.vibrate([20, 40, 20]);
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

// Utility function to add haptic feedback to any element
export function addHapticToElement(
  element: HTMLElement, 
  pattern: keyof HapticPattern = 'light'
): void {
  element.addEventListener('click', () => {
    haptics[pattern]();
  });
}