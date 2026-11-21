import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { ApiCache } from "@/lib/cache/apiCache";
import { processJobs } from "@/lib/jobs/queue";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const requestId = crypto.randomUUID();
  const { jobId } = await context.params;
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  try {
    const tenant = await resolveCachedTenant(req, businessId ?? undefined);
    if (!tenant || !tenant.business) {
      return NextResponse.json(
        { error: { message: "Business not found or access denied." } },
        { status: 404 }
      );
    }

    const job = await prisma.job.findFirst({
      where: {
        id: jobId,
        businessId: tenant.business.id,
      },
    });

    if (!job) {
      return NextResponse.json(
        { error: { message: "Job not found or access denied." } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      status: "success",
      job: {
        id: job.id,
        type: job.type,
        status: job.status,
        progress: job.progress,
        maxProgress: job.maxProgress,
        error: job.error,
        result: job.result,
        createdAt: job.createdAt,
        startedAt: job.startedAt,
        completedAt: job.completedAt,
      },
    });
  } catch (error: unknown) {
    console.error(`[Job Status] Error [${requestId}]:`, error);
    return NextResponse.json(
      { error: { message: "Failed to fetch job status" } },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ jobId: string }> }
) {
  const requestId = crypto.randomUUID();
  await context.params;
  const { searchParams } = new URL(req.url);
  const businessId = searchParams.get("businessId");

  try {
    const tenant = await resolveCachedTenant(req, businessId ?? undefined);
    if (!tenant || !tenant.business) {
      return NextResponse.json(
        { error: { message: "Access denied." } },
        { status: 403 }
      );
    }

    const result = await processJobs();

    if (businessId) {
      ApiCache.invalidate(`jobs:${businessId}`);
    }

    return NextResponse.json({
      status: "success",
      requestId,
      processed: result.processed,
      failed: result.failed,
    });
  } catch (error: unknown) {
    console.error(`[Job Process] Error [${requestId}]:`, error);
    return NextResponse.json(
      { error: { message: "Failed to process jobs" } },
      { status: 500 }
    );
  }
}
