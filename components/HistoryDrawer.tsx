import type { HistoryItem } from "../utils/history.ts";
import type { Locale } from "../utils/i18n.ts";
import LibraryDrawer from "./LibraryDrawer.tsx";

export interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (item: HistoryItem) => void;
  lang?: Locale;
}

export default function HistoryDrawer(
  { isOpen, onClose, onSelect, lang }: HistoryDrawerProps,
) {
  return (
    <LibraryDrawer
      isOpen={isOpen}
      onClose={onClose}
      onSelect={onSelect}
      lang={lang}
    />
  );
}
