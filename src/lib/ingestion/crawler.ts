import * as cheerio from "cheerio";
import crypto from "crypto";

export interface CrawledPage {
  url: string;
  title: string;
  html: string;
  contentHash: string;
  statusCode: number;
}

export interface CrawlOptions {
  maxPages?: number;
  timeoutMs?: number;
}

const HIGH_PRIORITY_PATHS = [
  "/",
  "/shop",
  "/products",
  "/collections",
  "/catalog",
  "/services",
  "/pricing",
  "/faq",
  "/faqs",
  "/contact",
  "/about",
  "/return-policy",
  "/shipping",
  "/refund-policy",
  "/terms",
];

const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export class WebsiteCrawler {
  private baseDomain: string;
  private visitedUrls = new Set<string>();
  public startUrl: string;

  constructor(startUrl: string) {
    let clean = (startUrl || "").trim();
    if (!/^https?:\/\//i.test(clean)) {
      clean = `https://${clean}`;
    }
    this.startUrl = clean;

    try {
      const parsed = new URL(this.startUrl);
      this.baseDomain = parsed.hostname.replace(/^www\./, "");
    } catch {
      this.baseDomain = clean.replace(/^www\./, "").split("/")[0];
    }
  }

  /**
   * Normalizes URLs by trimming trailing slashes, hashes, and non-essential query params.
   */
  public normalizeUrl(rawUrl: string): string | null {
    try {
      const parsed = new URL(rawUrl, this.startUrl);
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        return null;
      }
      const hostname = parsed.hostname.replace(/^www\./, "");
      if (hostname !== this.baseDomain) {
        return null; // Enforce same-domain rule
      }
      // Strip fragment & tracking parameters
      parsed.hash = "";
      parsed.searchParams.delete("utm_source");
      parsed.searchParams.delete("utm_medium");
      parsed.searchParams.delete("utm_campaign");
      parsed.searchParams.delete("ref");

      let clean = parsed.toString();
      if (clean.endsWith("/") && clean.length > (parsed.origin + "/").length) {
        clean = clean.slice(0, -1);
      }
      return clean;
    } catch {
      return null;
    }
  }

  /**
   * Crawls up to maxPages on the domain, prioritizing high-value catalog/policy pages.
   */
  public async crawl(options: CrawlOptions = {}): Promise<CrawledPage[]> {
    const maxPages = options.maxPages || 6;
    const timeoutMs = options.timeoutMs || 8000;
    const results: CrawledPage[] = [];

    // Seed queue with prioritized targets
    let origin: string;
    try {
      origin = new URL(this.startUrl).origin;
    } catch {
      origin = this.startUrl;
    }

    const queue: string[] = [this.startUrl];
    for (const p of HIGH_PRIORITY_PATHS) {
      const target = this.normalizeUrl(`${origin}${p}`);
      if (target && !queue.includes(target)) {
        queue.push(target);
      }
    }

    while (queue.length > 0 && results.length < maxPages) {
      const currentUrl = queue.shift()!;
      if (this.visitedUrls.has(currentUrl)) continue;
      this.visitedUrls.add(currentUrl);

      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        let response: Response;
        try {
          response = await fetch(currentUrl, {
            signal: controller.signal,
            headers: {
              "User-Agent": BROWSER_USER_AGENT,
              Accept:
                "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
              "Accept-Language": "en-US,en;q=0.9",
              "Cache-Control": "no-cache",
            },
          });
        } catch (fetchErr: any) {
          // If HTTPS fails (SSL cert issues, etc.), try HTTP on the primary URL
          if (currentUrl.startsWith("https://") && currentUrl === this.startUrl) {
            const httpFallback = currentUrl.replace(/^https:\/\//i, "http://");
            response = await fetch(httpFallback, {
              signal: controller.signal,
              headers: {
                "User-Agent": BROWSER_USER_AGENT,
                Accept: "text/html,application/xhtml+xml",
              },
            });
          } else {
            clearTimeout(timer);
            continue;
          }
        }
        clearTimeout(timer);

        if (!response.ok) continue;
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/html")) continue;

        const html = await response.text();
        const contentHash = crypto.createHash("sha256").update(html).digest("hex");

        const $ = cheerio.load(html);
        const title = $("title").text().trim() || $("h1").first().text().trim() || currentUrl;

        results.push({
          url: currentUrl,
          title,
          html,
          contentHash,
          statusCode: response.status,
        });

        // Discover further internal links if we haven't reached quota
        $("a[href]").each((_, el) => {
          const href = $(el).attr("href");
          if (href) {
            const nextUrl = this.normalizeUrl(href);
            if (nextUrl && !this.visitedUrls.has(nextUrl) && !queue.includes(nextUrl)) {
              queue.push(nextUrl);
            }
          }
        });
      } catch {
        // Silently continue crawling other queue items on network timeout
        continue;
      }
    }

    return results;
  }
}
