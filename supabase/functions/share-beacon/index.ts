// Edge Function: Share Beacon
// The share page (/f/{code}) reports two things, straight from the browser
// so the edge sees the visitor's real headers: a "view" when the page opens,
// and one "engagement" batch when it closes (which items played, how long,
// did they finish, shares/downloads tapped). Everything lands as tallies via
// record_share_activity — no per-visitor rows, no IPs stored.

import { serve } from "https://deno.land/std@0.216.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createCorsResponse, getCorsHeaders } from "../_shared/cors.ts";
import {
  checkRateLimit,
  createRateLimitResponse,
  getClientIP,
} from "../_shared/rate-limit.ts";
import {
  dayAndHour,
  describeVisitor,
  visitorDayHash,
} from "../_shared/visitor.ts";
import { cellOf, conditionsNow } from "../_shared/conditions.ts";

interface BeaconBody {
  fileId?: string;
  kind?: "view" | "engagement";
  items?: Record<string, number>;
  dwellSeconds?: number;
  completed?: boolean;
  shares?: number;
  downloads?: number;
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ok(req: Request, status = 204) {
  return new Response(null, { status, headers: getCorsHeaders(req) });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return createCorsResponse(req);
  if (req.method !== "POST") return ok(req, 405);

  try {
    // Beacons are cheap but a loop could spam them — 120/min per IP is
    // generous for humans and a wall for scripts.
    const rl = checkRateLimit(`beacon:${getClientIP(req)}`, {
      windowMs: 60 * 1000,
      maxRequests: 120,
    });
    if (rl.isLimited) return createRateLimitResponse(rl, getCorsHeaders(req));

    // sendBeacon posts text/plain; fetch posts JSON. Accept both.
    const body: BeaconBody = JSON.parse(await req.text() || "{}");
    const fileId = body.fileId ?? "";
    if (!UUID_RE.test(fileId)) return ok(req, 400);

    const visitor = describeVisitor(req);
    // Crawlers and link previews open share pages constantly — not scans.
    if (visitor.device === "bot") return ok(req);

    const { day, hour } = dayAndHour();
    const isView = body.kind !== "engagement";
    const hash = isView ? await visitorDayHash(req, day) : null;

    // Clamp everything the page sends: it's public input.
    const items: Record<string, number> = {};
    for (const [k, v] of Object.entries(body.items ?? {})) {
      if (UUID_RE.test(k) && Number.isFinite(v)) {
        items[k] = Math.min(Math.max(Math.round(v), 0), 500);
      }
    }
    const dwell = Math.min(
      Math.max(Math.round(body.dwellSeconds ?? 0), 0),
      6 * 60 * 60,
    );
    const clampCount = (n: unknown) =>
      Math.min(Math.max(Math.round(Number(n) || 0), 0), 20);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { error } = await supabase.rpc("record_share_activity", {
      p_file_id: fileId,
      p_day: day,
      p_hour: hour,
      // A view without a hash (no salt configured) still counts as a view;
      // it just can't count as a person. Use a per-request random so the
      // RPC treats it as a view.
      p_hash: isView ? (hash ?? `anon-${crypto.randomUUID()}`) : null,
      p_country: visitor.country,
      p_city: visitor.city,
      p_device: visitor.device,
      p_os: visitor.os,
      p_referred: visitor.referred,
      p_items: isView ? {} : items,
      p_dwell_s: isView ? 0 : dwell,
      p_completed: isView ? false : Boolean(body.completed),
      p_shares: isView ? 0 : clampCount(body.shares),
      p_downloads: isView ? 0 : clampCount(body.downloads),
      p_lang: isView ? visitor.lang : null,
      p_app: isView ? visitor.app : null,
      p_lat: isView ? visitor.lat : null,
      p_lon: isView ? visitor.lon : null,
    });

    // A share that no longer exists (blown up, cleaned) fails the FK — that's
    // fine, and not the visitor's problem.
    if (error) console.error("record_share_activity:", error.message);

    // What the world was like: weather/temp/time-of-day for the scanner's
    // ~10 km cell (cached; at most one Open-Meteo call per cell per day) and
    // the moon. Tallied as keys; lift is judged against a baseline later.
    if (isView && !error) {
      const cell = cellOf(visitor.lat, visitor.lon);
      const keys = await conditionsNow(supabase, cell);
      const { error: condError } = await supabase.rpc(
        "record_share_conditions",
        { p_file_id: fileId, p_day: day, p_cell: cell, p_keys: keys },
      );
      if (condError) {
        console.error("record_share_conditions:", condError.message);
      }
    }
    return ok(req);
  } catch (error) {
    console.error("share-beacon failed:", error);
    return ok(req, 400);
  }
});
