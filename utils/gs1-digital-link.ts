/**
 * GS1 Digital Link (Sunrise 2027) URI Builder & GTIN Mod-10 Validator
 *
 * Standard syntax:
 *   https://<domain>/01/<14-digit-GTIN>[/10/<lot>][/21/<serial>][?17=<YYMMDD>]
 *   or path-based attributes:
 *   https://<domain>/01/<14-digit-GTIN>/10/<lot>/21/<serial>?17=<YYMMDD>
 *
 * Per the GS1 Digital Link 1.3 specification:
 * - Primary key AI (01 = GTIN) is always a path segment, normalized to 14 digits.
 * - Key qualifiers (10 = Batch/Lot, 21 = Serial) are path segments in order 10 -> 21.
 * - Data attributes like 17 (Expiration Date YYMMDD) are query parameters (?17=YYMMDD)
 *   or path segments; query parameters are canonical for non-qualifier attributes,
 *   while path syntax (/01/.../10/.../17/...) is also widely supported by resolvers.
 */

export interface Gs1DigitalLinkInput {
  domain: string;
  gtin: string;
  lot?: string;
  expiry?: string;
  serial?: string;
  usePathAttributes?: boolean;
}

export interface Gs1ValidationResult {
  valid: boolean;
  normalizedGtin14: string;
  expectedCheckDigit: number | null;
  providedCheckDigit: number | null;
  error?: string;
}

/**
 * Computes the standard GS1 Mod-10 check digit for a numeric string (without its check digit).
 */
export function computeGs1CheckDigit(digitsWithoutCheck: string): number {
  const clean = digitsWithoutCheck.replace(/\D/g, "");
  let sum = 0;
  // Walk from right to left; rightmost position before check digit gets multiplier 3, then 1, 3, 1...
  for (let i = 0; i < clean.length; i++) {
    const digit = Number(clean[clean.length - 1 - i]);
    const weight = i % 2 === 0 ? 3 : 1;
    sum += digit * weight;
  }
  return (10 - (sum % 10)) % 10;
}

/**
 * Validates a GTIN-8, GTIN-12 (UPC-A), GTIN-13 (EAN-13), or GTIN-14 and normalizes it to 14 digits.
 */
export function validateAndNormalizeGtin(rawGtin: string): Gs1ValidationResult {
  const digits = rawGtin.replace(/\D/g, "");
  if (!digits) {
    return {
      valid: false,
      normalizedGtin14: "",
      expectedCheckDigit: null,
      providedCheckDigit: null,
      error: "Enter an 8, 12, 13, or 14-digit GTIN / barcode number.",
    };
  }

  if (![8, 12, 13, 14].includes(digits.length)) {
    return {
      valid: false,
      normalizedGtin14: digits.padStart(14, "0"),
      expectedCheckDigit: null,
      providedCheckDigit: null,
      error:
        `GTIN must be 8, 12 (UPC), 13 (EAN), or 14 digits (got ${digits.length}).`,
    };
  }

  const body = digits.slice(0, -1);
  const provided = Number(digits[digits.length - 1]);
  const expected = computeGs1CheckDigit(body);

  if (provided !== expected) {
    return {
      valid: false,
      normalizedGtin14: digits.padStart(14, "0"),
      expectedCheckDigit: expected,
      providedCheckDigit: provided,
      error:
        `Check digit mismatch: ends in ${provided}, expected ${expected} (GS1 Mod-10).`,
    };
  }

  return {
    valid: true,
    normalizedGtin14: digits.padStart(14, "0"),
    expectedCheckDigit: expected,
    providedCheckDigit: provided,
  };
}

/**
 * Normalizes a brand domain into a clean HTTPS origin (`https://brand.com`).
 */
export function normalizeGs1Origin(rawDomain: string): string {
  const trimmed = rawDomain.trim();
  if (!trimmed) return "https://example.com";
  const withScheme = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `https://${trimmed}`;
  try {
    const parsed = new URL(withScheme);
    return `${parsed.protocol}//${parsed.host}`;
  } catch {
    const cleaned = trimmed.replace(/^https?:\/\//i, "").split("/")[0];
    return `https://${cleaned || "example.com"}`;
  }
}

/**
 * Builds a GS1 Digital Link URI ready for QR encoding.
 */
export function buildGs1DigitalLink(input: Gs1DigitalLinkInput): string {
  const origin = normalizeGs1Origin(input.domain);
  const digits = input.gtin.replace(/\D/g, "");
  const gtin14 = digits ? digits.padStart(14, "0") : "09312345678907";

  const segments: string[] = ["01", gtin14];

  const lot = (input.lot ?? "").trim();
  if (lot) {
    segments.push("10", encodeURIComponent(lot.slice(0, 20)));
  }

  const serial = (input.serial ?? "").trim();
  if (serial) {
    segments.push("21", encodeURIComponent(serial.slice(0, 20)));
  }

  const expiryDigits = (input.expiry ?? "").replace(/\D/g, "").slice(0, 6);
  if (expiryDigits.length === 6) {
    if (input.usePathAttributes !== false) {
      segments.push("17", expiryDigits);
    } else {
      return `${origin}/${segments.join("/")}?17=${expiryDigits}`;
    }
  }

  return `${origin}/${segments.join("/")}`;
}
