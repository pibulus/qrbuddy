import { useEffect, useState } from "preact/hooks";
import { signal } from "@preact/signals";

interface Toast {
  id: string;
  message: string;
  duration?: number;
}

// Global signal for managing toasts
export const toastQueue = signal<Toast[]>([]);

export function addToast(message: string, duration = 2000) {
  const id = `${Date.now()}-${Math.random()}`;
  toastQueue.value = [...toastQueue.value, { id, message, duration }];

  setTimeout(() => {
    toastQueue.value = toastQueue.value.filter((t) => t.id !== id);
  }, duration);
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
    <div class="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 space-y-2">
      {toasts.map((toast, index) => (
        <div
          key={toast.id}
          class="bg-black text-white px-4 py-2 rounded-full font-bold text-sm shadow-lg animate-pop"
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
