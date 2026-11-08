import { NextRequest, NextResponse } from "next/server";
import { WebsiteCrawler } from "@/lib/ingestion/crawler";
import { ContentExtractor, ExtractedData } from "@/lib/ingestion/extractor";
import { prisma } from "@/lib/db/prisma";
import {
  isServicesBusiness,
  normalizeBusinessType,
  normalizeServiceSubtype,
} from "@/lib/business/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    let { url, saveToDb = false, businessId, userEmail, businessType, businessSubtype } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A valid website URL is required.",
          },
        },
        { status: 400 }
      );
    }

    // Auto-normalize URL (add https:// if missing)
    let cleanUrl = url.trim();
    if (!/^https?:\/\//i.test(cleanUrl)) {
      cleanUrl = `https://${cleanUrl}`;
    }

    let parsedOrigin = "";
    let domainSlug = "";
    let derivedFallbackName = "Storefront";

    try {
      const parsed = new URL(cleanUrl);
      parsedOrigin = parsed.origin;
      domainSlug = parsed.hostname.replace(/^www\./, "").replace(/[^a-zA-Z0-9-]/g, "-").toLowerCase();
      const domainParts = parsed.hostname.replace(/^www\./, "").split(".")[0];
      derivedFallbackName = domainParts
        .split(/[-_]/)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ");
    } catch {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid URL domain format.",
          },
        },
        { status: 400 }
      );
    }

    // Initialize Crawler
    const crawler = new WebsiteCrawler(cleanUrl);
    const pages = await crawler.crawl({ maxPages: 6, timeoutMs: 8000 });

    // Aggregate extraction across all crawled pages
    const aggregated: ExtractedData = {
      profile: {},
      categories: [],
      products: [],
      faqs: [],
      chunks: [],
    };

    for (const page of pages) {
      const extracted = ContentExtractor.extract(page.url, page.html);

      // Merge profile
      if (!aggregated.profile.name && extracted.profile.name) {
        aggregated.profile.name = extracted.profile.name;
      }
      if (!aggregated.profile.description && extracted.profile.description) {
        aggregated.profile.description = extracted.profile.description;
      }
      if (!aggregated.profile.email && extracted.profile.email) {
        aggregated.profile.email = extracted.profile.email;
      }
      if (!aggregated.profile.phone && extracted.profile.phone) {
        aggregated.profile.phone = extracted.profile.phone;
      }
      if (!aggregated.profile.logoUrl && extracted.profile.logoUrl) {
        aggregated.profile.logoUrl = extracted.profile.logoUrl;
      }

      // Merge categories
      for (const cat of extracted.categories) {
        if (!aggregated.categories.includes(cat)) {
          aggregated.categories.push(cat);
        }
      }

      // Merge products (deduplicated by name)
      for (const prod of extracted.products) {
        if (!aggregated.products.some((p) => p.name.toLowerCase() === prod.name.toLowerCase())) {
          aggregated.products.push(prod);
        }
      }

      // Merge FAQs
      for (const faq of extracted.faqs) {
        if (!aggregated.faqs.some((f) => f.question.toLowerCase() === faq.question.toLowerCase())) {
          aggregated.faqs.push(faq);
        }
      }

      // Collect chunks
      aggregated.chunks.push(...extracted.chunks);
    }

    // Fallback email to logged-in user email if not displayed on the public site
    if (!aggregated.profile.email && userEmail) {
      aggregated.profile.email = userEmail;
    }

    // Try checking Shopify /products.json if products list is small or empty
    if (aggregated.products.length < 5 && parsedOrigin) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4000);
        const shopifyRes = await fetch(`${parsedOrigin}/products.json?limit=30`, {
          signal: controller.signal,
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            Accept: "application/json",
          },
        });
        clearTimeout(timer);

        if (shopifyRes.ok) {
          const shopifyData = await shopifyRes.json();
          if (Array.isArray(shopifyData?.products)) {
            for (const sp of shopifyData.products) {
              if (!aggregated.products.some((p) => p.name.toLowerCase() === sp.title.toLowerCase())) {
                const variant = sp.variants?.[0];
                const image = sp.images?.[0]?.src;
                aggregated.products.push({
                  name: sp.title,
                  description: sp.body_html
                    ? sp.body_html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 300)
                    : undefined,
                  price: variant?.price ? parseFloat(variant.price) : undefined,
                  currency: "USD",
                  imageUrl: image,
                  url: `${parsedOrigin}/products/${sp.handle}`,
                  sku: variant?.sku,
                  inStock: variant?.available ?? true,
                });
              }
            }
          }
        }
      } catch {
        // Silently continue if site does not expose public products.json
      }
    }

    // Fallback if no business name was found in metadata
    let bizName = aggregated.profile.name;
    if (!bizName || bizName.length < 2) {
      bizName = derivedFallbackName;
      aggregated.profile.name = bizName;
    }

    let persistedBusinessId: string | null = null;

    // Optional database persistence
    if (saveToDb) {
      try {
        const business = await prisma.business.upsert({
          where: { slug: domainSlug },
          update: {
            name: bizName,
            businessType: normalizeBusinessType(businessType),
            businessSubtype: isServicesBusiness(businessType)
              ? normalizeServiceSubtype(businessSubtype) || "other"
              : null,
            websiteUrl: cleanUrl,
            description: aggregated.profile.description || undefined,
            email: aggregated.profile.email || undefined,
            phone: aggregated.profile.phone || undefined,
            logoUrl: aggregated.profile.logoUrl || undefined,
          },
          create: {
            id: businessId || undefined,
            name: bizName,
            slug: domainSlug,
            businessType: normalizeBusinessType(businessType),
            businessSubtype: isServicesBusiness(businessType)
              ? normalizeServiceSubtype(businessSubtype) || "other"
              : null,
            websiteUrl: cleanUrl,
            description: aggregated.profile.description || undefined,
            email: aggregated.profile.email || undefined,
            phone: aggregated.profile.phone || undefined,
            logoUrl: aggregated.profile.logoUrl || undefined,
          },
        });

        persistedBusinessId = business.id;

        // Persist knowledge source
        const source = await prisma.knowledgeSource.create({
          data: {
            businessId: business.id,
            type: "webpage",
            sourceUrl: cleanUrl,
            title: `${bizName} Website Ingestion`,
            status: "ready",
            metadata: {
              crawledPages: pages.length,
            },
          },
        });

        // Persist knowledge chunks
        if (aggregated.chunks.length > 0) {
          const chunkData = aggregated.chunks.slice(0, 50).map((chunk) => ({
            businessId: business.id,
            sourceId: source.id,
            content: chunk.content,
            contentHash: chunk.contentHash,
            metadata: {
              title: chunk.title,
              url: chunk.sourceUrl,
            },
          }));

          await prisma.knowledgeChunk.createMany({
            data: chunkData,
          });
        }

        // Persist extracted products
        for (const prod of aggregated.products.slice(0, 30)) {
          await prisma.product.create({
            data: {
              businessId: business.id,
              name: prod.name,
              description: prod.description || undefined,
              priceMin: prod.price || undefined,
              currency: prod.currency || "USD",
              url: prod.url || undefined,
              imageUrl: prod.imageUrl || undefined,
              status: "active",
            },
          });
        }
      } catch (dbErr) {
        console.warn("[Onboarding API] Database persistence skipped or failed:", dbErr);
      }
    }

    return NextResponse.json({
      status: "success",
      crawledPages: pages.length,
      profile: aggregated.profile,
      categories: aggregated.categories,
      products: aggregated.products,
      faqs: aggregated.faqs,
      totalChunks: aggregated.chunks.length,
      sampleChunks: aggregated.chunks.slice(0, 3),
      persistedBusinessId,
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        error: {
          code: "INTERNAL_ERROR",
          message: error?.message || "Failed to process website ingestion.",
        },
      },
      { status: 500 }
    );
  }
}
