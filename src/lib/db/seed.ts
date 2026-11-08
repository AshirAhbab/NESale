import { prisma } from "./prisma";

export async function ensureSeedData(businessId?: string) {
  try {
    // 1. Check or create default business container if none exists
    let business = businessId
      ? await prisma.business.findUnique({ where: { id: businessId } })
      : await prisma.business.findFirst();

    if (!business) {
      business = await prisma.business.create({
        data: {
          name: "My Store",
          slug: "my-store",
          businessType: "ecommerce",
          websiteUrl: "",
          description: "New store workspace.",
        },
      });
    }

    return business;
  } catch (err) {
    console.warn("[ensureSeedData] Handled warning:", err);
  }
}
