import { Signal } from "@preact/signals";
import LogoUploader from "../LogoUploader.tsx";

interface LogoSettingsProps {
  logoUrl: Signal<string>;
}

export default function LogoSettings({ logoUrl }: LogoSettingsProps) {
  return (
    <div class="bg-gradient-to-r from-[#FFF8F0] to-[#FFE5B4] border-3 border-[#FFE5B4] rounded-xl p-4 space-y-3 shadow-chunky animate-slide-down">
      <LogoUploader logoUrl={logoUrl} />
    </div>
  );
}
