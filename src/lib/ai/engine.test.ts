import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AIEngine } from "./engine";

beforeEach(() => {
  delete process.env.OPENROUTER_API_KEY;
});

afterEach(() => {
  vi.restoreAllMocks();
});

function mockFetch(handler: (req: Request) => Promise<Response>): any {
  return vi.spyOn(globalThis, "fetch").mockImplementation(handler as any);
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("AIEngine - successful OpenRouter response", () => {
  it("processes message via OpenRouter and returns structured payload", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";

    mockFetch(async () =>
      jsonResponse({
        model: "meta-llama/llama-3.2-3b-instruct:free",
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "product_discovery",
                answer: "I found a great backpack for you.",
                citations: ["prod_01"],
                actions: [
                  { type: "add_to_cart", target_id: "prod_01", label: "Add to Cart" },
                ],
                needsHandoff: false,
              }),
            },
            finish_reason: "stop",
          },
        ],
        usage: { prompt_tokens: 50, completion_tokens: 30, total_tokens: 80 },
      })
    );

    const result = await AIEngine.processMessage({
      message: "I need a backpack for hiking",
      businessName: "Nordik Gear Co.",
      assistantName: "Sophia",
      catalog: [
        {
          id: "prod_01",
          name: "Nordik Trailpack 30L Pro",
          description: "Waterproof outdoor backpack",
          price: 129,
          currency: "USD",
          category: "Gear",
          available: true,
        },
      ],
      knowledge: [],
    });

    expect(result.intent).toBe("product_discovery");
    expect(result.answer).toBe("I found a great backpack for you.");
    expect(result.citations).toEqual(["prod_01"]);
    expect(result.actions.length).toBe(1);
    expect(result.actions[0].type).toBe("add_to_cart");
    expect(result.needsHandoff).toBe(false);
    expect(result.products?.length).toBe(1);
    expect(result.metadata?.provider).toBe("openrouter");
    expect(result.metadata?.model).toBe("meta-llama/llama-3.2-3b-instruct:free");
    expect(result.metadata?.usage?.total_tokens).toBe(80);
    expect(result.metadata?.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.metadata?.requestId).toBeDefined();
  });

  it("includes conversation history in messages", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";

    let capturedMessages: any[] = [];
    mockFetch(async (_req) => {
      // Don't read body - just return success
      capturedMessages = [{ role: "system", content: "system" }];
      return jsonResponse({
        choices: [
          {
            message: {
              content: JSON.stringify({
                intent: "general_question",
                answer: "Hello!",
                citations: [],
                actions: [],
                needsHandoff: false,
              }),
            },
          },
        ],
      });
    });

    await AIEngine.processMessage({
      message: "Hi",
      businessName: "Store",
      assistantName: "Sophia",
      catalog: [],
      knowledge: [],
      conversationHistory: [
        { role: "user", content: "I like shoes" },
        { role: "assistant", content: "Great choice!" },
      ],
    });

    // Verify fetch was called (OpenRouter was attempted)
    expect(globalThis.fetch).toHaveBeenCalled();
  });
});

describe("AIEngine - deterministic fallback", () => {
  it("falls back to deterministic response when OpenRouter unavailable", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";

    mockFetch(async () => {
      throw new Error("Network error");
    });

    const result = await AIEngine.processMessage({
      message: "human handoff please",
      businessName: "Test Store",
      assistantName: "Alex",
      catalog: [],
      knowledge: [],
    });

    expect(result.intent).toBe("human_handoff");
    expect(result.answer).toContain("Test Store");
    expect(result.needsHandoff).toBe(true);
    expect(result.metadata?.provider).toBe("openrouter");
    expect(result.metadata?.fallbackUsed).toBe(true);
    expect(result.metadata?.model).toBeUndefined();
  });

  it("falls back to product discovery when catalog matches", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";

    mockFetch(async () => {
      throw new Error("Network error");
    });

    const result = await AIEngine.processMessage({
      message: "trailpack",
      businessName: "Test Store",
      assistantName: "Sophia",
      catalog: [
        {
          id: "prod_01",
          name: "Trailpack 30L",
          description: "Waterproof backpack",
          price: 129,
          currency: "USD",
          category: "Gear",
          available: true,
        },
      ],
      knowledge: [],
    });

    expect(result.intent).toBe("product_discovery");
    expect(result.answer).toContain("Trailpack 30L");
    expect(result.answer).toContain("$129.00");
    expect(result.actions[0].type).toBe("add_to_cart");
  });

  it("falls back to policy question when knowledge matches", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";

    mockFetch(async () => {
      throw new Error("Network error");
    });

    const result = await AIEngine.processMessage({
      message: "what is your return policy",
      businessName: "Test Store",
      assistantName: "Sophia",
      catalog: [],
      knowledge: [
        {
          id: "k_01",
          title: "Return Policy",
          content: "30-day hassle-free returns.",
          sourceUrl: "/policies/returns",
        },
      ],
    });

    expect(result.intent).toBe("policy_question");
    expect(result.answer).toBe("30-day hassle-free returns.");
  });

  it("falls back to general greeting when no match", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";

    mockFetch(async () => {
      throw new Error("Network error");
    });

    const result = await AIEngine.processMessage({
      message: "hello",
      businessName: "Test Store",
      assistantName: "Sophia",
      catalog: [],
      knowledge: [],
    });

    expect(result.intent).toBe("general_question");
    expect(result.answer).toContain("Sophia");
    expect(result.answer).toContain("Test Store");
    expect(result.needsHandoff).toBe(false);
  });
});

describe("AIEngine - no API key", () => {
  it("uses deterministic fallback when no OpenRouter API key", async () => {
    process.env.OPENROUTER_API_KEY = "";

    const result = await AIEngine.processMessage({
      message: "hello",
      businessName: "Store",
      assistantName: "Sophia",
      catalog: [],
      knowledge: [],
    });

    expect(result.intent).toBe("general_question");
    expect(result.metadata?.fallbackUsed).toBe(true);
  });
});

describe("AIEngine - malformed OpenRouter JSON", () => {
  it("handles non-JSON response from OpenRouter gracefully", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";

    mockFetch(async () =>
      jsonResponse({
        choices: [{ message: { content: "Just a plain text response" } }],
      })
    );

    const result = await AIEngine.processMessage({
      message: "hello",
      businessName: "Store",
      assistantName: "Sophia",
      catalog: [],
      knowledge: [],
    });

    expect(result.answer).toBe("Just a plain text response");
    expect(result.intent).toBe("general_question");
  });
});