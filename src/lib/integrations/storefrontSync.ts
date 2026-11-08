import { prisma } from "@/lib/db/prisma";

export interface ShopifyPublicProduct {
  id: number | string;
  title: string;
  handle: string;
  body_html: string;
  vendor: string;
  product_type: string;
  created_at?: string;
  updated_at?: string;
  images: { id: number | string; src: string }[];
  variants: {
    id: number | string;
    title: string;
    price: string;
    sku: string;
    available: boolean;
    inventory_quantity?: number;
  }[];
}

export class StorefrontSync {
  /**
   * Universal product catalog fetcher:
   * 1. Attempts Shopify /products.json (Standard Shopify stores)
   * 2. If 404 or non-Shopify, crawls website HTML:
   *    - Inspects Next.js static chunks & embedded state
   *    - Ingests JSON-LD Schema.org Product data
   *    - Scrapes product cards & meta tags
   */
  public static async fetchPublicProducts(storeUrl: string): Promise<{ products: ShopifyPublicProduct[]; storeName?: string }> {
    let cleanDomain = storeUrl.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
    const protocol = storeUrl.startsWith("http://") ? "http://" : "https://";
    const origin = `${protocol}${cleanDomain}`;

    // 1. Try public Shopify /products.json first
    try {
      const endpoint = `${origin}/products.json?limit=250`;
      const res = await fetch(endpoint, {
        headers: {
          "User-Agent": "NESale-Catalog-Ingest/1.0 (Storefront Sync)",
          Accept: "application/json",
        },
        next: { revalidate: 0 },
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.products) && data.products.length > 0) {
          return { products: data.products as ShopifyPublicProduct[] };
        }
      }
    } catch {
      // Non-Shopify storefront or restricted endpoint; proceed to fallback crawler
    }

    // 2. Fetch Website HTML for Next.js, Vercel, WooCommerce or Custom Storefronts
    let html = "";
    try {
      const res = await fetch(origin, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        next: { revalidate: 0 },
      });

      if (!res.ok) {
        throw new Error(`Failed to reach ${cleanDomain} (Status: ${res.status}). Verify domain is reachable.`);
      }

      html = await res.text();
    } catch (fetchErr: any) {
      throw new Error(`Could not connect to ${cleanDomain}: ${fetchErr.message}`);
    }

    // Extract Store Title
    let storeName: string | undefined;
    const titleMatch = html.match(/<title[^>]*>([^<|]+)/i);
    if (titleMatch && titleMatch[1]) {
      storeName = titleMatch[1].trim();
    }

    const harvestedProducts: ShopifyPublicProduct[] = [];

    // A. Check JSON-LD Structured Data
    try {
      const jsonLdRegex = /<script\s+[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
      let match;
      while ((match = jsonLdRegex.exec(html)) !== null) {
        try {
          const parsed = JSON.parse(match[1]);
          const items = Array.isArray(parsed) ? parsed : [parsed];
          for (const item of items) {
            if (item["@type"] === "Product" || item.type === "Product") {
              const pId = item.sku || item.identifier || `prod-${harvestedProducts.length + 1}`;
              const pTitle = item.name || "Product";
              const pPrice = String(item.offers?.price || item.price || 0);
              let pImage = item.image ? (typeof item.image === "string" ? item.image : item.image[0] || "") : "";
              if (pImage && pImage.startsWith("/")) pImage = `${origin}${pImage}`;

              harvestedProducts.push({
                id: pId,
                title: pTitle,
                handle: pTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                body_html: item.description || "",
                vendor: item.brand?.name || item.brand || cleanDomain,
                product_type: item.category || "General",
                images: pImage ? [{ id: 1, src: pImage }] : [],
                variants: [
                  {
                    id: 1,
                    title: "Default",
                    price: pPrice,
                    sku: item.sku || `SKU-${pId}`,
                    available: true,
                    inventory_quantity: 50,
                  },
                ],
              });
            }
          }
        } catch {
          // Skip invalid JSON-LD block
        }
      }
    } catch {
      // JSON-LD scan failed
    }

    // B. Check Next.js / Modern JS Chunks for Product Catalogs or Connected Supabase Databases
    if (harvestedProducts.length === 0) {
      try {
        const chunkMatches = [...html.matchAll(/src=["'](\/_next\/static\/chunks\/[^"']+)["']/g)].map(
          (m) => m[1]
        );

        let foundSupabaseUrl: string | null = null;
        let foundSupabaseKey: string | null = null;
        const loadedChunks: { path: string; code: string }[] = [];

        for (const chunkPath of chunkMatches) {
          try {
            const chunkRes = await fetch(`${origin}${chunkPath}`, {
              headers: { "User-Agent": "NESale-Catalog-Ingest/1.0" },
            });
            const code = await chunkRes.text();
            loadedChunks.push({ path: chunkPath, code });

            if (!foundSupabaseUrl) {
              const urlMatch = code.match(/https:\/\/[a-z0-9\-]+\.supabase\.co/);
              if (urlMatch) foundSupabaseUrl = urlMatch[0];
            }
            if (!foundSupabaseKey) {
              const keyMatch = code.match(/eyJ[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]{20,}\.[a-zA-Z0-9_\-]+/);
              if (keyMatch) foundSupabaseKey = keyMatch[0];
            }
          } catch {
            // Ignore single chunk failure
          }
        }

        // B.1 If website uses Supabase, query its public REST API to fetch complete live catalog
        if (foundSupabaseUrl && foundSupabaseKey) {
          const tableCandidates = ["Product", "products", "items", "catalog"];
          for (const tbl of tableCandidates) {
            try {
              const supaRes = await fetch(`${foundSupabaseUrl}/rest/v1/${tbl}?select=*&limit=500`, {
                headers: {
                  apikey: foundSupabaseKey,
                  Authorization: `Bearer ${foundSupabaseKey}`,
                },
              });
              if (supaRes.ok) {
                const rows = await supaRes.json();
                if (Array.isArray(rows) && rows.length > 0) {
                  for (const row of rows) {
                    const pId = row.id || row.slug || `prod-${harvestedProducts.length + 1}`;
                    const pTitle = row.name || row.title || "Product";
                    let pImage = row.image || (Array.isArray(row.images) ? row.images[0] : "");
                    if (pImage && pImage.startsWith("/")) pImage = `${origin}${pImage}`;
                    const pPrice = String(row.price || row.priceMin || 0);
                    const pStock = Number(row.stockCount ?? row.stock ?? 50);

                    if (!harvestedProducts.some((p) => p.title === pTitle)) {
                      harvestedProducts.push({
                        id: String(pId),
                        title: pTitle,
                        handle: pTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                        body_html: row.description || "",
                        vendor: row.brand || cleanDomain,
                        product_type: row.category || "General",
                        images: pImage ? [{ id: 1, src: pImage }] : [],
                        variants: [
                          {
                            id: 1,
                            title: "Default",
                            price: pPrice,
                            sku: `SKU-${pId}`,
                            available: row.inStock !== false && pStock > 0,
                            inventory_quantity: pStock,
                          },
                        ],
                      });
                    }
                  }
                  break; // Found products table
                }
              }
            } catch {
              // Try next table
            }
          }
        }

        // B.2 Fallback: Regex scan across loaded chunks
        if (harvestedProducts.length === 0) {
          for (const { code } of loadedChunks) {
            // Match objects with id, name, category, price, image, description
            const productRegex =
              /\{id:["']?([^,"'}]+)["']?,name:["']?([^"']+)["']?,category:["']?([^"']+)["']?,price:([0-9.]+)(?:,originalPrice:([0-9.]+))?[^}]*?image:["']?([^"']+)["']?[^}]*?description:["']?([^"']+)["']?/g;
            let pMatch;

            while ((pMatch = productRegex.exec(code)) !== null) {
              const pId = pMatch[1];
              const pName = pMatch[2];
              const pCategory = pMatch[3];
              const pPrice = pMatch[4];
              let pImage = pMatch[6];
              if (pImage && pImage.startsWith("/")) pImage = `${origin}${pImage}`;
              const pDesc = pMatch[7];

              if (!harvestedProducts.some((p) => p.title === pName)) {
                harvestedProducts.push({
                  id: pId,
                  title: pName,
                  handle: pName.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                  body_html: pDesc,
                  vendor: cleanDomain,
                  product_type: pCategory,
                  images: pImage ? [{ id: 1, src: pImage }] : [],
                  variants: [
                    {
                      id: 1,
                      title: "Default",
                      price: pPrice,
                      sku: `SKU-${pId}`,
                      available: true,
                      inventory_quantity: 50,
                    },
                  ],
                });
              }
            }
          }
        }
      } catch {
        // Chunk search failed
      }
    }

    if (harvestedProducts.length === 0) {
      throw new Error(
        `Could not find an open public catalog at ${cleanDomain}. Add the 1-line script to your site's header to auto-detect and harvest products.`
      );
    }

    return { products: harvestedProducts, storeName };
  }

  /**
   * Ingests and saves products into the PostgreSQL database for the business tenant
   */
  public static async syncProductsToDatabase(
    businessId: string,
    products: ShopifyPublicProduct[],
    websiteUrl?: string,
    storeName?: string
  ) {
    let importedCount = 0;

    // Update business domain and store name if provided
    if (websiteUrl || storeName) {
      await prisma.business.update({
        where: { id: businessId },
        data: {
          ...(websiteUrl ? { websiteUrl } : {}),
          ...(storeName ? { name: storeName } : {}),
        },
      }).catch((err) => console.warn("Business update warning:", err));
    }

    // Purge any legacy dummy/seed products that have no externalId or belong to mock seed templates
    await prisma.product.deleteMany({
      where: {
        businessId,
        OR: [
          { externalId: null },
          { externalId: { startsWith: "seed-" } },
        ],
      },
    }).catch((err) => console.warn("Product seed purge notice:", err));

    for (const sp of products) {
      const primaryVariant = sp.variants[0];
      const priceNum = primaryVariant ? parseFloat(primaryVariant.price) : 0;
      const primaryImage = sp.images[0]?.src || null;

      // Clean HTML tags from description
      const plainDescription = sp.body_html
        ? sp.body_html.replace(/<[^>]*>?/gm, "").trim().slice(0, 1000)
        : undefined;

      const slug = sp.handle || sp.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const extId = String(sp.id);

      const createdProd = await prisma.product.upsert({
        where: {
          businessId_externalId: {
            businessId,
            externalId: extId,
          },
        },
        update: {
          name: sp.title,
          description: plainDescription,
          productType: sp.product_type || "General",
          priceMin: priceNum,
          priceMax: priceNum,
          imageUrl: primaryImage,
          status: "active",
          metadata: {
            sku: primaryVariant?.sku || `SKU-${extId}`,
            externalId: extId,
            handle: sp.handle,
            vendor: sp.vendor,
            variantsCount: sp.variants.length,
            available: primaryVariant?.available ?? true,
            stock: primaryVariant?.inventory_quantity ?? 50,
            aiRecs: 0,
            clicks: 0,
          },
        },
        create: {
          businessId,
          name: sp.title,
          slug: `${slug}-${businessId.slice(0, 8)}`,
          externalId: extId,
          description: plainDescription,
          productType: sp.product_type || "General",
          priceMin: priceNum,
          priceMax: priceNum,
          currency: "USD",
          imageUrl: primaryImage,
          status: "active",
          metadata: {
            sku: primaryVariant?.sku || `SKU-${extId}`,
            externalId: extId,
            handle: sp.handle,
            vendor: sp.vendor,
            variantsCount: sp.variants.length,
            available: primaryVariant?.available ?? true,
            stock: primaryVariant?.inventory_quantity ?? 50,
            aiRecs: 0,
            clicks: 0,
          },
        },
      });

      // Upsert Product Variant
      const existingVariant = await prisma.productVariant.findFirst({
        where: { businessId, productId: createdProd.id },
      });

      if (existingVariant) {
        await prisma.productVariant.update({
          where: { id: existingVariant.id },
          data: {
            name: primaryVariant?.title || "Default Variant",
            price: priceNum,
            sku: primaryVariant?.sku || `SKU-${extId}`,
            inventoryQuantity: primaryVariant?.inventory_quantity ?? 50,
            available: primaryVariant?.available ?? true,
          },
        });
      } else {
        await prisma.productVariant.create({
          data: {
            businessId,
            productId: createdProd.id,
            name: primaryVariant?.title || "Default Variant",
            price: priceNum,
            sku: primaryVariant?.sku || `SKU-${extId}`,
            inventoryQuantity: primaryVariant?.inventory_quantity ?? 50,
            available: primaryVariant?.available ?? true,
          },
        });
      }

      importedCount++;
    }

    return importedCount;
  }
}
