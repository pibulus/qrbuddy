import { useState } from "preact/hooks";
import { useKeypad } from "./useKeypad.ts";
import { haptics } from "../utils/haptics.ts";

/**
 * Shared unlock state for a PIN-protected locker (bucket): keypad PIN entry
 * or a manual password field, plus the show/hide gate around them. Used by
 * upload, download, and preview flows alike — all three need the same
 * "is there enough input to try the request" answer.
 */
export function useLockerUnlock() {
  const [showPasswordInput, setShowPasswordInput] = useState(false);
  const [useManualPassword, setUseManualPassword] = useState(false);
  const [manualPassword, setManualPassword] = useState("");

  const {
    digits: pinDigits,
    handlePress: handleKeypadPress,
    reset: resetPinDigits,
    value: pinValue,
  } = useKeypad(4);

  const unlockPassword = useManualPassword ? manualPassword.trim() : pinValue;
  const hasUnlockInput = useManualPassword
    ? manualPassword.trim().length > 0
    : pinValue.length === 4;

  const toggleManualPassword = () => {
    setUseManualPassword((prev) => {
      const next = !prev;
      if (next) {
        resetPinDigits();
      } else {
        setManualPassword("");
      }
      return next;
    });
    haptics.light();
  };

  const resetUnlock = () => {
    setShowPasswordInput(false);
    setUseManualPassword(false);
    setManualPassword("");
    resetPinDigits();
  };

  return {
    showPasswordInput,
    setShowPasswordInput,
    useManualPassword,
    manualPassword,
    setManualPassword,
    pinDigits,
    handleKeypadPress,
    pinValue,
    unlockPassword,
    hasUnlockInput,
    toggleManualPassword,
    resetUnlock,
  };
}
