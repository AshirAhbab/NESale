import { NextRequest, NextResponse } from "next/server";
import { AIEngine } from "@/lib/ai/engine";
import { getTenantCatalog, getTenantKnowledge } from "@/lib/db/queries";
import { prisma } from "@/lib/db/prisma";
import { ensureSeedData } from "@/lib/db/seed";
import { ApiCache } from "@/lib/cache/apiCache";
import { recordAiUsage } from "@/lib/ai/usage";
import type { Prisma } from "@/generated/prisma/client";
const MAX_MESSAGE_LENGTH = 4000;
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_REQUESTS = 30;

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

    if (!message || typeof message !== "string") {
      return NextResponse.json(
        {
          error: {
            code: "VALIDATION_ERROR",
            message: "A 'message' string is required.",
            requestId,
          },
        },
        { status: 400 }
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
        { status: 400 }
      );
    }

    // Per-business rate limiting
    const rateLimitKey = `ratelimit:widget-chat:${businessIdParam || "default"}`;
    const { allowed, resetAt } = ApiCache.incrementCounter(
      rateLimitKey,
      RATE_LIMIT_WINDOW_MS,
      RATE_LIMIT_MAX_REQUESTS
    );

    if (!allowed) {
      return NextResponse.json(
        {
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many requests. Please try again shortly.",
            requestId,
            retryAfterMs: Math.max(0, resetAt - Date.now()),
          },
        },
        { status: 429 }
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

    // 4. Process with AI Engine (OpenRouter)
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

    // 5. Persist Conversation & Messages to Supabase PostgreSQL
    let conversationId: string | null = null;
    if (business) {
      try {
        let conversation = await prisma.conversation.findFirst({
          where: {
            businessId: business.id,
            sessionId: sessionId,
          },
        });

        if (!conversation) {
          conversation = await prisma.conversation.create({
            data: {
              businessId: business.id,
              sessionId: sessionId,
              visitorId: visitorId || `visitor_${Math.random().toString(36).substring(2, 8)}`,
              channel: "widget",
              status: aiResponse.needsHandoff ? "handed_off" : "active",
              metadata: {
                initialQuery: message,
                intent: aiResponse.intent,
                lastActiveAt: new Date().toISOString(),
                model: aiResponse.metadata?.model ?? null,
              },
            },
          });
        } else {
          await prisma.conversation.update({
            where: { id: conversation.id },
            data: {
              status: aiResponse.needsHandoff ? "handed_off" : conversation.status,
              metadata: {
                ...((conversation.metadata as Record<string, unknown>) || {}),
                lastIntent: aiResponse.intent,
                lastActiveAt: new Date().toISOString(),
                model: aiResponse.metadata?.model ?? null,
              },
            },
          });
        }

        conversationId = conversation.id;

        // Persist User Message
        await prisma.message.create({
          data: {
            businessId: business.id,
            conversationId: conversation.id,
            role: "user",
            content: message,
          },
        });

        // Persist Assistant Response
        await prisma.message.create({
          data: {
            businessId: business.id,
            conversationId: conversation.id,
            role: "assistant",
            content: aiResponse.answer,
            toolOutput: {
              intent: aiResponse.intent,
              products: aiResponse.products || [],
              actions: aiResponse.actions || [],
              citations: aiResponse.citations || [],
              needsHandoff: aiResponse.needsHandoff,
              model: aiResponse.metadata?.model ?? null,
              usage: aiResponse.metadata?.usage ?? null,
              latencyMs: aiResponse.metadata?.latencyMs ?? null,
            } as unknown as Prisma.InputJsonValue,
          },
        });

        // Log analytics event for conversation turn
        await prisma.analyticsEvent.create({
          data: {
            businessId: business.id,
            conversationId: conversation.id,
            eventType: "chat_message",
            metadata: {
              intent: aiResponse.intent,
              hasProducts: (aiResponse.products?.length || 0) > 0,
              model: aiResponse.metadata?.model ?? null,
              fallbackUsed: aiResponse.metadata?.fallbackUsed ?? false,
              latencyMs: aiResponse.metadata?.latencyMs ?? null,
            },
          },
        });

        // Record usage
        try {
          await recordAiUsage({
            businessId: currentBizId,
            conversationId,
            model: aiResponse.metadata?.model ?? "deterministic-fallback",
            inputTokens: aiResponse.metadata?.usage?.prompt_tokens,
            outputTokens: aiResponse.metadata?.usage?.completion_tokens,
            totalTokens: aiResponse.metadata?.usage?.total_tokens,
            durationMs: aiResponse.metadata?.latencyMs ?? Date.now() - t0,
            success: true,
            fallbackUsed: aiResponse.metadata?.fallbackUsed ?? false,
            requestId,
          });
          usageRecorded = true;
        } catch (usageErr) {
          console.warn(`[Widget Chat] Usage recording failed [${requestId}]:`, usageErr);
        }
      } catch (dbErr) {
        console.warn(`[Widget Chat] Database conversation logging failed [${requestId}]:`, dbErr);
      }
    }

    const latencyMs = Date.now() - t0;
    console.log(
      `[Widget Chat] Request completed [${requestId}] biz=${currentBizId} model=${aiResponse.metadata?.model ?? "fallback"} latency=${latencyMs}ms`
    );

    return NextResponse.json({
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
    });
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
    } else if ((error as { name?: string }).name === "OpenRouterAuthError") {
      code = "AI_PROVIDER_AUTH_ERROR";
      message = "AI service is temporarily unavailable. Please try again later.";
      statusCode = 503;
    } else if ((error as { name?: string }).name === "OpenRouterRateLimitError") {
      code = "AI_PROVIDER_RATE_LIMIT";
      message = "AI service is busy. Please try again shortly.";
      statusCode = 503;
    } else if ((error as { name?: string }).name === "OpenRouterTimeoutError") {
      code = "AI_PROVIDER_TIMEOUT";
      message = "AI service timed out. Please try again.";
      statusCode = 504;
    } else if ((error as { name?: string }).name === "OpenRouterNoFreeModelError") {
      code = "AI_PROVIDER_NO_MODEL";
      message = "No AI model is currently available. Please try again later.";
      statusCode = 503;
    }

    // Record failed usage if we have a business context
    try {
      const parsedBody = await req.json().catch(() => ({}));
      const businessId = (parsedBody as { business_id?: string }).business_id;
      if (businessId && !usageRecorded) {
        await recordAiUsage({
          businessId,
          model: "unknown",
          durationMs: latencyMs,
          success: false,
          fallbackUsed: false,
          requestId,
          errorCode: code,
        });
      }
    } catch {
      // Best effort only
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
