import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get("code");
  const shop = searchParams.get("shop");
  const state = searchParams.get("state");

  if (!code || !shop) {
    return NextResponse.redirect(
      new URL("/dashboard?error=shopify_auth_failed", req.url)
    );
  }

  // Redirect merchant back into dashboard with success notification
  return NextResponse.redirect(
    new URL(`/dashboard?connected_shop=${encodeURIComponent(shop)}&status=syncing`, req.url)
  );
}
