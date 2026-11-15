import { NextRequest, NextResponse } from "next/server";
import { AIEngine } from "@/lib/ai/engine";
import { getTenantCatalog, getTenantKnowledge } from "@/lib/db/queries";
import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { recordAiUsage } from "@/lib/ai/usage";
import { rateLimiter } from "@/lib/security/rateLimiter";
import { validateWidgetOrigin } from "@/lib/security/originCheck";
import type { Prisma } from "@/generated/prisma/client";

const MAX_MESSAGE_LENGTH = 4000;

export async function OPTIONS(req: NextRequest) {
  const cors = validateWidgetOrigin(req);
  return new NextResponse(null, { status: 204, headers: cors.headers });
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();
  const t0 = Date.now();
  let usageRecorded = false;

  try {
    const body = await req.json();
    const message = body.message;
    const businessIdParam =
      body.business_id || body.businessId || body.slug || body.business;
    const sessionId = body.session_id || body.sessionId;
    const visitorId = body.visitor_id || body.visitorId;
    const wantsStream = body.stream === true;

    const cors = validateWidgetOrigin(req);

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A 'message' string is required.",
            requestId,
          },
        },
        { status: 400, headers: cors.headers }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: `Message exceeds ${MAX_MESSAGE_LENGTH} character limit.`,
            requestId,
          },
        },
        { status: 400, headers: cors.headers }
      );
    }

    // Distributed Rate Limiting (Upstash Redis + in-memory fallback)
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimit = await rateLimiter.limitChat(`${businessIdParam || "default"}:${clientIp}`);

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many messages. Please wait a moment before sending another.",
            requestId,
          },
        },
        {
          status: 429,
          headers: {
            ...cors.headers,
            ...rateLimiter.formatHeaders(rateLimit),
          },
        }
      );
    }

    // 1. Resolve business
    let business = businessIdParam
      ? await prisma.business.findFirst({
          where: {
            OR: [
              { id: businessIdParam },
              { slug: businessIdParam },
            ],
          },
          include: { businessSettings: true },
        })
      : await prisma.business.findFirst({ include: { businessSettings: true } });

    if (!business) {
      await ensureSeedData();
      business = await prisma.business.findFirst({ include: { businessSettings: true } });
    }

    const currentBizId = business?.id || "biz_default";

    // 2. Fetch catalog & knowledge from database
    const [catalog, knowledge] = await Promise.all([
      getTenantCatalog(business?.id, business?.businessType),
      getTenantKnowledge(business?.id),
    ]);

    // 3. Build conversation history from existing messages
    let conversationHistory: { role: "user" | "assistant"; content: string }[] = [];
    if (sessionId) {
      try {
        const existing = await prisma.conversation.findFirst({
          where: { businessId: currentBizId, sessionId: sessionId },
          include: {
            messages: { orderBy: { createdAt: "asc" }, take: 12 },
          },
        });
        if (existing) {
          conversationHistory = existing.messages.map((m) => ({
            role: m.role as "user" | "assistant",
            content: m.content,
          }));
        }
      } catch {
        // Ignore history fetch errors, proceed without history
      }
    }

    // 4. Handle Streaming Response (Server-Sent Events)
    if (wantsStream) {
      const activeSessionId = sessionId || `sess_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      let accumulatedAnswer = "";
      let finalDoneData: any = null;
      let streamedProducts: any[] = [];
      let streamedActions: any[] = [];

      const stream = new ReadableStream({
        async start(controller) {
          const encoder = new TextEncoder();
          try {
            for await (const chunk of AIEngine.processMessageStream({
              message,
              businessName: business?.name || "Nordik Gear Co.",
              businessType: business?.businessType,
              businessSubtype: business?.businessSubtype,
              bookingUrl: business?.businessSettings?.bookingUrl,
              assistantName: "Sophia",
              businessId: currentBizId,
              catalog,
              knowledge,
              conversationHistory,
            })) {
              if (chunk.type === "meta") {
                streamedProducts = chunk.products || [];
                controller.enqueue(
                  encoder.encode(`event: meta\ndata: ${JSON.stringify({ ...chunk, session_id: activeSessionId })}\n\n`)
                );
              } else if (chunk.type === "token") {
                accumulatedAnswer += chunk.token;
                controller.enqueue(
                  encoder.encode(`event: token\ndata: ${JSON.stringify({ token: chunk.token })}\n\n`)
                );
              } else if (chunk.type === "done") {
                finalDoneData = chunk;
                streamedActions = chunk.actions || [];
                controller.enqueue(
                  encoder.encode(`event: done\ndata: ${JSON.stringify({ ...chunk, session_id: activeSessionId })}\n\n`)
                );
              }
            }
          } catch (err: any) {
            controller.enqueue(
              encoder.encode(`event: error\ndata: ${JSON.stringify({ message: err?.message || "Stream error" })}\n\n`)
            );
          } finally {
            controller.close();

            // Background persistence of conversation turn
            if (business && accumulatedAnswer) {
              persistConversationTurn({
                businessId: business.id,
                sessionId: activeSessionId,
                visitorId,
                userMessage: message,
                assistantAnswer: accumulatedAnswer,
                intent: finalDoneData?.intent || "general_question",
                products: streamedProducts,
                actions: streamedActions,
                needsHandoff: finalDoneData?.needsHandoff || false,
                model: finalDoneData?.model,
                usage: finalDoneData?.usage,
                latencyMs: Date.now() - t0,
                requestId,
              }).catch((e) => console.warn("[Widget Chat Stream] Persist error:", e));
            }
          }
        },
      });

      return new Response(stream, {
        headers: {
          "Content-Type": "text/event-stream; charset=utf-8",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
          ...cors.headers,
          ...rateLimiter.formatHeaders(rateLimit),
        },
      });
    }

    // 5. Standard JSON Pipeline (Non-streaming)
    let aiResponse;
    try {
      aiResponse = await AIEngine.processMessage({
        message,
        businessName: business?.name || "Nordik Gear Co.",
        businessType: business?.businessType,
        businessSubtype: business?.businessSubtype,
        bookingUrl: business?.businessSettings?.bookingUrl,
        assistantName: "Sophia",
        businessId: currentBizId,
        catalog,
        knowledge,
        conversationHistory,
      });
    } catch (aiErr) {
      console.error(`[Widget Chat] AI engine error [${requestId}]:`, aiErr);
      throw aiErr;
    }

    // Persist Conversation Turn
    let conversationId: string | null = null;
    if (business) {
      const persisted = await persistConversationTurn({
        businessId: business.id,
        sessionId,
        visitorId,
        userMessage: message,
        assistantAnswer: aiResponse.answer,
        intent: aiResponse.intent,
        products: aiResponse.products,
        actions: aiResponse.actions,
        needsHandoff: aiResponse.needsHandoff,
        model: aiResponse.metadata?.model,
        usage: aiResponse.metadata?.usage,
        latencyMs: aiResponse.metadata?.latencyMs ?? Date.now() - t0,
        requestId,
      });
      conversationId = persisted.conversationId;
      usageRecorded = persisted.usageRecorded;
    }

    const latencyMs = Date.now() - t0;
    return NextResponse.json(
      {
        session_id: sessionId || "sess_" + Date.now(),
        conversation_id: conversationId,
        message: {
          text: aiResponse.answer,
        },
        intent: aiResponse.intent,
        products: aiResponse.products,
        actions: aiResponse.actions,
        needs_handoff: aiResponse.needsHandoff,
        metadata: {
          model: aiResponse.metadata?.model ?? null,
          usage: aiResponse.metadata?.usage ?? null,
          latencyMs,
          fallbackUsed: aiResponse.metadata?.fallbackUsed ?? false,
          requestId,
        },
      },
      {
        headers: {
          ...cors.headers,
          ...rateLimiter.formatHeaders(rateLimit),
        },
      }
    );
  } catch (error: unknown) {
    const latencyMs = Date.now() - t0;
    console.error(`[Widget Chat] Request failed [${requestId}] after ${latencyMs}ms:`, error);

    let code = "INTERNAL_ERROR";
    let message = "AI chat generation failed. Please try again.";
    let statusCode = 500;

    if ((error as { code?: string }).code === "VALIDATION_ERROR") {
      code = (error as { code?: string }).code ?? "";
      message = (error as { message?: string }).message ?? "";
      statusCode = 400;
    } else if ((error as { code?: string }).code === "RATE_LIMIT_EXCEEDED") {
      code = (error as { code?: string }).code ?? "";
      message = (error as { message?: string }).message ?? "";
      statusCode = 429;
    }

    return NextResponse.json(
      {
        error: {
          code,
          message,
          requestId,
        },
      },
      { status: statusCode }
    );
  }
}

/**
 * Helper to record conversation, message, analytics, and usage records.
 */
async function persistConversationTurn(params: {
  businessId: string;
  sessionId?: string | null;
  visitorId?: string | null;
  userMessage: string;
  assistantAnswer: string;
  intent?: string;
  products?: any[];
  actions?: any[];
  needsHandoff?: boolean;
  model?: string | null;
  usage?: any;
  latencyMs: number;
  requestId: string;
}): Promise<{ conversationId: string | null; usageRecorded: boolean }> {
  let conversationId: string | null = null;
  let usageRecorded = false;

  try {
    let conversation = await prisma.conversation.findFirst({
      where: {
        businessId: params.businessId,
        sessionId: params.sessionId || undefined,
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          businessId: params.businessId,
          sessionId: params.sessionId || undefined,
          visitorId: params.visitorId || `visitor_${Math.random().toString(36).substring(2, 8)}`,
          channel: "widget",
          status: params.needsHandoff ? "handed_off" : "active",
          metadata: {
            initialQuery: params.userMessage,
            intent: params.intent,
            lastActiveAt: new Date().toISOString(),
            model: params.model ?? null,
          },
        },
      });
    } else {
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          status: params.needsHandoff ? "handed_off" : conversation.status,
          metadata: {
            ...((conversation.metadata as Record<string, unknown>) || {}),
            lastIntent: params.intent,
            lastActiveAt: new Date().toISOString(),
            model: params.model ?? null,
          },
        },
      });
    }

    conversationId = conversation.id;

    // Persist User Message
    await prisma.message.create({
      data: {
        businessId: params.businessId,
        conversationId: conversation.id,
        role: "user",
        content: params.userMessage,
      },
    });

    // Persist Assistant Response
    await prisma.message.create({
      data: {
        businessId: params.businessId,
        conversationId: conversation.id,
        role: "assistant",
        content: params.assistantAnswer,
        toolOutput: {
          intent: params.intent,
          products: params.products || [],
          actions: params.actions || [],
          needsHandoff: params.needsHandoff,
          model: params.model ?? null,
          usage: params.usage ?? null,
          latencyMs: params.latencyMs,
        } as unknown as Prisma.InputJsonValue,
      },
    });

    // Analytics event
    await prisma.analyticsEvent.create({
      data: {
        businessId: params.businessId,
        conversationId: conversation.id,
        eventType: "chat_message",
        metadata: {
          intent: params.intent,
          hasProducts: (params.products?.length || 0) > 0,
          model: params.model ?? null,
          latencyMs: params.latencyMs,
        },
      },
    });

    // Record token usage
    try {
      await recordAiUsage({
        businessId: params.businessId,
        conversationId,
        model: params.model ?? "deterministic-fallback",
        inputTokens: params.usage?.prompt_tokens,
        outputTokens: params.usage?.completion_tokens,
        totalTokens: params.usage?.total_tokens,
        durationMs: params.latencyMs,
        success: true,
        fallbackUsed: params.model === "deterministic-fallback",
        requestId: params.requestId,
      });
      usageRecorded = true;
    } catch (usageErr) {
      console.warn(`[Widget Chat] Usage recording failed [${params.requestId}]:`, usageErr);
    }
  } catch (dbErr) {
    console.warn(`[Widget Chat] Conversation turn persistence error [${params.requestId}]:`, dbErr);
  }

  return { conversationId, usageRecorded };
}
