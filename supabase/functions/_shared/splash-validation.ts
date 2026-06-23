// Shared validation for dynamic-QR splash_config.
//
// splash_config fields are rendered into HTML on every scan (see redirect-qr).
// escapeHtml() protects against injection, but it calls String.prototype.replace
// and will THROW on a non-string value (array/object/number) — turning the
// redirect page into a 500 for every scanner. So we validate types and lengths
// at write time (create/update) where the owner gets a clean 400 instead.

export interface SplashConfig {
  enabled: boolean;
  title: string;
  buttonText: string;
  imageUrl?: string;
  description?: string;
}

const MAX_TITLE = 100;
const MAX_BUTTON = 50;
const MAX_DESCRIPTION = 500;

function isHttpUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Validate and normalise a splash_config payload.
 * Returns { ok: true, value } with a clean object, or { ok: false, error }.
 * `null`/`undefined` is allowed (no splash) and passes through as null.
 */
export function validateSplashConfig(
  raw: unknown,
): { ok: true; value: SplashConfig | null } | { ok: false; error: string } {
  if (raw === null || raw === undefined) {
    return { ok: true, value: null };
  }

  if (typeof raw !== "object" || Array.isArray(raw)) {
    return { ok: false, error: "splash_config must be an object" };
  }

  const cfg = raw as Record<string, unknown>;

  // A disabled splash is valid and renders nothing — don't over-validate it.
  const enabled = cfg.enabled === true;
  if (!enabled) {
    return { ok: true, value: null };
  }

  const title = cfg.title ?? "Welcome";
  const buttonText = cfg.buttonText ?? "Continue";

  if (typeof title !== "string") {
    return { ok: false, error: "splash_config.title must be a string" };
  }
  if (title.length > MAX_TITLE) {
    return {
      ok: false,
      error: `splash_config.title must be <= ${MAX_TITLE} characters`,
    };
  }

  if (typeof buttonText !== "string") {
    return { ok: false, error: "splash_config.buttonText must be a string" };
  }
  if (buttonText.length > MAX_BUTTON) {
    return {
      ok: false,
      error: `splash_config.buttonText must be <= ${MAX_BUTTON} characters`,
    };
  }

  let description: string | undefined;
  if (cfg.description !== undefined && cfg.description !== null) {
    if (typeof cfg.description !== "string") {
      return {
        ok: false,
        error: "splash_config.description must be a string",
      };
    }
    if (cfg.description.length > MAX_DESCRIPTION) {
      return {
        ok: false,
        error:
          `splash_config.description must be <= ${MAX_DESCRIPTION} characters`,
      };
    }
    description = cfg.description;
  }

  let imageUrl: string | undefined;
  if (
    cfg.imageUrl !== undefined && cfg.imageUrl !== null && cfg.imageUrl !== ""
  ) {
    if (typeof cfg.imageUrl !== "string" || !isHttpUrl(cfg.imageUrl)) {
      return {
        ok: false,
        error: "splash_config.imageUrl must be a valid http/https URL",
      };
    }
    imageUrl = cfg.imageUrl;
  }

  return {
    ok: true,
    value: { enabled: true, title, buttonText, description, imageUrl },
  };
}
