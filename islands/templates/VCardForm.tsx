import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  formatVCard,
  validateVCard,
  type VCardData,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";

interface Props {
  url: Signal<string>;
}

export default function VCardForm({ url }: Props) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [organization, setOrganization] = useState("");
  const [title, setTitle] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Update QR data whenever form changes
  useEffect(() => {
    const data: VCardData = {
      firstName,
      lastName,
      organization,
      title,
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
    url.value = formatted;
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

  return (
    <div class="space-y-4">
      <div class="bg-[#F5E6FF] border-3 border-[#9370DB] rounded-xl p-4 shadow-chunky">
        <div class="flex items-center gap-2 mb-2">
          <span class="text-2xl">👤</span>
          <h3 class="font-black text-[#6B46A8]">Contact Card QR</h3>
        </div>
        <p class="text-sm text-[#6B46A8]">
          Scan to save contact instantly.
        </p>
      </div>

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
              setFirstName((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="John"
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none"
          />
        </div>
        <div class="space-y-2">
          <label class="text-sm font-bold text-gray-700 uppercase tracking-wide">
            Last Name *
          </label>
          <input
            type="text"
            value={lastName}
            onInput={(e) => {
              setLastName((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="Doe"
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none"
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
              setOrganization((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="Acme Corp"
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none"
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
              setTitle((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            placeholder="CEO"
            class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none"
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
            setPhone((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="+1 (555) 123-4567"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none"
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
            setEmail((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="john@example.com"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none"
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
            setWebsite((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="https://example.com"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none"
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
            setAddress((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="123 Main St, City, State 12345"
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none"
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
            setNote((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder="Additional information..."
          rows={2}
          class="w-full px-4 py-3 border-3 border-gray-300 rounded-xl text-lg focus:border-[#9370DB] focus:outline-none resize-none"
        />
      </div>

    </div>
  );
}
