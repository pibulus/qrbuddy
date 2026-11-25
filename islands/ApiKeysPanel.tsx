// API keys panel — mint, list and revoke, using the Passport you already hold.
//
// The plaintext key appears once, in the moment it is created, and is never
// fetched again. Showing it in a copy-once card rather than a persistent field
// is the honest shape: nobody at QRBuddy can read it back either.

import { useEffect, useState } from "preact/hooks";
import { apiRequest } from "../utils/api-request.ts";
import { getApiUrl } from "../utils/api.ts";
import { getStoredPassport } from "../utils/passport.ts";
import { getClientLocale, type Locale } from "../utils/i18n.ts";

const COPY = {
  en: {
    loadFail: "Could not load keys",
    createFail: "Could not create a key",
    revokeFail: "Could not revoke the key",
    revokeShort: "Could not revoke",
    title: "Your keys",
    intro:
      "A key acts as your Passport: same codes, same allowance. Shown once, stored hashed.",
    noPassport:
      "Make a code first. Your Passport is created automatically when you do.",
    placeholder: "What is it for? (optional)",
    create: "Create key",
    copyNow: "Copy it now — it is not stored in readable form",
    copied: "Copied",
    copy: "Copy",
    unnamed: "unnamed",
    revoked: "revoked",
    used: "used",
    neverUsed: "never used",
    revoke: "Revoke",
  },
  es: {
    loadFail: "No se pudieron cargar las claves",
    createFail: "No se pudo crear la clave",
    revokeFail: "No se pudo revocar la clave",
    revokeShort: "No se pudo revocar",
    title: "Tus claves",
    intro:
      "Una clave actúa como tu Pasaporte: mismos códigos, mismo cupo. Se muestra una vez y se guarda cifrada.",
    noPassport:
      "Crea un código primero. Tu Pasaporte se genera solo al hacerlo.",
    placeholder: "¿Para qué es? (opcional)",
    create: "Crear clave",
    copyNow: "Cópiala ahora — no se guarda en forma legible",
    copied: "Copiada",
    copy: "Copiar",
    unnamed: "sin nombre",
    revoked: "revocada",
    used: "usada",
    neverUsed: "sin usar",
    revoke: "Revocar",
  },
} as const;

interface ApiKeyRecord {
  id: string;
  prefix: string;
  name: string | null;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

export default function ApiKeysPanel({ lang }: { lang?: Locale }) {
  const t = COPY[getClientLocale(lang)];
  const [keys, setKeys] = useState<ApiKeyRecord[]>([]);
  const [freshKey, setFreshKey] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hasPassport, setHasPassport] = useState(false);
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const data = await apiRequest<{ keys: ApiKeyRecord[] }>(
        `${getApiUrl()}/api-keys`,
        { method: "GET", useUserAuth: true },
        t.loadFail,
      );
      setKeys(data.keys ?? []);
      setError("");
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t.loadFail,
      );
    }
  }

  useEffect(() => {
    const passport = getStoredPassport();
    setHasPassport(Boolean(passport));
    // No Passport, no keys: asking the API would only produce a confusing
    // "failed to fetch" before the person has made their first code.
    if (passport) load();
  }, []);

  async function createKey() {
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const data = await apiRequest<{ key: string }>(
        `${getApiUrl()}/api-keys`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: name.trim() }),
          useUserAuth: true,
        },
        t.createFail,
      );
      setFreshKey(data.key);
      setName("");
      await load();
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : t.createFail,
      );
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await apiRequest(
        `${getApiUrl()}/api-keys?id=${encodeURIComponent(id)}`,
        { method: "DELETE", useUserAuth: true },
        t.revokeFail,
      );
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t.revokeShort);
    } finally {
      setBusy(false);
    }
  }

  async function copyFreshKey() {
    try {
      await navigator.clipboard.writeText(freshKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  return (
    <section
      id="keys"
      class="rounded-3xl border-2 border-[#1e1714] bg-[#fffef7] p-5 shadow-[4px_4px_0_#1e1714]"
    >
      <h2 class="text-lg font-black tracking-tight">{t.title}</h2>
      <p class="mt-1 text-sm text-[#574c44]">
        {t.intro}
      </p>

      {!hasPassport && (
        <p class="mt-3 rounded-xl border-2 border-amber-500 bg-amber-50 p-3 text-xs font-bold">
          {t.noPassport}
        </p>
      )}

      {hasPassport && (
        <div class="mt-4 flex flex-wrap gap-2">
          <input
            value={name}
            onInput={(event) =>
              setName((event.target as HTMLInputElement).value)}
            placeholder={t.placeholder}
            maxLength={60}
            class="min-w-0 flex-1 rounded-xl border-2 border-[#1e1714]/20 bg-white px-3 py-2 text-sm focus:border-[#1e1714] focus:outline-none"
          />
          <button
            type="button"
            onClick={createKey}
            disabled={busy}
            class="rounded-xl border-2 border-[#1e1714] bg-[#ffbe0b] px-4 py-2 text-sm font-black shadow-[3px_3px_0_#1e1714] active:translate-y-[1px] disabled:opacity-40"
          >
            {t.create}
          </button>
        </div>
      )}

      {freshKey && (
        <div class="mt-4 rounded-2xl border-2 border-emerald-600 bg-emerald-50 p-3">
          <p class="text-[11px] font-black uppercase tracking-wider text-emerald-800">
            {t.copyNow}
          </p>
          <div class="mt-2 flex flex-wrap items-center gap-2">
            <code class="min-w-0 flex-1 break-all rounded-lg bg-white px-2 py-1.5 font-mono text-xs">
              {freshKey}
            </code>
            <button
              type="button"
              onClick={copyFreshKey}
              class="rounded-lg border-2 border-[#1e1714] bg-white px-3 py-1.5 text-xs font-black"
            >
              {copied ? t.copied : t.copy}
            </button>
          </div>
        </div>
      )}

      {error && (
        <p class="mt-3 rounded-xl border-2 border-amber-400 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-950">
          {error}
        </p>
      )}

      {keys.length > 0 && (
        <ul class="mt-4 divide-y divide-[#1e1714]/15 text-xs">
          {keys.map((key) => (
            <li key={key.id} class="flex items-center gap-3 py-2">
              <span class="font-mono">{key.prefix}…</span>
              <span class="min-w-0 flex-1 truncate text-[#574c44]">
                {key.name || t.unnamed}
              </span>
              <span class="shrink-0 text-[#6e6058]">
                {key.revoked_at
                  ? t.revoked
                  : key.last_used_at
                  ? `${t.used} ${key.last_used_at.slice(0, 10)}`
                  : t.neverUsed}
              </span>
              {!key.revoked_at && (
                <button
                  type="button"
                  onClick={() => revoke(key.id)}
                  disabled={busy}
                  class="shrink-0 rounded-lg border-2 border-[#1e1714] bg-white px-2 py-1 font-black disabled:opacity-40"
                >
                  {t.revoke}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
