import { useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

interface Props {
  url: Signal<string>;
  lang?: Locale;
}

const NON_WEB_PAYLOAD_RE =
  /^\s*(?:WIFI:|BEGIN:VCARD|SMSTO:|sms:|mailto:|tel:)/i;

export default function WebsiteForm({ url, lang }: Props) {
  const isSpanish = getClientLocale(lang) === "es";
  const [inputValue, setInputValue] = useState(() =>
    NON_WEB_PAYLOAD_RE.test(url.value) ? "" : url.value
  );

  const handleInput = (e: Event) => {
    const value = (e.target as HTMLInputElement).value;
    setInputValue(value);
    url.value = value;
    haptics.light();
  };

  return (
    <div class="qr-menu-pod p-3.5 space-y-2 animate-slide-down">
      <label class="qr-field-label" for="website-url-input">
        <span class="qr-section-pip" aria-hidden="true" />
        <span>{isSpanish ? "URL de destino" : "Destination URL"}</span>
      </label>
      <input
        id="website-url-input"
        type="url"
        value={inputValue}
        onInput={handleInput}
        placeholder="https://example.com"
        class="qr-input text-base"
      />
    </div>
  );
}
