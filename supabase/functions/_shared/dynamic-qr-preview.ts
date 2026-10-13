export function isLinkPreviewBot(userAgent: string): boolean {
  return /(?:bot|crawler|spider|facebookexternalhit|preview|linkpreview)/i.test(
    userAgent,
  );
}

/** Keep unfurlers from learning or consuming a finite QR's destination. */
export function createNeutralFiniteQrPreviewResponse(
  corsHeaders: Record<string, string>,
): Response {
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="robots" content="noindex,nofollow"><title>QRBuddy link</title></head><body><p>Scan this QR code to continue.</p></body></html>',
    {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, max-age=0",
        "X-Robots-Tag": "noindex, nofollow",
      },
    },
  );
}
