import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";

export async function POST(req: NextRequest) {
  // Never allow destructive store reset in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Store reset is disabled in production environments." },
      { status: 403 }
    );
  }

  try {
    const tenant = await resolveCachedTenant(req);
    if (!tenant?.business?.id) {
      return NextResponse.json(
        { error: "Unauthorized: Active merchant session required to reset store." },
        { status: 401 }
      );
    }

    const businessId = tenant.business.id;

    // Verify user is the business owner
    const membership = await prisma.businessMember.findFirst({
      where: {
        businessId,
        userId: tenant.user?.id,
        role: "owner",
      },
    });

    if (!membership && process.env.NODE_ENV !== "development") {
      return NextResponse.json(
        { error: "Forbidden: Only the business owner can reset store data." },
        { status: 403 }
      );
    }

    // Delete in relational order to respect foreign keys
    await prisma.analyticsEvent.deleteMany({ where: { businessId } });
    await prisma.message.deleteMany({
      where: { conversation: { businessId } },
    });
    await prisma.conversation.deleteMany({ where: { businessId } });
    await prisma.lead.deleteMany({ where: { businessId } });
    await prisma.knowledgeChunk.deleteMany({
      where: { source: { businessId } },
    });
    await prisma.knowledgeSource.deleteMany({ where: { businessId } });
    await prisma.productVariant.deleteMany({ where: { businessId } });
    await prisma.product.deleteMany({ where: { businessId } });
    await prisma.service.deleteMany({ where: { businessId } });

    // Reset business fields to pristine new account state
    await prisma.business.update({
      where: { id: businessId },
      data: {
        name: "My Store",
        websiteUrl: "",
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Store data successfully reset.",
      businessId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to reset store" },
      { status: 500 }
    );
  }
}
