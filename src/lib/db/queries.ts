import { prisma } from "./prisma";
import { CatalogItem, KnowledgeItem } from "../ai/types";
import { isServicesBusiness } from "../business/types";

/**
 * Returns the AI-visible catalog for a tenant. E-commerce tenants get products;
 * services tenants get bookable services.
 */
export async function getTenantCatalog(
  businessId?: string,
  businessType?: string | null
): Promise<CatalogItem[]> {
  const services = isServicesBusiness(businessType);

  try {
    if (services) {
      const rows = await prisma.service.findMany({
        where: {
          status: "active",
          ...(businessId ? { businessId } : {}),
        },
        take: 50,
      });

      return rows.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description || undefined,
        price: s.priceMin ? Number(s.priceMin) : 0,
        currency: s.currency || "USD",
        category: s.category || "Service",
        available: s.status === "active",
        url: s.bookingUrl || undefined,
      }));
    }

    const products = await prisma.product.findMany({
      where: {
        status: "active",
        ...(businessId ? { businessId } : {}),
      },
      take: 50,
    });

    return products.map((p) => {
      const metadata = (p.metadata as Record<string, any>) || {};
      const priceNum = p.priceMin ? Number(p.priceMin) : 0;
      return {
        id: p.id,
        name: p.name,
        description: p.description || undefined,
        price: priceNum,
        currency: p.currency || "USD",
        category: p.productType || metadata.category || undefined,
        available: p.status === "active",
        rating: metadata.rating ? String(metadata.rating) : undefined,
        url: p.url || (p.slug ? `/products/${p.slug}` : undefined),
      };
    });
  } catch (error) {
    console.warn("[Tenant Catalog] DB fetch failed:", error);
    return [];
  }
}

export async function getTenantKnowledge(businessId?: string): Promise<KnowledgeItem[]> {
  try {
    const chunks = await prisma.knowledgeChunk.findMany({
      where: businessId ? { businessId } : undefined,
      include: {
        source: {
          select: {
            title: true,
            sourceUrl: true,
          },
        },
      },
      take: 50,
    });

    return chunks.map((c) => {
      const metadata = (c.metadata as Record<string, any>) || {};
      return {
        id: c.id,
        title: metadata.title || c.source?.title || "Documentation",
        content: c.content,
        sourceUrl: c.source?.sourceUrl || undefined,
      };
    });
  } catch (error) {
    console.warn("[Tenant Knowledge] DB fetch failed:", error);
    return [];
  }
}
