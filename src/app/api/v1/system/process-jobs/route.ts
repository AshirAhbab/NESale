import { NextRequest, NextResponse } from "next/server";
import { processJobs } from "@/lib/jobs/queue";
import { ApiCache } from "@/lib/cache/apiCache";

const CRON_SECRET = process.env.CRON_SECRET || "";

/**
 * POST /api/v1/system/process-jobs
 *
 * Processes pending background jobs one at a time.
 * Intended to be invoked by a cron service (e.g. Supabase pg_cron calling
 * this HTTP endpoint, or an external scheduler) to keep the knowledge
 * ingestion pipeline moving.
 *
 * Protection: requires CRON_SECRET header when CRON_SECRET is set.
 */
export async function POST(req: NextRequest) {
  // Authorization: cron secret check
  if (CRON_SECRET) {
    const secret = req.headers.get("x-cron-secret");
    if (!secret || secret !== CRON_SECRET) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid or missing cron secret." } },
        { status: 401 }
      );
    }
  }

  const results: Array<{ processed: number; failed: number }> = [];
  let totalProcessed = 0;
  let totalFailed = 0;
  let maxIterations = 20; // Safety cap to avoid long-running requests
  let iteration = 0;

  // Process jobs in a loop until no more pending jobs or cap reached
  while (iteration < maxIterations) {
    iteration++;
    const result = await processJobs();
    results.push(result);
    totalProcessed += result.processed;
    totalFailed += result.failed;

    if (result.processed === 0 && result.failed === 0) {
      break; // No more pending jobs
    }

    // Invalidate job list caches for affected businesses
    // (processJobs already invalidates per-job; we do a broad sweep here)
    ApiCache.invalidate("jobs:");
  }

  return NextResponse.json({
    status: "success",
    message: `Processed ${totalProcessed} job(s), ${totalFailed} failed.`,
    iterations: iteration,
    totalProcessed,
    totalFailed,
    details: results,
  });
}

export async function GET() {
  return NextResponse.json({
    status: "ok",
    endpoint: "POST /api/v1/system/process-jobs",
    description: "Process pending background jobs. Call via cron with x-cron-secret header.",
    cronExample: `*/5 * * * * curl -X POST https://your-app.vercel.app/api/v1/system/process-jobs -H "x-cron-secret: your-secret"`,
  });
}
