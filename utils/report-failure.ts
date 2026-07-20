import { haptics } from "./haptics.ts";
import { ApiError } from "./api-request.ts";
import { addToast } from "../islands/ToastManager.tsx";

/**
 * Shared failure path for async hooks: structured console.error,
 * error haptic, and a user-facing toast (`${toastPrefix}: ${message}`).
 * Returns the error message for callers that keep it in state.
 */
export function reportFailure(
  scope: string,
  error: unknown,
  toastPrefix: string,
): string {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`${scope}:`, {
    error: message,
    statusCode: error instanceof ApiError ? error.statusCode : undefined,
    timestamp: new Date().toISOString(),
  });
  haptics.error();
  addToast(`${toastPrefix}: ${message}`, 4000);
  return message;
}
