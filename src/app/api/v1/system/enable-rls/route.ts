import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

const CRON_SECRET = process.env.CRON_SECRET || process.env.ADMIN_SECRET_KEY || "";

function isAuthorized(req: NextRequest): boolean {
  if (!CRON_SECRET) {
    return process.env.NODE_ENV !== "production";
  }
  const secret = req.headers.get("x-system-secret") || req.headers.get("x-cron-secret");
  return secret === CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized: Missing system credentials." }, { status: 401 });
  }

  try {
    const status: Array<{ tablename: string; rowsecurity: boolean }> = await prisma.$queryRawUnsafe(`
      SELECT tablename, rowsecurity 
      FROM pg_tables 
      WHERE schemaname = 'public' 
        AND tablename NOT LIKE '_prisma_%';
    `);
    return NextResponse.json({ status });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "Unauthorized: Missing system credentials." }, { status: 401 });
  }

  try {
    // 1. Get all base tables in the public schema
    const tables: Array<{ table_name: string }> = await prisma.$queryRawUnsafe(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE '_prisma_%';
    `);

    const enabledTables: string[] = [];

    // 2. Enable RLS on every table
    for (const t of tables) {
      await prisma.$executeRawUnsafe(`ALTER TABLE "public"."${t.table_name}" ENABLE ROW LEVEL SECURITY;`);
      enabledTables.push(t.table_name);
    }

    return NextResponse.json({
      status: "success",
      message: `Row Level Security (RLS) successfully enabled on ${enabledTables.length} tables.`,
      tables: enabledTables,
    });
  } catch (error: any) {
    console.error("[Enable RLS] Error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to enable RLS" },
      { status: 500 }
    );
  }
}
