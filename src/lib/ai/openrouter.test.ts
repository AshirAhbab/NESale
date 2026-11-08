import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  OpenRouterGateway,
  OpenRouterAuthError,
  OpenRouterRateLimitError,
  OpenRouterTimeoutError,
  OpenRouterModelUnavailableError,
  OpenRouterNoFreeModelError,
  OpenRouterError,
  loadOpenRouterConfig,
} from "./openrouter";

function mockFetch(
  handler: (input: string, init?: any) => Promise<Response>
): any {
  return vi.spyOn(globalThis, "fetch").mockImplementation(handler as any);
}

function jsonResponse(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  });
}

function sseResponse(chunks: string[], status = 200): Response {
  const encoder = new TextEncoder();
  const body = chunks.map((c) => `data: ${c}\n\n`).concat(["data: [DONE]\n\n"]).join("");
  return new Response(encoder.encode(body), {
    status,
    headers: { "Content-Type": "text/event-stream" },
  });
}

beforeEach(() => {
  vi.restoreAllMocks();
  delete process.env.OPENROUTER_API_KEY;
  delete process.env.OPENROUTER_BASE_URL;
  delete process.env.OPENROUTER_MODELS;
  delete process.env.OPENROUTER_FREE_ONLY;
  delete process.env.OPENROUTER_TIMEOUT_MS;
  delete process.env.OPENROUTER_MAX_RETRIES;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("OpenRouterGateway - config loading", () => {
  it("loads config from environment variables", () => {
    process.env.OPENROUTER_API_KEY = "test-key";
    process.env.OPENROUTER_MODELS = "model-a,model-b";
    process.env.OPENROUTER_FREE_ONLY = "true";
    process.env.OPENROUTER_TIMEOUT_MS = "30000";
    process.env.OPENROUTER_MAX_RETRIES = "2";

    const config = loadOpenRouterConfig();
    expect(config.apiKey).toBe("test-key");
    expect(config.models).toEqual(["model-a", "model-b"]);
    expect(config.freeOnly).toBe(true);
    expect(config.timeoutMs).toBe(30000);
    expect(config.maxRetries).toBe(2);
  });

  it("uses defaults when env vars are missing", () => {
    const config = loadOpenRouterConfig();
    expect(config.apiKey).toBe("");
    expect(config.models).toEqual(["openrouter/free"]);
    expect(config.freeOnly).toBe(true);
    expect(config.timeoutMs).toBe(20000);
    expect(config.maxRetries).toBe(1);
  });
});

describe("OpenRouterGateway - successful response", () => {
  it("returns successful response from OpenRouter", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "openrouter/free";

    mockFetch(async (_input, _init) => {
      return jsonResponse({
        id: "chatcmpl-123",
        model: "meta-llama/llama-3.2-3b-instruct:free",
        choices: [{ message: { content: "Hello! How can I help?" }, finish_reason: "stop" }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      });
    });

    const gateway = new OpenRouterGateway();
    const result = await gateway.chatCompletions([
      { role: "system", content: "You are a helpful assistant." },
      { role: "user", content: "Hello" },
    ]);

    expect(result.text).toBe("Hello! How can I help?");
    expect(result.model).toBe("meta-llama/llama-3.2-3b-instruct:free");
    expect(result.usage.total_tokens).toBe(30);
    expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    expect(result.fallbackUsed).toBe(false);
    expect(result.requestId).toBeDefined();
  });

  it("includes OpenRouter headers in request", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "openrouter/free";

    let capturedInit: any = null;
    mockFetch(async (_input, init) => {
      capturedInit = init;
      return jsonResponse({
        choices: [{ message: { content: "Hi" } }],
      });
    });

    const gateway = new OpenRouterGateway();
    await gateway.chatCompletions([{ role: "user", content: "Hi" }]);

    const headers = capturedInit?.headers as any;
    const authHeader = headers?.Authorization || headers?.authorization || "";
    expect(authHeader).toBe("Bearer sk-test-123");
    expect(headers?.["X-Title"] || headers?.["x-title"]).toBe("NESale AI Sales Assistant");
    expect(headers?.["HTTP-Referer"] || headers?.["http-referer"]).toBeDefined();
    expect(capturedInit.body).toContain("openrouter/free");
  });
});

describe("OpenRouterGateway - automatic fallback", () => {
  it("falls back to second model after first model fails with 5xx", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "model-a,model-b";
    process.env.OPENROUTER_MAX_RETRIES = "1";

    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      if (callCount === 1) {
        return jsonResponse({ error: { message: "Internal error" } }, 500);
      }
      return jsonResponse({
        choices: [{ message: { content: "Success on fallback" } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      });
    });

    const gateway = new OpenRouterGateway();
    const result = await gateway.chatCompletions([
      { role: "user", content: "Hi" },
    ]);

    expect(result.text).toBe("Success on fallback");
    expect(result.fallbackUsed).toBe(true);
    expect(callCount).toBe(2);
  });

  it("does not fall back on 401 auth error", async () => {
    process.env.OPENROUTER_API_KEY = "sk-wrong";
    process.env.OPENROUTER_MODELS = "openrouter/free";

    mockFetch(async () => jsonResponse({ error: { message: "Invalid API key" } }, 401));

    const gateway = new OpenRouterGateway();
    await expect(
      gateway.chatCompletions([{ role: "user", content: "Hi" }])
    ).rejects.toBeInstanceOf(OpenRouterAuthError);
  });

  it("does not fall back on 400 bad request", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "openrouter/free";

    mockFetch(async () => jsonResponse({ error: { message: "Invalid request" } }, 400));

    const gateway = new OpenRouterGateway();
    await expect(
      gateway.chatCompletions([{ role: "user", content: "Hi" }])
    ).rejects.toBeInstanceOf(OpenRouterError);
  });
});

describe("OpenRouterGateway - rate limit and Retry-After", () => {
  it("handles 429 with Retry-After header and retries", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "openrouter/free";
    process.env.OPENROUTER_MAX_RETRIES = "1";
    process.env.OPENROUTER_TIMEOUT_MS = "30000";

    let callCount = 0;
    mockFetch(async () => {
      callCount++;
      if (callCount === 1) {
        return jsonResponse({ error: { message: "Rate limited" } }, 429, { "Retry-After": "1" });
      }
      return jsonResponse({
        choices: [{ message: { content: "Success after retry" } }],
        usage: { prompt_tokens: 5, completion_tokens: 10, total_tokens: 15 },
      });
    });

    const gateway = new OpenRouterGateway();
    const result = await gateway.chatCompletions([
      { role: "user", content: "Hi" },
    ]);

    expect(result.text).toBe("Success after retry");
    expect(callCount).toBe(2);
  });

  it("throws OpenRouterRateLimitError when retries exhausted", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "openrouter/free";
    process.env.OPENROUTER_MAX_RETRIES = "0";

    mockFetch(async () => jsonResponse({ error: { message: "Rate limited" } }, 429));

    const gateway = new OpenRouterGateway();
    await expect(
      gateway.chatCompletions([{ role: "user", content: "Hi" }])
    ).rejects.toBeInstanceOf(OpenRouterRateLimitError);
  });
});

describe("OpenRouterGateway - timeout", () => {
  it("throws OpenRouterTimeoutError on request timeout", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "openrouter/free";
    process.env.OPENROUTER_TIMEOUT_MS = "50";
    process.env.OPENROUTER_MAX_RETRIES = "0";

    // Mock fetch that respects AbortSignal and never resolves until aborted
    mockFetch(async (_input, init) => {
      return new Promise((_resolve, reject) => {
        const signal = init.signal as AbortSignal | undefined;
        if (signal?.aborted) {
          reject(new DOMException("Aborted", "AbortError"));
          return;
        }
        const handler = () => reject(new DOMException("Aborted", "AbortError"));
        signal?.addEventListener("abort", handler);
        // Never resolve - simulates hanging request until timeout aborts
      });
    });

    const gateway = new OpenRouterGateway();
    await expect(
      gateway.chatCompletions([{ role: "user", content: "Hi" }])
    ).rejects.toBeInstanceOf(OpenRouterTimeoutError);
  });
});

describe("OpenRouterGateway - no free model available", () => {
  it("throws when no API key configured", async () => {
    process.env.OPENROUTER_API_KEY = "";
    process.env.OPENROUTER_MODELS = "openrouter/free";

    const gateway = new OpenRouterGateway();
    await expect(
      gateway.chatCompletions([{ role: "user", content: "Hi" }])
    ).rejects.toBeInstanceOf(OpenRouterAuthError);
  });

  it("rejects paid models in free-only mode when catalog confirms they are paid", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "anthropic/claude-3-opson";
    process.env.OPENROUTER_FREE_ONLY = "true";

    // Mock catalog to return this model as paid
    mockFetch(async (input) => {
      const url = new URL(input as string);
      if (url.pathname.endsWith("/models")) {
        return jsonResponse({
          data: [{
            id: "anthropic/claude-3-opson",
            pricing: { prompt: "0.0015", completion: "0.006" },
          }],
        });
      }
      return jsonResponse({ error: { message: "Not reached" } }, 404);
    });

    const gateway = new OpenRouterGateway();
    await expect(
      gateway.validateModels()
    ).rejects.toBeInstanceOf(OpenRouterNoFreeModelError);
  });
});

describe("OpenRouterGateway - streaming", () => {
  it("streams response chunks successfully", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "openrouter/free";

    mockFetch(async () =>
      sseResponse([
        JSON.stringify({ choices: [{ delta: { content: "Hello" } }] }),
        JSON.stringify({ choices: [{ delta: { content: " world" } }] }),
      ])
    );

    const gateway = new OpenRouterGateway();
    const chunks: string[] = [];
    for await (const chunk of gateway.streamCompletions([
      { role: "user", content: "Hi" },
    ])) {
      if (chunk.text) chunks.push(chunk.text);
      if (chunk.done) break;
    }

    expect(chunks.join("")).toBe("Hello world");
  });

  it("throws on mid-stream failure after first token", async () => {
    process.env.OPENROUTER_API_KEY = "sk-test-123";
    process.env.OPENROUTER_MODELS = "openrouter/free";

    const encoder = new TextEncoder();
    const firstChunk = encoder.encode('data: {"choices":[{"delta":{"content":"First"}}]}\n\n');
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(firstChunk);
        setTimeout(() => controller.error(new Error("Stream interrupted")), 50);
      },
    });

    mockFetch(async () =>
      new Response(stream, {
        status: 200,
        headers: { "Content-Type": "text/event-stream" },
      })
    );

    const gateway = new OpenRouterGateway();
    await expect(
      (async () => {
        for await (const _ of gateway.streamCompletions([
          { role: "user", content: "Hi" },
        ])) {
          // consume
        }
      })()
    ).rejects.toBeInstanceOf(OpenRouterError);
  });
});