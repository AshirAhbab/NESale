import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ApiCache } from "@/lib/cache/apiCache";
import { ensureSeedData } from "@/lib/db/seed";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      eventType,
      entityType,
      entityId,
      valueNumeric,
      conversationId,
      businessId,
      metadata = {},
    } = body;

    if (!eventType) {
      return NextResponse.json(
        { error: { message: "eventType is required." } },
        { status: 400 }
      );
    }

    // Resolve tenant business
    let currentBizId = businessId;
    if (!currentBizId) {
      const biz = await prisma.business.findFirst();
      if (!biz) {
        await ensureSeedData();
        const fallbackBiz = await prisma.business.findFirst();
        currentBizId = fallbackBiz?.id;
      } else {
        currentBizId = biz.id;
      }
    }

    if (!currentBizId) {
      return NextResponse.json(
        { error: { message: "Business tenant could not be resolved." } },
        { status: 404 }
      );
    }

    const event = await prisma.analyticsEvent.create({
      data: {
        businessId: currentBizId,
        eventType,
        entityType: entityType || null,
        entityId: entityId ? String(entityId) : null,
        valueNumeric: valueNumeric !== undefined && valueNumeric !== null ? Number(valueNumeric) : null,
        conversationId: conversationId || null,
        metadata,
      },
    });

    // Targeted invalidation on high-value revenue events
    if (eventType === "order_completed" || eventType === "purchase") {
      ApiCache.invalidate(`overview:${currentBizId}`);
      ApiCache.invalidate(`analytics:${currentBizId}`);
    }

    return NextResponse.json({
      status: "success",
      event: {
        id: event.id,
        eventType: event.eventType,
        createdAt: event.createdAt,
      },
    });
  } catch (error: any) {
    console.error("[Analytics Event API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to log event." } },
      { status: 500 }
    );
  }
}
