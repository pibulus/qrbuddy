import { useState } from "preact/hooks";
import { haptics } from "../utils/haptics.ts";

/**
 * Shared keypad logic for PIN/code input
 * Handles digit entry, backspace, and clear operations
 *
 * @param digitCount - Number of digits in the code (default: 4)
 * @returns Object with digits array, press handler, reset function, and joined value
 *
 * @example
 * const { digits, handlePress, reset, value } = useKeypad(4);
 * // digits: ["", "", "", ""] initially
 * // value: "" (joined string)
 * // handlePress("5") -> digits: ["5", "", "", ""]
 * // handlePress("back") -> removes last filled digit
 * // handlePress("clear") -> resets all digits
 */
export function useKeypad(digitCount = 4) {
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
      const next = [...digits];
      // Find last non-empty digit and clear it
      for (let i = next.length - 1; i >= 0; i--) {
        if (next[i] !== "") {
          next[i] = "";
          setDigits(next);
          break;
        }
      }
      return;
    }

    // Don't allow input if all digits filled
    if (digits.every((digit) => digit !== "")) {
      return;
    }

    // Add digit to first empty position
    const next = [...digits];
    const firstEmpty = next.findIndex((digit) => digit === "");
    if (firstEmpty !== -1) {
      next[firstEmpty] = value;
      setDigits(next);
    }
  };

  const reset = () => setDigits(Array(digitCount).fill(""));
  const value = digits.join("");

  return {
    digits,
    handlePress,
    reset,
    value,
  };
}
