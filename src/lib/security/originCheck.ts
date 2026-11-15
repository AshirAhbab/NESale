import { NextRequest } from "next/server";

export interface CorsResult {
  allowed: boolean;
  origin: string;
  headers: Record<string, string>;
}

/**
 * Validates request Origin and generates safe CORS headers for embedded widgets.
 */
export function validateWidgetOrigin(
  req: NextRequest,
  businessWebsiteUrl?: string | null
): CorsResult {
  const origin = req.headers.get("origin") || req.headers.get("referer") || "*";
  
  // Allow all in development or preview environments
  const isDev = process.env.NODE_ENV !== "production";
  if (isDev || origin === "*" || !businessWebsiteUrl) {
    return {
      allowed: true,
      origin: origin === "*" ? "*" : origin,
      headers: {
        "Access-Control-Allow-Origin": origin === "*" ? "*" : origin,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      },
    };
  }

  try {
    const originHost = new URL(origin).hostname.toLowerCase();
    const allowedHost = new URL(businessWebsiteUrl).hostname.toLowerCase();

    // Check exact match, subdomains, or Vercel preview domains
    const isMatched =
      originHost === allowedHost ||
      originHost.endsWith(`.${allowedHost}`) ||
      originHost.endsWith(".vercel.app") ||
      originHost === "localhost" ||
      originHost === "127.0.0.1";

    return {
      allowed: isMatched,
      origin,
      headers: {
        "Access-Control-Allow-Origin": isMatched ? origin : businessWebsiteUrl,
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
        "Access-Control-Max-Age": "86400",
      },
    };
  } catch {
    // If URL parsing fails, permit with standard headers
    return {
      allowed: true,
      origin,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
      },
    };
  }
}
