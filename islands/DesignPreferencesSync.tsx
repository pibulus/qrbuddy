import type { Signal } from "@preact/signals";
import { useEffect, useRef } from "preact/hooks";
import type { QRStyle } from "../types/qr-types.ts";
import {
  loadDesignPreferences,
  saveDesignPreferences,
} from "../utils/design-preferences.ts";

interface DesignPreferencesSyncProps {
  style: Signal<string>;
  customStyle?: Signal<QRStyle | null>;
  logoUrl: Signal<string>;
  frameConfig?: Signal<{ enabled: boolean; caption: string } | null>;
  pngSize?: Signal<1000 | 2000 | 3000>;
}

export default function DesignPreferencesSync({
  style,
  customStyle,
  logoUrl,
  frameConfig,
  pngSize,
}: DesignPreferencesSyncProps) {
  const hasHydrated = useRef(false);

  // Restore saved preferences on mount in the client island
  useEffect(() => {
    const saved = loadDesignPreferences();
    if (saved) {
      if (saved.style) style.value = saved.style;
      if (customStyle && saved.customStyle !== undefined) {
        customStyle.value = saved.customStyle;
      }
      if (saved.logoUrl !== undefined) logoUrl.value = saved.logoUrl;
      if (frameConfig && saved.frameConfig !== undefined) {
        frameConfig.value = saved.frameConfig;
      }
      if (pngSize && saved.pngSize) pngSize.value = saved.pngSize;
    }
    hasHydrated.current = true;
  }, []);

  // Persist preferences on change (only after initial hydration has run)
  useEffect(() => {
    if (!hasHydrated.current) return;
    saveDesignPreferences({
      version: 1,
      style: style.value,
      customStyle: customStyle?.value ?? null,
      logoUrl: logoUrl.value,
      frameConfig: frameConfig?.value ?? null,
      pngSize: pngSize?.value ?? 1000,
    });
  }, [
    style.value,
    customStyle?.value,
    logoUrl.value,
    frameConfig?.value,
    pngSize?.value,
  ]);

  return null;
}
