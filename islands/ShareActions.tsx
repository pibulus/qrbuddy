import { haptics } from "../utils/haptics.ts";
import { addToast } from "./ToastManager.tsx";

interface ShareActionsProps {
  shareUrl: string;
  sharedTarget?: string;
}

export default function ShareActions(
  { shareUrl, sharedTarget }: ShareActionsProps,
) {
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      haptics.copy();
      addToast("Link copied! 📋", 2500);
    } catch (error) {
      console.error("Copy share link failed:", error);
      addToast("Couldn't copy link", 3000);
      haptics.error();
    }
  };

  const handleNativeShare = async () => {
    if (!navigator.share) {
      handleCopyLink();
      return;
    }

    try {
      await navigator.share({
        title: "QRBuddy Share",
        text: sharedTarget
          ? `Scan this QR for ${sharedTarget}`
          : "Check out this QRBuddy code",
        url: shareUrl,
      });
      haptics.medium();
    } catch (error) {
      if ((error as DOMException).name === "AbortError") return;
      console.error("Native share failed:", error);
      handleCopyLink();
    }
  };

  const canWebShare = typeof navigator !== "undefined" && !!navigator.share;

  return (
    <div class="space-y-3">
      <button
        type="button"
        onClick={handleCopyLink}
        class="w-full px-4 py-3 bg-white border-3 border-black rounded-xl font-bold flex items-center justify-center gap-2 shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 transition"
      >
        <span>📋</span>
        Copy Link
      </button>

      <button
        type="button"
        onClick={handleNativeShare}
        class="w-full px-4 py-3 bg-gradient-to-r from-qr-sunset1 to-qr-sunset2 text-black border-3 border-black rounded-xl font-bold flex items-center justify-center gap-2 shadow-chunky hover:shadow-chunky-hover hover:-translate-y-0.5 transition"
      >
        <span>{canWebShare ? "📲" : "↗"}</span>
        {canWebShare ? "Share Sheet" : "Open Share Sheet"}
      </button>
    </div>
  );
}
