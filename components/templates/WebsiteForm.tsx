import { useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

const NON_WEB_PAYLOAD_RE =
  /^\s*(?:WIFI:|BEGIN:VCARD|SMSTO:|sms:|mailto:|tel:)/i;

export default function WebsiteForm({ url }: Props) {
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
        <span>Destination URL</span>
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
