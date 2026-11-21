import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { createClient } from "@/utils/supabase/server";
import {
  isServicesBusiness,
  normalizeBusinessType,
  normalizeServiceSubtype,
} from "@/lib/business/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      businessName,
      businessType = "ecommerce",
      businessSubtype,
      storeUrl,
      assistantName = "Sophia",
      primaryColor = "#4F46E5",
      widgetPosition = "bottom-right",
      welcomeMessage = "Hi there! I can help you find products, check sizing, or answer any questions.",
      leadCaptureEnabled = true,
      humanHandoffEnabled = true,
      bookingUrl,
      products = [],
    } = body;

    const normalizedType = normalizeBusinessType(businessType);
    const normalizedSubtype = isServicesBusiness(normalizedType)
      ? normalizeServiceSubtype(businessSubtype) || "other"
      : null;

    let currentBiz: any = null;

    // 1. Resolve authenticated user via Supabase session
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser?.email) {
      return NextResponse.json(
        { error: { message: "Authentication required to complete business onboarding." } },
        { status: 401 }
      );
    }

    let dbUser = await prisma.user.findFirst({
      where: { email: authUser.email.toLowerCase() },
      include: {
        memberships: {
          include: { business: true },
        },
      },
    });

    if (!dbUser) {
      dbUser = await prisma.user.create({
        data: {
          email: authUser.email.toLowerCase(),
          name: authUser.user_metadata?.full_name || authUser.email.split("@")[0],
        },
        include: {
          memberships: {
            include: { business: true },
          },
        },
      });
    }

    // 2. Check if user already owns or belongs to the specified business or any business
    if (businessId && businessId !== "biz_live") {
      const matched = dbUser.memberships?.find((m) => m.businessId === businessId);
      if (matched?.business) {
        currentBiz = matched.business;
      }
    }

    if (!currentBiz && dbUser.memberships && dbUser.memberships.length > 0) {
      currentBiz = dbUser.memberships[0].business;
    }

    // 3. If user has no business, create a dedicated new Business tenant for this merchant
    if (!currentBiz) {
      const storeName = businessName || "My Store";
      const baseSlug = storeName
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "-")
        .replace(/-+/g, "-");
      const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 7)}`;

      currentBiz = await prisma.business.create({
        data: {
          name: storeName,
          slug: uniqueSlug,
          businessType: normalizedType,
          businessSubtype: normalizedSubtype,
          websiteUrl: storeUrl || "https://example.com",
          description: "Autonomous AI sales-assisted storefront",
          members: {
            create: {
              userId: dbUser.id,
              role: "owner",
            },
          },
        },
      });
    }

    const currentBizId = currentBiz.id;

    // 4. Update Business metadata for this specific tenant
    await prisma.business.update({
      where: { id: currentBizId },
      data: {
        name: businessName || currentBiz.name,
        businessType: normalizedType,
        businessSubtype: normalizedSubtype,
        websiteUrl: storeUrl || currentBiz.websiteUrl,
      },
    });

    // 5. Upsert WidgetConfig
    await prisma.widgetConfig.upsert({
      where: { businessId: currentBizId },
      update: {
        assistantName: assistantName || "Sophia",
        primaryColor: primaryColor || "#4F46E5",
        position: widgetPosition || "bottom-right",
        welcomeMessage: welcomeMessage || "Hi there!",
      },
      create: {
        businessId: currentBizId,
        assistantName: assistantName || "Sophia",
        primaryColor: primaryColor || "#4F46E5",
        position: widgetPosition || "bottom-right",
        welcomeMessage: welcomeMessage || "Hi there!",
      },
    });

    // 6. Upsert BusinessSettings
    await prisma.businessSettings.upsert({
      where: { businessId: currentBizId },
      update: {
        leadCaptureEnabled: !!leadCaptureEnabled,
        humanHandoffEnabled: !!humanHandoffEnabled,
        bookingUrl: bookingUrl || null,
      },
      create: {
        businessId: currentBizId,
        leadCaptureEnabled: !!leadCaptureEnabled,
        humanHandoffEnabled: !!humanHandoffEnabled,
        bookingUrl: bookingUrl || null,
      },
    });

    // 7. Persist Extracted / Uploaded Products
    let persistedProductsCount = 0;
    if (Array.isArray(products) && products.length > 0) {
      for (const item of products) {
        if (!item?.name) continue;
        const priceNum =
          typeof item.price === "number"
            ? item.price
            : parseFloat(String(item.price).replace(/[^0-9.]/g, "")) || 49.99;

        const baseSlug = item.name
          .toLowerCase()
          .replace(/[^a-z0-9]/g, "-")
          .replace(/-+/g, "-")
          .substring(0, 40);
        const uniqueSlug = `${baseSlug}-${Math.random().toString(36).substring(2, 6)}`;

        const existing = await prisma.product.findFirst({
          where: {
            businessId: currentBizId,
            name: item.name,
          },
        });

        if (!existing) {
          const createdProduct = await prisma.product.create({
            data: {
              businessId: currentBizId,
              name: item.name,
              slug: uniqueSlug,
              description:
                item.description ||
                `Premium ${item.name} available at ${businessName || currentBiz.name}.`,
              priceMin: priceNum,
              priceMax: priceNum,
              currency: item.currency || "USD",
              status: item.inStock !== false ? "active" : "draft",
              url:
                item.url ||
                (storeUrl
                  ? `${storeUrl.replace(/\/$/, "")}/products/${baseSlug}`
                  : null),
              imageUrl:
                item.imageUrl ||
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=600&q=80",
              metadata: {
                source: "onboarding",
                importedAt: new Date().toISOString(),
              },
            },
          });

          // Create default product variant
          await prisma.productVariant.create({
            data: {
              businessId: currentBizId,
              productId: createdProduct.id,
              name: "Default",
              sku: `${baseSlug.substring(0, 8).toUpperCase()}-01`,
              price: priceNum,
              currency: item.currency || "USD",
              inventoryQuantity: 45,
              available: item.inStock !== false,
            },
          });

          persistedProductsCount++;
        }
      }
    }

    // 8. Persist services + default weekly schedule for service businesses
    let persistedServicesCount = 0;
    let schedulesCreated = 0;
    if (isServicesBusiness(normalizedType)) {
      const serviceItems = (Array.isArray(products) ? products : []).filter((item: any) => item?.name);
      const itemsToCreate = serviceItems.length
        ? serviceItems
        : [
            {
              name: `${businessName || currentBiz.name} Consultation`,
              description: `Book a consultation with ${businessName || currentBiz.name}.`,
              price: 0,
              durationMinutes: 30,
            },
          ];

      for (const item of itemsToCreate) {
        const existing = await prisma.service.findFirst({
          where: { businessId: currentBizId, name: item.name },
        });
        if (existing) continue;

        const priceNum =
          item.price === 0
            ? 0
            : typeof item.price === "number"
              ? item.price
              : parseFloat(String(item.price).replace(/[^0-9.]/g, "")) || 0;
        const duration = Number(item.durationMinutes);

        await prisma.service.create({
          data: {
            businessId: currentBizId,
            name: item.name,
            description:
              item.description || `Book ${item.name} with ${businessName || currentBiz.name}.`,
            category: item.category || "Service",
            priceMin: priceNum,
            priceMax: priceNum,
            currency: item.currency || "USD",
            durationMinutes: Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 30,
            bookingUrl: item.bookingUrl || bookingUrl || null,
            status: item.inStock === false ? "draft" : "active",
            metadata: { source: "onboarding", importedAt: new Date().toISOString() },
          },
        });
        persistedServicesCount++;
      }

      const existingSchedules = await prisma.staffSchedule.count({
        where: { businessId: currentBizId },
      });
      if (existingSchedules === 0) {
        const weekdays = [1, 2, 3, 4, 5];
        await prisma.staffSchedule.createMany({
          data: weekdays.map((dayOfWeek) => ({
            businessId: currentBizId,
            staffId: null,
            dayOfWeek,
            startTime: "09:00",
            endTime: "17:00",
          })),
        });
        schedulesCreated = weekdays.length;
      }
    }

    return NextResponse.json({
      status: "success",
      businessId: currentBizId,
      businessType: normalizedType,
      businessSubtype: normalizedSubtype,
      persistedProductsCount,
      persistedServicesCount,
      schedulesCreated,
      message: "Onboarding completed successfully.",
    });
  } catch (error: any) {
    console.error("[Onboarding Complete API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to complete onboarding." } },
      { status: 500 }
    );
  }
}
