import { assert, assertEquals } from "$std/assert/mod.ts";
import {
  formatCalendarEvent,
  formatLocation,
  formatWhatsApp,
  parseCalendarEvent,
  parseLocation,
  parseWhatsApp,
  validateCalendarEvent,
  validateLocation,
  validateWhatsApp,
} from "../types/qr-templates.ts";
import {
  detectStructuredStagePayload,
  summarizeQrPayload,
} from "../utils/history.ts";
import { buildQrFilename } from "../utils/svg-export.ts";
import {
  buildEditableLibraryCsv,
  type EditableCsvRow,
  parseEditableCsvUpdates,
} from "../utils/csv-repoint.ts";
import { looksLikeUrl } from "../utils/url.ts";

Deno.test("V3-C: WhatsApp formatter, validator & parser handle country codes and pre-filled copy", () => {
  assertEquals(
    validateWhatsApp({ phone: "123", message: "" }),
    "Valid WhatsApp number required",
  );
  const url = formatWhatsApp({
    phone: "+52 55 1234 5678",
    message: "Hola! Quiero el menú",
  });
  assertEquals(
    url,
    "https://wa.me/525512345678?text=Hola!%20Quiero%20el%20men%C3%BA",
  );
  assertEquals(parseWhatsApp(url), {
    phone: "+525512345678",
    message: "Hola! Quiero el menú",
  });
  assertEquals(
    parseWhatsApp("https://api.whatsapp.com/send?phone=61412345678&text=Hi"),
    { phone: "+61412345678", message: "Hi" },
  );
  assertEquals(
    buildQrFilename(url, "sunset"),
    "qrbuddy-whatsapp-525512345678-sunset.png",
  );
});

Deno.test("V3-C: Calendar VEVENT formatter & parser handle timed and all-day exclusive DTEND round-trip", () => {
  const timed = formatCalendarEvent({
    title: "Maya & Leo Wedding, Dinner",
    allDay: false,
    start: "2026-06-15T18:30",
    end: "2026-06-15T23:00",
    location: "Brunswick Hall; Melbourne",
    description: "Smart casual",
    url: "",
  });
  assert(timed.includes("BEGIN:VEVENT"));
  assert(timed.includes("SUMMARY:Maya & Leo Wedding\\, Dinner"));
  assert(timed.includes("DTSTART:20260615T183000"));
  assert(timed.includes("DTEND:20260615T230000"));
  const parsedTimed = parseCalendarEvent(timed);
  assertEquals(parsedTimed?.title, "Maya & Leo Wedding, Dinner");
  assertEquals(parsedTimed?.location, "Brunswick Hall; Melbourne");
  assertEquals(parsedTimed?.allDay, false);
  assertEquals(parsedTimed?.start, "2026-06-15T18:30");

  const allDay = formatCalendarEvent({
    title: "Art Fair",
    allDay: true,
    start: "2026-08-01",
    end: "",
    location: "Sydney Rd",
    description: "",
    url: "",
  });
  assert(allDay.includes("DTSTART;VALUE=DATE:20260801"));
  assert(allDay.includes("DTEND;VALUE=DATE:20260802"));
  const parsedAllDay = parseCalendarEvent(allDay);
  assertEquals(parsedAllDay?.allDay, true);
  assertEquals(parsedAllDay?.start, "2026-08-01");
  assertEquals(parsedAllDay?.end, "2026-08-01");
  assertEquals(
    validateCalendarEvent({
      title: "",
      allDay: false,
      start: "",
      end: "",
      location: "",
      description: "",
      url: "",
    }),
    "Event title is required",
  );
  assertEquals(
    validateCalendarEvent({
      title: "Art Fair",
      allDay: true,
      start: "2026-08-01",
      end: "2026-08-01",
      location: "",
      description: "",
      url: "",
    }),
    null,
  );
  assertEquals(
    buildQrFilename(allDay, "matcha"),
    "qrbuddy-event-art-fair-matcha.png",
  );
});

Deno.test("V3-C: Location formatter & validator handle places, coords & offline geo: URIs", () => {
  const placeUrl = formatLocation({
    mode: "place",
    query: "Sydney Rd, Brunswick",
    latitude: "",
    longitude: "",
  });
  assertEquals(
    placeUrl,
    "https://maps.google.com/?q=Sydney%20Rd%2C%20Brunswick",
  );
  assertEquals(parseLocation(placeUrl)?.query, "Sydney Rd, Brunswick");

  const geoUri = formatLocation({
    mode: "coords",
    query: "",
    latitude: "-37.7675",
    longitude: "144.9621",
    useGeoUri: true,
  });
  assertEquals(geoUri, "geo:-37.7675,144.9621");
  assertEquals(parseLocation(geoUri)?.useGeoUri, true);

  assertEquals(
    validateLocation({
      mode: "coords",
      query: "",
      latitude: "95",
      longitude: "10",
    }),
    "Latitude must be between -90 and 90",
  );
  assertEquals(
    buildQrFilename(placeUrl, "pool"),
    "qrbuddy-map-sydney-rd-brunswick-pool.png",
  );
});

Deno.test("V3-C: detectStructuredStagePayload preserves Editable compatibility on HTTP WhatsApp/Maps URLs", () => {
  const eventPayload = formatCalendarEvent({
    title: "Release Party",
    allDay: false,
    start: "2026-09-01T20:00",
    end: "",
    location: "Bar Open",
    description: "",
    url: "",
  });
  const stageEvent = detectStructuredStagePayload(eventPayload, "en");
  assertEquals(stageEvent?.template, "event");
  assertEquals(stageEvent?.label, "Release Party");

  const stageGeo = detectStructuredStagePayload("geo:-37.76,144.96", "es");
  assertEquals(stageGeo?.template, "location");

  // HTTP links must keep returning null so Editable mode stays enabled on stage
  assertEquals(
    detectStructuredStagePayload("https://wa.me/61412345678?text=Hi", "en"),
    null,
  );
  assertEquals(
    detectStructuredStagePayload("https://maps.google.com/?q=Brunswick", "en"),
    null,
  );

  // Saved shelf summaries classify all three payloads properly
  assertEquals(
    summarizeQrPayload("https://wa.me/61412345678?text=Menu").type,
    "whatsapp",
  );
  assertEquals(summarizeQrPayload(eventPayload).type, "event");
  assertEquals(
    summarizeQrPayload("https://maps.google.com/?q=Brunswick").type,
    "location",
  );
});

Deno.test("V3-C: Editable CSV round-trip detects modified destination URLs, titles and tags accurately", () => {
  const existingRows: EditableCsvRow[] = [
    {
      shortCode: "abc123",
      title: "Table 1",
      destinationUrl: "https://cafe.co/winter",
      tags: ["brunswick", "menu"],
      redirectUrl: "https://qrbuddy.app/r?code=abc123",
      scanCount: 42,
      isActive: true,
      ownerToken: "tok_abc",
    },
    {
      shortCode: "def456",
      title: "Patio Bar",
      destinationUrl: "https://cafe.co/patio",
      tags: ["patio"],
      redirectUrl: "https://qrbuddy.app/r?code=def456",
      scanCount: 9,
      isActive: true,
      ownerToken: "tok_def",
    },
  ];
  const map = new Map(existingRows.map((r) => [r.shortCode, r]));
  const csv = buildEditableLibraryCsv(existingRows);

  const modifiedCsv = "\uFEFF" +
    csv
      .replace("https://cafe.co/winter", "https://cafe.co/spring")
      .replace("Table 1", '"Table 1, Courtyard"');

  const parsed = parseEditableCsvUpdates(modifiedCsv, map);
  assertEquals(parsed.errors.length, 0);
  assertEquals(parsed.unchangedCount, 1);
  assertEquals(parsed.updates.length, 1);
  assertEquals(parsed.updates[0].shortCode, "abc123");
  assertEquals(parsed.updates[0].destinationChanged, true);
  assertEquals(parsed.updates[0].nextDestinationUrl, "https://cafe.co/spring");
  assertEquals(parsed.updates[0].titleChanged, true);
  assertEquals(parsed.updates[0].nextTitle, "Table 1, Courtyard");
  assertEquals(parsed.updates[0].tagsChanged, false);
});

Deno.test("V3-Security: looksLikeUrl allows geo: while blocking @-userinfo scheme bypasses & CSV escapes formulas", () => {
  assertEquals(looksLikeUrl("geo:-37.7675,144.9621"), true);
  assertEquals(looksLikeUrl("geo:"), false);
  assertEquals(looksLikeUrl("example.com:8080/menu"), true);
  assertEquals(looksLikeUrl("javascript:alert(1)@evil.com"), false);
  assertEquals(looksLikeUrl("vbscript:msgbox(1)@evil.com"), false);
  assertEquals(looksLikeUrl("data:text/html,@evil.com"), false);

  const csv = buildEditableLibraryCsv([
    {
      shortCode: "fx1",
      title: '=HYPERLINK("https://evil.com","Click")',
      destinationUrl: "https://qrbuddy.app",
      tags: ["+tag"],
      redirectUrl: "@SUM(1+1)",
      scanCount: 5,
      isActive: true,
    },
  ]);
  assert(
    csv.includes("'=HYPERLINK"),
    "Formula-prefixed titles must be neutralized on CSV export",
  );
  assert(
    csv.includes("'@SUM(1+1)"),
    "Formula-prefixed URLs/cells must be neutralized on CSV export",
  );
  assert(!csv.includes('"=HYPERLINK'), "Unescaped leading = must not remain");
});
