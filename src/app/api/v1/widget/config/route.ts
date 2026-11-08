import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    let business = businessId
      ? await prisma.business.findUnique({ where: { id: businessId } })
      : await prisma.business.findFirst();

    if (!business) {
      await ensureSeedData();
      business = await prisma.business.findFirst();
    }

    if (!business) {
      return NextResponse.json(
        { error: { message: "No business found." } },
        { status: 404 }
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

    return NextResponse.json({
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
    });
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

    let business = businessId
      ? await prisma.business.findUnique({ where: { id: businessId } })
      : await prisma.business.findFirst();

    if (!business) {
      await ensureSeedData();
      business = await prisma.business.findFirst();
    }

    if (!business) {
      return NextResponse.json(
        { error: { message: "No business found to update config." } },
        { status: 404 }
      );
    }

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
