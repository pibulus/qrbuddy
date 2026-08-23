import { useEffect, useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";

/**
 * Shared keypad logic for PIN/code input
 * Handles digit entry, backspace, and clear operations, with automatic keyboard support.
 *
 * @param digitCount - Number of digits in the code (default: 4)
 * @param enabled - Whether the keypad and keyboard listeners are active (default: true)
 * @returns Object with digits array, press handler, reset function, and joined value
 */
export function useKeypad(digitCount = 4, enabled = true) {
  const [digits, setDigits] = useState<string[]>(Array(digitCount).fill(""));

  const handlePress = (value: string) => {
    haptics.light();

    // Clear all digits
    if (value === "clear") {
      setDigits(Array(digitCount).fill(""));
      return;
    }

    // Backspace - remove last filled digit
    if (value === "back") {
      setDigits((prev) => {
        const next = [...prev];
        for (let i = next.length - 1; i >= 0; i--) {
          if (next[i] !== "") {
            next[i] = "";
            break;
          }
        }
        return next;
      });
      return;
    }

    // Add digit to first empty position if space available
    setDigits((prev) => {
      if (prev.every((digit) => digit !== "")) {
        return prev;
      }
      const next = [...prev];
      const firstEmpty = next.findIndex((digit) => digit === "");
      if (firstEmpty !== -1) {
        next[firstEmpty] = value;
      }
      return next;
    });
  };

  useEffect(() => {
    if (!enabled || typeof globalThis.addEventListener === "undefined") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in standard text inputs or textareas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" || target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }

      if (/^[0-9]$/.test(e.key)) {
        handlePress(e.key);
      } else if (e.key === "Backspace") {
        handlePress("back");
      } else if (e.key === "Escape") {
        handlePress("clear");
      }
    };

    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [enabled]);

  const reset = () => setDigits(Array(digitCount).fill(""));
  const value = digits.join("");

  return {
    digits,
    handlePress,
    reset,
    value,
  };
}
