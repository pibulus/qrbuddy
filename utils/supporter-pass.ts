// Supporter pass storage + client-side expiry read.
//
// The pass is a signed token only the edge functions can verify — the client
// treats "present and not expired" as supporter for UX (bigger size hints,
// active-state UI) and lets the server be the judge on every real request.

const STORAGE_KEY = "qrb_supporter_pass";
const PENDING_CHECKOUT_KEY = "qrb_pending_checkout";

function parseExpiry(pass: string): number | null {
  try {
    const encodedBody = pass.split(".")[1];
    if (!encodedBody) return null;
    const body = JSON.parse(
      atob(encodedBody.replace(/-/g, "+").replace(/_/g, "/")),
    );
    return body?.tier === "supporter" && Number.isFinite(body?.exp)
      ? body.exp
      : null;
  } catch {
    return null;
  }
}

/** The stored pass, or null when absent/expired (expired passes self-clean). */
export function getSupporterPass(): string | null {
  if (typeof localStorage === "undefined") return null;
  const pass = localStorage.getItem(STORAGE_KEY);
  if (!pass) return null;
  const exp = parseExpiry(pass);
  if (exp === null || exp < Math.floor(Date.now() / 1000)) {
    localStorage.removeItem(STORAGE_KEY);
    return null;
  }
  return pass;
}

/** Store a pass if it parses as one. Returns false for garbage input. */
export function setSupporterPass(pass: string): boolean {
  const trimmed = pass.trim();
  if (parseExpiry(trimmed) === null) return false;
  localStorage.setItem(STORAGE_KEY, trimmed);
  return true;
}

export function supporterPassExpiry(): Date | null {
  const pass = getSupporterPass();
  if (!pass) return null;
  const exp = parseExpiry(pass);
  return exp ? new Date(exp * 1000) : null;
}

/** Remember the checkout we sent the user to, so a slow webhook or a closed
 * tab doesn't strand a paid supporter — the poller retries from storage. */
export function setPendingCheckout(checkoutId: string) {
  localStorage.setItem(PENDING_CHECKOUT_KEY, checkoutId);
}

export function getPendingCheckout(): string | null {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(PENDING_CHECKOUT_KEY);
}

export function clearPendingCheckout() {
  localStorage.removeItem(PENDING_CHECKOUT_KEY);
}
