import { Handlers } from "$fresh/server.ts";

const MAX_REDIRECTS = 5;

export function isPrivateHost(hostname: string): boolean {
  const lower = hostname
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/\.+$/, "");
  if (
    lower === "localhost" ||
    lower.endsWith(".local") ||
    lower.endsWith(".internal") ||
    lower.endsWith(".lan") ||
    lower.endsWith(".home")
  ) {
    return true;
  }

  // Check IPv4 private / loopback / link-local ranges
  const ipv4Regex = /^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/;
  const match = lower.match(ipv4Regex);
  if (match) {
    const [, a, b] = match.map(Number);
    if (a === 10) return true;
    if (a === 127) return true;
    if (a === 0) return true;
    if (a === 169 && b === 254) return true;
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // Carrier-grade NAT
  }

  // Check IPv6 loopback / unique local / link-local / IPv4-mapped IPv6
  if (
    lower === "::1" ||
    lower === "::" ||
    lower.startsWith("::ffff:") ||
    lower.startsWith("0:0:0:0:0:ffff:") ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe80:")
  ) {
    return true;
  }
  return false;
}

export function buildScreenshotUrl(finalUrl: string): string {
  let cleanUrl = finalUrl;
  try {
    const parsed = new URL(finalUrl);
    parsed.hash = "";
    cleanUrl = parsed.href;
  } catch {
    // Keep original if unparseable
  }
  return `https://s.wordpress.com/mshots/v1/${
    encodeURIComponent(cleanUrl)
  }?w=640&h=400`;
}

export function extractMeta(html: string, finalUrl: string) {
  // Title
  const ogTitleMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:title["']/i,
  ) || html.match(
    /<meta[^>]+(?:property|name)=["']twitter:title["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:title["']/i,
  );
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = ogTitleMatch?.[1] || titleTagMatch?.[1] || "";

  // Description
  const ogDescMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:description["']/i,
  ) || html.match(
    /<meta[^>]+(?:property|name)=["']twitter:description["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:description["']/i,
  );
  const metaDescMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  );
  const rawDesc = ogDescMatch?.[1] || metaDescMatch?.[1] || "";

  // Image: og:image -> twitter:image -> apple-touch-icon
  const ogImageMatch = html.match(
    /<meta[^>]+(?:property|name)=["']og:image(?::url)?["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']og:image(?::url)?["']/i,
  );
  const twitterImageMatch = html.match(
    /<meta[^>]+(?:property|name)=["']twitter:image(?::src)?["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']twitter:image(?::src)?["']/i,
  );
  const touchIconMatch = html.match(
    /<link[^>]+rel=["'][^"']*apple-touch-icon[^"']*["'][^>]+href=["']([^"']+)["']/i,
  ) || html.match(
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["'][^"']*apple-touch-icon[^"']*["']/i,
  );

  const rawImage = ogImageMatch?.[1] || twitterImageMatch?.[1] ||
    touchIconMatch?.[1] || "";

  let image: string | null = null;
  if (rawImage) {
    try {
      const resolved = new URL(rawImage, finalUrl);
      if (
        (resolved.protocol === "http:" || resolved.protocol === "https:") &&
        !isPrivateHost(resolved.hostname)
      ) {
        image = resolved.href;
      }
    } catch {
      // invalid image URL
    }
  }

  const decodeHtml = (str: string) =>
    str
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .trim();

  return {
    title: decodeHtml(rawTitle).slice(0, 150),
    description: decodeHtml(rawDesc).slice(0, 300),
    image,
  };
}

function isRedirectStatus(status: number): boolean {
  return (
    status === 301 ||
    status === 302 ||
    status === 303 ||
    status === 307 ||
    status === 308
  );
}

export const handler: Handlers = {
  async GET(req) {
    const reqUrl = new URL(req.url);
    const target = reqUrl.searchParams.get("url");

    if (!target) {
      return new Response(
        JSON.stringify({ ok: false, error: "Missing url parameter" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    let parsedTarget: URL;
    try {
      parsedTarget = new URL(target.trim());
      // Never forward client #hash fragments (e.g. #passport=...) to upstream servers or mshots
      parsedTarget.hash = "";
      if (
        parsedTarget.protocol !== "http:" && parsedTarget.protocol !== "https:"
      ) {
        return new Response(
          JSON.stringify({ ok: false, error: "Only HTTP/HTTPS URLs allowed" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    } catch {
      return new Response(
        JSON.stringify({ ok: false, error: "Invalid URL" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    if (isPrivateHost(parsedTarget.hostname)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Internal or private addresses not allowed",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    const redirectChain: string[] = [parsedTarget.href];
    let currentUrl = parsedTarget;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      let response: Response | null = null;
      try {
        for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
          response = await fetch(currentUrl.href, {
            signal: controller.signal,
            redirect: "manual",
            headers: {
              "User-Agent":
                "Mozilla/5.0 (compatible; QRBuddyHazmat/1.0; +https://qrbuddy.app)",
              "Accept":
                "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
            },
          });

          if (isRedirectStatus(response.status) && hop < MAX_REDIRECTS) {
            const location = response.headers.get("location");
            try {
              await response.body?.cancel();
            } catch {
              // ignore
            }
            if (!location) break;

            let nextUrl: URL;
            try {
              nextUrl = new URL(location, currentUrl.href);
              nextUrl.hash = "";
            } catch {
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "Invalid redirect location",
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            if (
              nextUrl.protocol !== "http:" && nextUrl.protocol !== "https:"
            ) {
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "Redirect to non-HTTP/HTTPS protocol not allowed",
                }),
                {
                  status: 400,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            if (isPrivateHost(nextUrl.hostname)) {
              return new Response(
                JSON.stringify({
                  ok: false,
                  error: "Redirect to internal or private address not allowed",
                }),
                {
                  status: 403,
                  headers: { "Content-Type": "application/json" },
                },
              );
            }

            redirectChain.push(nextUrl.href);
            currentUrl = nextUrl;
            continue;
          }

          break;
        }

        if (!response) {
          throw new Error("No response received");
        }

        const finalUrl = currentUrl.href;
        const finalUrlObj = new URL(finalUrl);
        const isRedirected = redirectChain.length > 1 ||
          finalUrlObj.origin !== parsedTarget.origin ||
          finalUrlObj.pathname !== parsedTarget.pathname;
        const isHttps = finalUrlObj.protocol === "https:";
        const statusCode = response.status;

        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) {
          try {
            await response.body?.cancel();
          } catch {
            // ignore
          }
          return new Response(
            JSON.stringify({
              ok: true,
              url: parsedTarget.href,
              finalUrl,
              domain: finalUrlObj.hostname,
              isRedirected,
              redirectChain,
              isHttps,
              statusCode,
              title: finalUrlObj.hostname,
              description: contentType
                ? `Resource type: ${contentType.split(";")[0]}`
                : "",
              image: null,
              screenshotUrl: null,
            }),
            {
              headers: {
                "Content-Type": "application/json",
                "Cache-Control": "public, max-age=300",
              },
            },
          );
        }

        // Stream up to 64KB (still governed by controller.signal timeout)
        const reader = response.body?.getReader();
        let html = "";
        if (reader) {
          const decoder = new TextDecoder();
          let bytesRead = 0;
          const maxBytes = 64 * 1024;
          while (bytesRead < maxBytes) {
            const { done, value } = await reader.read();
            if (done || !value) break;
            bytesRead += value.length;
            html += decoder.decode(value, { stream: true });
            if (html.includes("</head>")) break;
          }
          try {
            await reader.cancel();
          } catch {
            // ignore
          }
        }

        const meta = extractMeta(html, finalUrl);

        return new Response(
          JSON.stringify({
            ok: true,
            url: parsedTarget.href,
            finalUrl,
            domain: finalUrlObj.hostname,
            isRedirected,
            redirectChain,
            isHttps,
            statusCode,
            title: meta.title || finalUrlObj.hostname,
            description: meta.description,
            image: meta.image,
            screenshotUrl: buildScreenshotUrl(finalUrl),
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      } finally {
        clearTimeout(timeout);
      }
    } catch (_err) {
      // Fallback gracefully on timeout or network error
      const finalUrlObj = currentUrl;
      return new Response(
        JSON.stringify({
          ok: true,
          url: parsedTarget.href,
          finalUrl: finalUrlObj.href,
          domain: finalUrlObj.hostname,
          isRedirected: redirectChain.length > 1,
          redirectChain,
          isHttps: finalUrlObj.protocol === "https:",
          statusCode: 0,
          title: finalUrlObj.hostname,
          description: "Preview unavailable (network timeout or offline)",
          image: null,
          screenshotUrl: buildScreenshotUrl(finalUrlObj.href),
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
        },
      );
    }
  },
};
