interface StatusBadgeProps {
  icon: string;
  label: string;
  subtext: string;
  colorClass: string; // e.g., "blue"
}

export default function StatusBadge({
  icon,
  label,
  subtext,
  colorClass,
}: StatusBadgeProps) {
  // Map color names to tailwind classes dynamically or use a lookup object if needed.
  // For simplicity, we'll assume standard tailwind colors are passed or we construct classes.
  // However, dynamic class construction like `bg-${color}-50` can be purged by Tailwind.
  // It's safer to use a lookup or pass full classes.

  // Let's use a lookup for the specific cases we have: blue, teal.
  const colors: Record<string, { bg: string; border: string; text: string }> = {
    blue: {
      bg: "bg-gradient-to-r from-blue-50 to-cyan-50",
      border: "border-blue-200",
      text: "text-blue-700",
    },
    teal: {
      bg: "bg-gradient-to-r from-teal-50 to-cyan-50",
      border: "border-teal-200",
      text: "text-teal-700",
    },
  };

  const theme = colors[colorClass] || colors.blue;

  return (
    <div class="text-center animate-slide-down py-4">
      <div
        class={`inline-flex items-center gap-2 px-4 py-2 ${theme.bg} border-2 ${theme.border} rounded-full shadow-sm`}
      >
        <span class="text-xl animate-pulse">{icon}</span>
        <span class={`text-sm font-bold ${theme.text} uppercase tracking-wide`}>
          {label}
        </span>
      </div>
      <p class="text-xs text-gray-400 mt-2 font-medium">
        {subtext}
      </p>
    </div>
  );
}
