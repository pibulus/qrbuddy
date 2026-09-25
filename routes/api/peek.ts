import { Handlers } from "$fresh/server.ts";

function isPrivateHost(hostname: string): boolean {
  const lower = hostname.toLowerCase();
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
  }

  // Check IPv6 loopback
  if (lower === "::1" || lower === "[::1]") return true;
  return false;
}

function extractMeta(html: string, finalUrl: string) {
  // Title
  const ogTitleMatch = html.match(
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
  );
  const titleTagMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
  const rawTitle = ogTitleMatch?.[1] || titleTagMatch?.[1] || "";

  // Description
  const ogDescMatch = html.match(
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
  );
  const metaDescMatch = html.match(
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
  );
  const rawDesc = ogDescMatch?.[1] || metaDescMatch?.[1] || "";

  // OG Image
  const ogImageMatch = html.match(
    /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
  ) || html.match(
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
  );

  let image: string | null = null;
  if (ogImageMatch?.[1]) {
    try {
      image = new URL(ogImageMatch[1], finalUrl).href;
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

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(parsedTarget.href, {
        signal: controller.signal,
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (compatible; QRBuddyHazmat/1.0; +https://qrbuddy.app)",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      clearTimeout(timeout);

      const finalUrl = response.url || parsedTarget.href;
      const isRedirected = new URL(finalUrl).origin !== parsedTarget.origin ||
        new URL(finalUrl).pathname !== parsedTarget.pathname;

      const contentType = response.headers.get("content-type") || "";
      if (!contentType.includes("text/html")) {
        return new Response(
          JSON.stringify({
            ok: true,
            url: parsedTarget.href,
            finalUrl,
            domain: new URL(finalUrl).hostname,
            isRedirected,
            title: new URL(finalUrl).hostname,
            description: contentType
              ? `Resource type: ${contentType.split(";")[0]}`
              : "",
            image: null,
          }),
          {
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "public, max-age=300",
            },
          },
        );
      }

      // Stream up to 64KB
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
          domain: new URL(finalUrl).hostname,
          isRedirected,
          title: meta.title || new URL(finalUrl).hostname,
          description: meta.description,
          image: meta.image,
        }),
        {
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "public, max-age=300",
          },
        },
      );
    } catch (_err) {
      // Fallback gracefully on timeout or network error
      return new Response(
        JSON.stringify({
          ok: true,
          url: parsedTarget.href,
          finalUrl: parsedTarget.href,
          domain: parsedTarget.hostname,
          isRedirected: false,
          title: parsedTarget.hostname,
          description: "Preview unavailable (network timeout or offline)",
          image: null,
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
