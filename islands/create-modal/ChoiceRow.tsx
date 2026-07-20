interface ChoiceRowProps {
  icon: string;
  title: string;
  description: string;
  active?: boolean;
  eyebrow?: string;
  onClick: () => void;
}

/** Shared tappable row used across CreateModal's Type/Options tabs — a big
 * icon chip, title + description, optional "Active" pill and eyebrow tag. */
export default function ChoiceRow(
  { icon, title, description, active = false, eyebrow, onClick }:
    ChoiceRowProps,
) {
  return (
    <button
      type="button"
      onClick={onClick}
      class={`group w-full min-h-[64px] rounded-2xl border-3 px-3 py-3 text-left transition-all flex items-center gap-3 ${
        active
          ? "border-black bg-qr-cream shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] translate-x-[-1px] translate-y-[-1px]"
          : "border-gray-200 bg-white hover:border-black hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
      }`}
    >
      <span class="w-11 h-11 rounded-xl border-2 border-black bg-white flex items-center justify-center text-xl shrink-0">
        {icon}
      </span>
      <span class="min-w-0 flex-1">
        <span class="flex items-center gap-2">
          <span class="font-black text-gray-900 leading-tight">{title}</span>
          {active && (
            <span class="rounded-full bg-black px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-white">
              Active
            </span>
          )}
        </span>
        <span class="block text-xs sm:text-sm text-gray-600 leading-snug mt-0.5">
          {description}
        </span>
      </span>
      {eyebrow && (
        <span class="hidden sm:inline rounded-full bg-gray-100 px-2 py-1 text-[10px] font-black uppercase tracking-wide text-gray-500">
          {eyebrow}
        </span>
      )}
    </button>
  );
}
