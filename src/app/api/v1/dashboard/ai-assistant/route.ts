import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    let biz = businessId ? await prisma.business.findUnique({ where: { id: businessId } }) : null;
    if (!biz) {
      biz = await prisma.business.findFirst();
    }

    if (!biz) {
      return NextResponse.json({ error: { message: "No business found." } }, { status: 404 });
    }

    const currentBizId = biz.id;

    const [settingsRecord, widgetConfig] = await Promise.all([
      prisma.businessSettings.findUnique({
        where: { businessId: currentBizId },
      }),
      prisma.widgetConfig.findUnique({
        where: { businessId: currentBizId },
      }),
    ]);

    const customSettings = (settingsRecord?.settings as Record<string, any>) || {};

    const responseData = {
      status: "success",
      businessId: currentBizId,
      businessName: biz.name || "your store",
      assistantName: widgetConfig?.assistantName || "Sophia",
      assistantSubtitle: customSettings.assistantSubtitle || "Your AI shopping assistant",
      archetype: customSettings.archetype || "Friendly",
      toneModifiers: customSettings.toneModifiers || ["Helpful", "Concise", "Conversational"],
      catalogLanguage: customSettings.catalogLanguage || "English (US)",
      autoDetectLanguage: customSettings.autoDetectLanguage ?? true,
      salesGoals: customSettings.salesGoals || {
        productDiscovery: true,
        increaseCart: true,
        maximizeAov: true,
        reduceSupport: true,
      },
      recommendationsEnabled: customSettings.recommendationsEnabled ?? true,
      rankingStrategy: customSettings.rankingStrategy || "Best Match",
      maxProducts: customSettings.maxProducts || 3,
      discountThreshold: customSettings.discountThreshold || "10%",
      objectionHandling: customSettings.objectionHandling || "Consultative & Value-Focused",
      capabilities: customSettings.capabilities || {
        productComparison: true,
        alternativeSuggestions: true,
        oneClickAddToCart: true,
        liveInventorySync: true,
        variantSizeGuidance: true,
        orderTracking: false,
        humanSupportHandoff: settingsRecord?.humanHandoffEnabled ?? true,
      },
      aiInstructions: settingsRecord?.aiInstructions || "",
    };

    return NextResponse.json(responseData);
  } catch (error: any) {
    console.error("[AI Assistant API] GET Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to load assistant settings." } },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      businessId,
      assistantName,
      assistantSubtitle,
      archetype,
      toneModifiers,
      catalogLanguage,
      autoDetectLanguage,
      salesGoals,
      recommendationsEnabled,
      rankingStrategy,
      maxProducts,
      discountThreshold,
      objectionHandling,
      capabilities,
      aiInstructions,
    } = body;

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
      return NextResponse.json({ error: { message: "Business not found." } }, { status: 404 });
    }

    const customSettings = {
      assistantSubtitle,
      archetype,
      toneModifiers,
      catalogLanguage,
      autoDetectLanguage,
      salesGoals,
      recommendationsEnabled,
      rankingStrategy,
      maxProducts,
      discountThreshold,
      objectionHandling,
      capabilities,
    };

    // 1. Upsert BusinessSettings
    await prisma.businessSettings.upsert({
      where: { businessId: currentBizId },
      update: {
        aiInstructions: aiInstructions || null,
        humanHandoffEnabled: capabilities?.humanSupportHandoff ?? true,
        settings: customSettings,
      },
      create: {
        businessId: currentBizId,
        aiInstructions: aiInstructions || null,
        humanHandoffEnabled: capabilities?.humanSupportHandoff ?? true,
        settings: customSettings,
      },
    });

    // 2. Update assistantName in WidgetConfig if specified
    if (assistantName) {
      await prisma.widgetConfig.upsert({
        where: { businessId: currentBizId },
        update: { assistantName },
        create: {
          businessId: currentBizId,
          assistantName,
        },
      });
    }

    return NextResponse.json({
      status: "success",
      message: "AI persona and behavior settings updated successfully.",
    });
  } catch (error: any) {
    console.error("[AI Assistant API] POST Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to update assistant settings." } },
      { status: 500 }
    );
  }
}
