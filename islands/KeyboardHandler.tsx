import { useEffect } from "preact/hooks";
import { Signal } from "@preact/signals";
import { getRandomStyle } from "../utils/qr-styles.ts";

interface KeyboardHandlerProps {
  url: Signal<string>;
  style: Signal<string>;
  triggerDownload: Signal<boolean>;
  triggerCopy: Signal<boolean>;
  isAnimating: Signal<boolean>;
}

export default function KeyboardHandler({
  url,
  style,
  triggerDownload,
  triggerCopy,
  isAnimating,
}: KeyboardHandlerProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Space = Shuffle
      if (e.code === "Space" && !isAnimating.value) {
        e.preventDefault();
        isAnimating.value = true;
        style.value = getRandomStyle();
        setTimeout(() => {
          isAnimating.value = false;
        }, 400);
      }

      // Cmd/Ctrl + S = Save
      if ((e.metaKey || e.ctrlKey) && e.key === "s") {
        e.preventDefault();
        triggerDownload.value = true;
      }

      // Cmd/Ctrl + C = Copy QR
      if ((e.metaKey || e.ctrlKey) && e.key === "c") {
        // Only trigger if no text is selected
        const selection = window.getSelection();
        if (!selection || selection.toString() === "") {
          e.preventDefault();
          triggerCopy.value = true;
        }
      }

      // Escape = Clear/reset
      if (e.key === "Escape") {
        url.value = "";
        style.value = "sunset";
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}