import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  try {
    const biz = await prisma.business.findFirst();
    if (!biz) {
      return NextResponse.json({ error: "No business found" }, { status: 404 });
    }

    const businessId = biz.id;

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
        slug: "my-store",
      },
    });

    return NextResponse.json({
      status: "success",
      message: "Store reset to brand new clean state.",
      businessId,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to reset store" },
      { status: 500 }
    );
  }
}
