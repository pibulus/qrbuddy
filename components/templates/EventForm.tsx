import { useEffect, useState } from "preact/hooks";
import type { Signal } from "@preact/signals";
import {
  type CalendarEventData,
  formatCalendarEvent,
  parseCalendarEvent,
  validateCalendarEvent,
} from "../../types/qr-templates.ts";
import { haptics } from "../../utils/haptics.ts";
import { getClientLocale, type Locale } from "../../utils/i18n.ts";

const ES_ERRORS: Record<string, string> = {
  "Event title is required": "El título del evento es obligatorio",
  "Start date is required": "La fecha de inicio es obligatoria",
  "Valid start date required": "Fecha de inicio válida obligatoria",
  "End date must follow start date":
    "La fecha de fin debe ser igual o posterior al inicio",
  "Valid start date and time required":
    "Fecha y hora de inicio válidas obligatorias",
  "Valid end time required": "Hora de término válida obligatoria",
  "End time must follow start time":
    "La hora de término debe ser posterior al inicio",
};

interface Props {
  url: Signal<string>;
  lang?: Locale;
}

function defaultStartValue(): string {
  const now = new Date();
  now.setMinutes(0, 0, 0);
  now.setHours(now.getHours() + 2);
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

export default function EventForm({ url, lang }: Props) {
  const isSpanish = getClientLocale(lang) === "es";
  const [initial] = useState(() => parseCalendarEvent(url.value));
  const [title, setTitle] = useState(() => initial?.title ?? "");
  const [allDay, setAllDay] = useState(() => initial?.allDay ?? false);
  const [start, setStart] = useState(() =>
    initial?.start ?? defaultStartValue()
  );
  const [end, setEnd] = useState(() => initial?.end ?? "");
  const [location, setLocation] = useState(() => initial?.location ?? "");
  const [description, setDescription] = useState(() =>
    initial?.description ?? ""
  );
  const [touched, setTouched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const data: CalendarEventData = {
      title,
      allDay,
      start: allDay ? start.slice(0, 10) : start,
      end: end ? (allDay ? end.slice(0, 10) : end) : "",
      location,
      description,
      url: "",
    };
    const validationError = validateCalendarEvent(data);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError(null);
    const formatted = formatCalendarEvent(data);
    if (formatted && url.value !== formatted) {
      url.value = formatted;
    }
  }, [title, allDay, start, end, location, description]);

  const showHint = (touched || Boolean(title.trim())) && Boolean(error);

  return (
    <div class="qr-menu-pod p-3.5 space-y-3 animate-slide-down">
      {showHint && error && (
        <div
          role="status"
          aria-live="polite"
          class="rounded-xl bg-amber-50 border-2 border-amber-400 px-3.5 py-2 text-xs font-bold text-amber-950"
        >
          {isSpanish ? (ES_ERRORS[error] ?? error) : error}
        </div>
      )}

      <div class="space-y-1.5">
        <div class="flex items-center justify-between gap-2">
          <label class="qr-field-label" for="event-title-input">
            <span class="qr-section-pip" aria-hidden="true" />
            <span>
              {isSpanish ? "Nombre del evento *" : "Event Title *"}
            </span>
          </label>
          <span class="text-[11px] font-bold text-[#6e6058]">
            {isSpanish ? "Funciona sin internet" : "Works offline"}
          </span>
        </div>
        <input
          id="event-title-input"
          type="text"
          maxLength={100}
          value={title}
          onInput={(e) => {
            setTouched(true);
            setTitle((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder={isSpanish
            ? "ej. Boda de Maya y Leo · Lanzamiento de disco"
            : "e.g. Maya & Leo Wedding · Album Launch"}
          class="qr-input text-base"
        />
      </div>

      {/* Timed vs All-Day toggle */}
      <div class="grid grid-cols-2 gap-1.5 p-1 rounded-xl border-2 border-[#1e1714] bg-[#efe9dc]">
        <button
          type="button"
          aria-pressed={!allDay}
          onClick={() => {
            setAllDay(false);
            if (start.length === 10) setStart(`${start}T18:00`);
            if (end.length === 10) setEnd(`${end}T21:00`);
            haptics.light();
          }}
          class={`min-h-[34px] rounded-lg text-xs font-black border-2 transition-all ${
            !allDay
              ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
              : "border-transparent text-[#4a3f39] hover:text-[#1e1714]"
          }`}
        >
          {isSpanish ? "Con hora" : "Timed"}
        </button>
        <button
          type="button"
          aria-pressed={allDay}
          onClick={() => {
            setAllDay(true);
            setStart(start.slice(0, 10));
            if (end) setEnd(end.slice(0, 10));
            haptics.light();
          }}
          class={`min-h-[34px] rounded-lg text-xs font-black border-2 transition-all ${
            allDay
              ? "bg-[var(--qr-theme-tint-strong,#fbcfe8)] text-[#1e1714] border-[#1e1714] shadow-[0_1.5px_0_#1e1714]"
              : "border-transparent text-[#4a3f39] hover:text-[#1e1714]"
          }`}
        >
          {isSpanish ? "Todo el día" : "All day"}
        </button>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        <div class="space-y-1">
          <label class="qr-field-label" for="event-start-input">
            {isSpanish ? "Inicio *" : "Starts *"}
          </label>
          <input
            id="event-start-input"
            type={allDay ? "date" : "datetime-local"}
            value={allDay ? start.slice(0, 10) : start.slice(0, 16)}
            onInput={(e) => {
              setTouched(true);
              setStart((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            class="qr-input text-sm"
          />
        </div>
        <div class="space-y-1">
          <label class="qr-field-label" for="event-end-input">
            {isSpanish ? "Fin (opcional)" : "Ends (optional)"}
          </label>
          <input
            id="event-end-input"
            type={allDay ? "date" : "datetime-local"}
            value={end ? (allDay ? end.slice(0, 10) : end.slice(0, 16)) : ""}
            onInput={(e) => {
              setTouched(true);
              setEnd((e.target as HTMLInputElement).value);
              haptics.light();
            }}
            class="qr-input text-sm"
          />
        </div>
      </div>

      <div class="space-y-1">
        <label class="qr-field-label" for="event-location-input">
          {isSpanish ? "Lugar / Dirección" : "Venue / Location"}
        </label>
        <input
          id="event-location-input"
          type="text"
          maxLength={120}
          value={location}
          onInput={(e) => {
            setTouched(true);
            setLocation((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder={isSpanish
            ? "ej. Salon Roma · Col. Roma Norte"
            : "e.g. Brunswick Ballroom, Sydney Rd"}
          class="qr-input text-sm"
        />
      </div>

      <div class="space-y-1">
        <label class="qr-field-label" for="event-notes-input">
          {isSpanish ? "Detalles (opcional)" : "Details (optional)"}
        </label>
        <input
          id="event-notes-input"
          type="text"
          maxLength={180}
          value={description}
          onInput={(e) => {
            setTouched(true);
            setDescription((e.target as HTMLInputElement).value);
            haptics.light();
          }}
          placeholder={isSpanish
            ? "Código de vestimenta, boletos, acceso…"
            : "Dress code, door times, bring a friend…"}
          class="qr-input text-sm"
        />
      </div>
    </div>
  );
}
