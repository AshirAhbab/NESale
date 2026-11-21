import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { resolveCachedTenant } from "@/lib/cache/tenantMemo";
import { validateWidgetOrigin } from "@/lib/security/originCheck";

export async function OPTIONS(req: NextRequest) {
  const cors = validateWidgetOrigin(req);
  return new NextResponse(null, { status: 204, headers: cors.headers });
}

export async function GET(req: NextRequest) {
  const baseCors = validateWidgetOrigin(req);
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    if (!businessId && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: { message: "A valid 'businessId' parameter is required." } },
        { status: 400, headers: baseCors.headers }
      );
    }

    let business = businessId
      ? await prisma.business.findUnique({ where: { id: businessId } })
      : process.env.NODE_ENV !== "production"
      ? await prisma.business.findFirst()
      : null;

    if (!business && process.env.NODE_ENV !== "production") {
      await ensureSeedData();
      business = await prisma.business.findFirst();
    }

    if (!business) {
      return NextResponse.json(
        { error: { message: "Store or business not found." } },
        { status: 404, headers: baseCors.headers }
      );
    }

    const cors = validateWidgetOrigin(req, business.websiteUrl);
    if (!cors.allowed && process.env.NODE_ENV === "production") {
      return NextResponse.json(
        { error: { message: `Cross-origin embedding is not authorized for origin '${cors.origin}'.` } },
        { status: 403, headers: cors.headers }
      );
    }

    let config = await prisma.widgetConfig.findUnique({
      where: { businessId: business.id },
    });

    if (!config) {
      config = await prisma.widgetConfig.create({
        data: {
          businessId: business.id,
          primaryColor: "#4F46E5",
          accentColor: "#10B981",
          position: "bottom-right",
          welcomeMessage:
            "Hi there! I'm your AI sales assistant. How can I help you find the perfect product today?",
          assistantName: "Sophia",
          showBranding: true,
        },
      });
    }

    return NextResponse.json(
      {
        status: "success",
        businessId: business.id,
        businessName: business.name,
        config: {
          primaryColor: config.primaryColor,
          accentColor: config.accentColor,
          position: config.position,
          welcomeMessage: config.welcomeMessage,
          assistantName: config.assistantName,
          showBranding: config.showBranding,
          customCss: config.customCss,
        },
      },
      {
        headers: {
          ...cors.headers,
          "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
        },
      }
    );
  } catch (error: any) {
    console.error("[Widget Config GET API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to fetch widget config" } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      primaryColor,
      accentColor,
      position,
      welcomeMessage,
      assistantName,
      showBranding,
    } = body;

    const tenant = await resolveCachedTenant(req, businessId);
    if (!tenant?.business?.id) {
      return NextResponse.json(
        { error: { message: "Unauthorized: Active merchant session required to update widget configuration." } },
        { status: 401 }
      );
    }

    const business = tenant.business;

    const updated = await prisma.widgetConfig.upsert({
      where: { businessId: business.id },
      update: {
        primaryColor: primaryColor || undefined,
        accentColor: accentColor || undefined,
        position: position || undefined,
        welcomeMessage: welcomeMessage || undefined,
        assistantName: assistantName || undefined,
        showBranding: showBranding !== undefined ? showBranding : undefined,
      },
      create: {
        businessId: business.id,
        primaryColor: primaryColor || "#4F46E5",
        accentColor: accentColor || "#10B981",
        position: position || "bottom-right",
        welcomeMessage:
          welcomeMessage ||
          "Hi there! I'm your AI sales assistant. How can I help you find the perfect product today?",
        assistantName: assistantName || "Sophia",
        showBranding: showBranding !== undefined ? showBranding : true,
      },
    });

    return NextResponse.json({
      status: "success",
      businessId: business.id,
      config: updated,
    });
  } catch (error: any) {
    console.error("[Widget Config POST API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to save widget config" } },
      { status: 500 }
    );
  }
}
