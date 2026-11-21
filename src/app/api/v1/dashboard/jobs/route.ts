import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");
  const limit = Number(searchParams.get("limit") || "50");

  try {
    const tenant = await resolveCachedTenant(req, businessId ?? undefined);
    if (!tenant || !tenant.business) {
      return NextResponse.json(
        { error: { message: "Business not found or access denied." } },
        { status: 404 }
      );
    }

    const currentBizId = tenant.business.id;

    const jobs = await prisma.job.findMany({
      where: { businessId: currentBizId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    return NextResponse.json({
      status: "success",
      jobs: jobs.map((j) => ({
        id: j.id,
        type: j.type,
        status: j.status,
        progress: j.progress,
        maxProgress: j.maxProgress,
        error: j.error,
        result: j.result,
        createdAt: j.createdAt,
        startedAt: j.startedAt,
        completedAt: j.completedAt,
      })),
    });
  } catch (error: unknown) {
    console.error("[Jobs List] Error:", error);
    return NextResponse.json(
      { error: { message: "Failed to fetch jobs" } },
      { status: 500 }
    );
  }
}
