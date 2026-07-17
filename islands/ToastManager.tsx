import { useEffect, useState } from "preact/hooks";
import { signal } from "@preact/signals";

interface Toast {
  id: string;
  message: string;
  duration?: number;
}

// Global signal for managing toasts
export const toastQueue = signal<Toast[]>([]);

// Store timeout IDs to allow cleanup
const toastTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

export function addToast(message: string, duration = 2000) {
  const id = `${Date.now()}-${Math.random()}`;
  toastQueue.value = [...toastQueue.value, { id, message, duration }];

  const timeoutId = setTimeout(() => {
    toastQueue.value = toastQueue.value.filter((t) => t.id !== id);
    toastTimeouts.delete(id);
  }, duration);

  toastTimeouts.set(id, timeoutId);
}

export function removeToast(id: string) {
  const timeoutId = toastTimeouts.get(id);
  if (timeoutId) {
    clearTimeout(timeoutId);
    toastTimeouts.delete(id);
  }
  toastQueue.value = toastQueue.value.filter((t) => t.id !== id);
}

export default function ToastManager() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    // Subscribe to toast queue changes
    const unsubscribe = toastQueue.subscribe((value) => {
      setToasts(value);
    });
    return () => unsubscribe();
  }, []);

  if (toasts.length === 0) return null;

  return (
    // Bottom-anchored snackbar stack (top toasts covered the QR card).
    // Full-width flex container: a `left-1/2` fixed element caps its layout
    // width at half the viewport (transforms don't affect layout), which
    // wrapped any toast longer than ~50vw onto two lines.
    <div
      class="fixed bottom-[max(1.5rem,env(safe-area-inset-bottom))] inset-x-0 z-[80] flex flex-col items-center space-y-2 pointer-events-none px-4"
      role="status"
      aria-live="polite"
      aria-atomic="false"
    >
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          class="bg-black text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg animate-pop max-w-full text-center"
          style={{
            animation: `pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)`,
            animationDelay: `${index * 50}ms`,
          }}
        >
          {toast.message}
        </div>
      ))}
    </div>
  );
}
