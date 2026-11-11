import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatVCard,
  parseVCard,
  validateVCard,
  type VCardData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function VCardForm({ url }: Props) {
  const [initial] = useState(() => parseVCard(url.value));
  const [firstName, setFirstName] = useState(() => initial?.firstName ?? "");
  const [lastName, setLastName] = useState(() => initial?.lastName ?? "");
  const [organization, setOrganization] = useState(
    () => initial?.organization ?? "",
  );
  const [title, setTitle] = useState(() => initial?.jobTitle ?? "");
  const [phone, setPhone] = useState(() => initial?.phone ?? "");
  const [email, setEmail] = useState(() => initial?.email ?? "");
  const [website, setWebsite] = useState(() => initial?.website ?? "");
  const [address, setAddress] = useState(() => initial?.address ?? "");
  const [note, setNote] = useState(() => initial?.note ?? "");
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: VCardData = {
      firstName,
      lastName,
      organization,
      jobTitle: title,
      phone,
      email,
      website,
      address,
      note,
    };
    const validationError = validateVCard(data);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    const formatted = formatVCard(data);
    if (url.value !== formatted) {
      url.value = formatted;
    }
  }, [
    firstName,
    lastName,
    organization,
    title,
    phone,
    email,
    website,
    address,
    note,
  ]);

  const hasAnyInput = Boolean(
    firstName.trim() ||
      lastName.trim() ||
      organization.trim() ||
      title.trim() ||
      phone.trim() ||
      email.trim() ||
      website.trim() ||
      address.trim() ||
      note.trim(),
  );
  const showHint = (touched || hasAnyInput) && Boolean(error);

  return (
    <div class="space-y-4">
      {showHint && error && (
        <div
          role="status"
          aria-live="polite"
          class="rounded-2xl bg-amber-50 border border-amber-300 px-4 py-2.5 text-sm font-semibold text-amber-900"
        >
          {error}
        </div>
      )}

      {/* Name */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            First Name *
          </label>
          <input
            type="text"
            value={firstName}
            onInput={(e) => {
              setTouched(true);
              setFirstName((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="John"
            class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Last Name
          </label>
          <input
            type="text"
            value={lastName}
            onInput={(e) => {
              setTouched(true);
              setLastName((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="Doe"
            class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
          />
        </div>
      </div>

      {/* Organization & Title */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Organization
          </label>
          <input
            type="text"
            value={organization}
            onInput={(e) => {
              setTouched(true);
              setOrganization((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="Acme Corp"
            class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Title
          </label>
          <input
            type="text"
            value={title}
            onInput={(e) => {
              setTouched(true);
              setTitle((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="CEO"
            class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
          />
        </div>
      </div>

      {/* Phone */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Phone
        </label>
        <input
          type="tel"
          value={phone}
          onInput={(e) => {
            setTouched(true);
            setPhone((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="+1 (555) 123-4567"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
        />
      </div>

      {/* Email */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Email
        </label>
        <input
          type="email"
          value={email}
          onInput={(e) => {
            setTouched(true);
            setEmail((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="john@example.com"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
        />
      </div>

      {/* Website */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Website
        </label>
        <input
          type="url"
          value={website}
          onInput={(e) => {
            setTouched(true);
            setWebsite((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="https://example.com"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
        />
      </div>

      {/* Address */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Address
        </label>
        <input
          type="text"
          value={address}
          onInput={(e) => {
            setTouched(true);
            setAddress((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="123 Main St, City, State 12345"
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none"
        />
      </div>

      {/* Note */}
      <div class="space-y-2">
        <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
          Note
        </label>
        <textarea
          value={note}
          onInput={(e) => {
            setTouched(true);
            setNote((e.target as HTMLTextAreaElement).value);
            haptics.light();
          }}
          placeholder="Additional information..."
          rows={2}
          class="w-full px-4 py-3 border-2 border-black/15 bg-white rounded-2xl text-lg focus:border-qr-pop focus:outline-none resize-none"
        />
      </div>
    </div>
  );
}
