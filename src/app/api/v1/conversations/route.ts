import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const businessId = searchParams.get("businessId");

    const whereBiz = businessId ? { businessId } : {};

    const dbConversations = await prisma.conversation.findMany({
      where: whereBiz,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
        leads: {
          take: 1,
        },
      },
      orderBy: { startedAt: "desc" },
      take: 50,
    });

    if (dbConversations.length > 0) {
      const formatted = dbConversations.map((c) => {
        const meta = (c.metadata as Record<string, any>) || {};
        const lastMsg = c.messages[c.messages.length - 1];
        const lead = c.leads[0];

        // Format outcome
        let outcome = "💬 Active Conversation";
        let outcomeType: "cart" | "lead" | "handoff" | "view" = "view";

        if (c.status === "handed_off") {
          outcome = "👤 Handoff to Human Agent";
          outcomeType = "handoff";
        } else if (lead) {
          outcome = "👤 Lead Captured";
          outcomeType = "lead";
        } else if (meta.lastIntent === "cart_request" || meta.lastIntent === "checkout_request") {
          outcome = "🛒 Converted (Cart Activity)";
          outcomeType = "cart";
        } else if (meta.lastIntent === "product_discovery") {
          outcome = "✨ Product Recommended";
          outcomeType = "view";
        }

        const timeDiffMinutes = Math.floor((Date.now() - new Date(c.startedAt).getTime()) / 60000);
        let timeStr = `${timeDiffMinutes}m ago`;
        if (timeDiffMinutes >= 60) {
          timeStr = `${Math.floor(timeDiffMinutes / 60)}h ago`;
        }

        return {
          id: c.id,
          visitor: `Shopper #${c.id.slice(0, 4)} (${c.channel || "Web Widget"})`,
          lastMessage: lastMsg?.content || "Conversation started",
          time: timeStr,
          intent: meta.lastIntent || meta.intent || "general_question",
          outcome,
          outcomeType,
          leadCaptured: lead
            ? {
                name: lead.name || "Shopper",
                email: lead.email || "",
                phone: lead.phone || undefined,
              }
            : undefined,
          messages: c.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            text: m.content,
            time: new Date(m.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
          })),
        };
      });

      return NextResponse.json({
        status: "success",
        total: formatted.length,
        conversations: formatted,
      });
    }

    return NextResponse.json({
      status: "success",
      total: 0,
      conversations: [],
    });
  } catch (error: any) {
    console.error("[Conversations API] Error:", error);
    return NextResponse.json(
      { error: { message: error?.message || "Failed to fetch conversations" } },
      { status: 500 }
    );
  }
}
