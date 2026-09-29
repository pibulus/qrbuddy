export type RoutingMode = "simple" | "sequential" | "device" | "time";

export type RoutingConfig = Record<string, unknown>;

export type RoutingConfigValidation =
  | { ok: true; mode: RoutingMode; value: RoutingConfig | null }
  | { ok: false; error: string };

const ROUTING_MODES: RoutingMode[] = [
  "simple",
  "sequential",
  "device",
  "time",
];
const ALLOWED_PROTOCOLS = new Set([
  "http:",
  "https:",
  "wifi:",
  "mailto:",
  "tel:",
  "sms:",
  "facetime:",
]);

function normalizeUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
}

function normalizeRoute(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeUrl(value);
  if (!normalized) return "";

  try {
    const parsed = new URL(normalized);
    return ALLOWED_PROTOCOLS.has(parsed.protocol) ? normalized : null;
  } catch {
    return null;
  }
}

function parseConfig(input: unknown): RoutingConfig | null {
  let value = input;
  if (typeof value === "string") {
    try {
      value = JSON.parse(value);
    } catch {
      return null;
    }
  }

  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as RoutingConfig;
}

function onlyKeys(config: RoutingConfig, keys: string[]): boolean {
  return Object.keys(config).every((key) => keys.includes(key));
}

function normalizeHour(value: unknown, maximum: number): string | null {
  if (
    typeof value !== "string" &&
    !(typeof value === "number" && Number.isInteger(value))
  ) return null;

  const raw = String(value);
  if (!/^\d{1,2}$/.test(raw)) return null;
  const hour = Number(raw);
  if (hour < 0 || hour > maximum) return null;
  return String(hour).padStart(2, "0");
}

function validTimezone(value: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

/** Parse, validate, and canonicalize dynamic QR routing settings before storage. */
export function validateRoutingConfig(
  modeInput: unknown,
  configInput: unknown,
): RoutingConfigValidation {
  if (
    typeof modeInput !== "string" ||
    !ROUTING_MODES.includes(modeInput as RoutingMode)
  ) {
    return {
      ok: false,
      error:
        "Invalid routing_mode — must be simple, sequential, device, or time",
    };
  }

  const mode = modeInput as RoutingMode;
  if (mode === "simple") {
    if (configInput === undefined || configInput === null) {
      return { ok: true, mode, value: null };
    }
    return {
      ok: false,
      error: "routing_config must be empty when routing_mode is simple",
    };
  }

  const config = parseConfig(configInput);
  if (!config) {
    return {
      ok: false,
      error: "routing_config must be a JSON object for this routing mode",
    };
  }

  if (mode === "sequential") {
    if (!onlyKeys(config, ["urls", "loop"]) || !Array.isArray(config.urls)) {
      return {
        ok: false,
        error:
          "Sequential routing requires a URLs array and optional loop flag",
      };
    }
    if (config.loop !== undefined && typeof config.loop !== "boolean") {
      return { ok: false, error: "Sequential routing loop must be a boolean" };
    }

    const urls: string[] = [];
    for (const value of config.urls) {
      const normalized = normalizeRoute(value);
      if (normalized === null) {
        return {
          ok: false,
          error: "Every sequential route must be a valid URL string",
        };
      }
      if (normalized) urls.push(normalized);
    }
    if (urls.length < 2) {
      return {
        ok: false,
        error: "Sequential routing requires at least two valid URLs",
      };
    }

    return {
      ok: true,
      mode,
      value: { urls, loop: config.loop === true },
    };
  }

  if (mode === "device") {
    const routeKeys = ["ios", "android", "fallback"];
    if (!onlyKeys(config, routeKeys)) {
      return {
        ok: false,
        error: "Device routing only accepts ios, android, and fallback URLs",
      };
    }

    const routes: RoutingConfig = {};
    for (const key of routeKeys) {
      if (config[key] === undefined) continue;
      const normalized = normalizeRoute(config[key]);
      if (normalized === null) {
        return { ok: false, error: `Device route ${key} must be a valid URL` };
      }
      routes[key] = normalized;
    }
    return { ok: true, mode, value: routes };
  }

  const timeKeys = [
    "startHour",
    "endHour",
    "activeUrl",
    "inactiveUrl",
    "timezone",
    "timezoneOffset",
  ];
  if (!onlyKeys(config, timeKeys)) {
    return {
      ok: false,
      error:
        "Time routing only accepts hours, active/inactive URLs, and timezone settings",
    };
  }

  const startHour = normalizeHour(config.startHour, 23);
  const endHour = normalizeHour(config.endHour, 24);
  if (startHour === null || endHour === null) {
    return {
      ok: false,
      error:
        "Time routing requires a start hour from 00–23 and end hour from 00–24",
    };
  }

  const timeConfig: RoutingConfig = { startHour, endHour };
  for (const key of ["activeUrl", "inactiveUrl"] as const) {
    if (config[key] === undefined) continue;
    const normalized = normalizeRoute(config[key]);
    if (normalized === null) {
      return { ok: false, error: `Time route ${key} must be a valid URL` };
    }
    timeConfig[key] = normalized;
  }

  if (config.timezone !== undefined) {
    if (typeof config.timezone !== "string") {
      return { ok: false, error: "Time routing timezone must be a string" };
    }
    if (config.timezone && !validTimezone(config.timezone)) {
      return {
        ok: false,
        error: "Time routing timezone must be a valid IANA timezone",
      };
    }
    timeConfig.timezone = config.timezone;
  }

  if (config.timezoneOffset !== undefined) {
    if (
      typeof config.timezoneOffset !== "number" ||
      !Number.isFinite(config.timezoneOffset) ||
      Math.abs(config.timezoneOffset) > 14 * 60
    ) {
      return {
        ok: false,
        error: "Time routing timezoneOffset must be minutes within ±14 hours",
      };
    }
    timeConfig.timezoneOffset = config.timezoneOffset;
  }

  return { ok: true, mode, value: timeConfig };
}
