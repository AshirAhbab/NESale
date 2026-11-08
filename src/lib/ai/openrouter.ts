export const OPENROUTER_BASE_URL_DEFAULT = "https://openrouter.ai/api/v1";
export const OPENROUTER_MODELS_DEFAULT = "openrouter/free";
export const OPENROUTER_TIMEOUT_MS_DEFAULT = 20000;
export const OPENROUTER_MAX_RETRIES_DEFAULT = 1;
export const OPENROUTER_FREE_ONLY_DEFAULT = true;

export class OpenRouterError extends Error {
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly retryAfter?: number;
  public readonly requestId?: string;

  constructor(
    message: string,
    {
      statusCode = 500,
      retryable = false,
      retryAfter,
      requestId,
    }: {
      statusCode?: number;
      retryable?: boolean;
      retryAfter?: number;
      requestId?: string;
    } = {}
  ) {
    super(message);
    this.name = "OpenRouterError";
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.retryAfter = retryAfter;
    this.requestId = requestId;
  }
}

export class OpenRouterAuthError extends OpenRouterError {
  constructor(message = "Invalid or missing OpenRouter API key.", requestId?: string) {
    super(message, { statusCode: 401, retryable: false, requestId });
    this.name = "OpenRouterAuthError";
  }
}

export class OpenRouterRateLimitError extends OpenRouterError {
  constructor(message = "OpenRouter rate limit exceeded.", retryAfter?: number, requestId?: string) {
    super(message, { statusCode: 429, retryable: true, retryAfter, requestId });
    this.name = "OpenRouterRateLimitError";
  }
}

export class OpenRouterTimeoutError extends OpenRouterError {
  constructor(message = "OpenRouter request timed out.", requestId?: string) {
    super(message, { statusCode: 504, retryable: true, requestId });
    this.name = "OpenRouterTimeoutError";
  }
}

export class OpenRouterModelUnavailableError extends OpenRouterError {
  constructor(message = "No eligible OpenRouter model available.", requestId?: string) {
    super(message, { statusCode: 503, retryable: false, requestId });
    this.name = "OpenRouterModelUnavailableError";
  }
}

export class OpenRouterNoFreeModelError extends OpenRouterError {
  constructor(message = "No free OpenRouter model is available.", requestId?: string) {
    super(message, { statusCode: 503, retryable: false, requestId });
    this.name = "OpenRouterNoFreeModelError";
  }
}

export interface OpenRouterConfig {
  apiKey: string;
  baseUrl: string;
  models: string[];
  freeOnly: boolean;
  timeoutMs: number;
  maxRetries: number;
}

export interface OpenRouterMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
}

export interface OpenRouterUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export interface OpenRouterChatResult {
  text: string;
  model: string;
  usage: OpenRouterUsage;
  latencyMs: number;
  fallbackUsed: boolean;
  finishReason?: string;
  requestId: string;
}

export interface OpenRouterStreamChunk {
  text: string;
  done: boolean;
  model?: string;
  usage?: OpenRouterUsage;
  finishReason?: string;
}

interface ModelCatalogEntry {
  id: string;
  name?: string;
  pricing?: {
    prompt?: string | number;
    completion?: string | number;
  };
  context_length?: number;
}

interface OpenRouterErrorResponse {
  error?: {
    message?: string;
    code?: string;
    type?: string;
  };
}

class ModelCatalogCache {
  private cache: Map<string, ModelCatalogEntry> = new Map();
  private expiresAt = 0;
  private readonly ttlMs = 5 * 60 * 1000; // 5 minutes

  async fetchCatalog(baseUrl: string, apiKey: string): Promise<Map<string, ModelCatalogEntry>> {
    const now = Date.now();
    if (this.cache.size > 0 && now < this.expiresAt) {
      return this.cache;
    }

    try {
      const res = await fetch(`${baseUrl.replace(/\/+$/, "")}/models`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) {
        return new Map();
      }

      const data = (await res.json()) as { data?: ModelCatalogEntry[] };
      const map = new Map<string, ModelCatalogEntry>();
      for (const model of data.data ?? []) {
        map.set(model.id, model);
      }

      this.cache = map;
      this.expiresAt = now + this.ttlMs;
      return map;
    } catch {
      return new Map();
    }
  }

  get(modelId: string): ModelCatalogEntry | null {
    return this.cache.get(modelId) ?? null;
  }

  isFree(modelId: string): boolean {
    const entry = this.cache.get(modelId);
    if (!entry) return false;
    const prompt = entry.pricing?.prompt;
    const completion = entry.pricing?.completion;
    return (prompt === 0 || prompt === "0" || prompt === null || prompt === undefined) &&
      (completion === 0 || completion === "0" || completion === null || completion === undefined);
  }
}

const catalogCache = new ModelCatalogCache();

export function loadOpenRouterConfig(): OpenRouterConfig {
  const apiKey = process.env.OPENROUTER_API_KEY || "";
  const baseUrl = (process.env.OPENROUTER_BASE_URL || OPENROUTER_BASE_URL_DEFAULT).replace(/\/+$/, "");
  const modelsRaw = process.env.OPENROUTER_MODELS || OPENROUTER_MODELS_DEFAULT;
  const models = modelsRaw
    .split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  const freeOnly = process.env.OPENROUTER_FREE_ONLY !== "false";
  const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || OPENROUTER_TIMEOUT_MS_DEFAULT);
  const maxRetries = Number(process.env.OPENROUTER_MAX_RETRIES || OPENROUTER_MAX_RETRIES_DEFAULT);

  return { apiKey, baseUrl, models, freeOnly, timeoutMs, maxRetries };
}

function isRetryableError(err: OpenRouterError): boolean {
  return err.retryable === true;
}

function parseRetryAfter(header: string | null): number | undefined {
  if (!header) return undefined;
  const seconds = Number(header);
  if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  return undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  return ms + Math.floor(Math.random() * Math.min(ms, 1000));
}

export class OpenRouterGateway {
  private config: OpenRouterConfig;

  constructor(config?: Partial<OpenRouterConfig>) {
    const base = loadOpenRouterConfig();
    this.config = {
      ...base,
      ...config,
      models: config?.models ? config.models : base.models,
    };
  }

  getConfig(): OpenRouterConfig {
    return { ...this.config };
  }

  async validateModels(): Promise<{ valid: string[]; invalid: string[]; free: string[]; paid: string[] }> {
    const { apiKey, baseUrl, freeOnly } = this.config;
    const catalog = await catalogCache.fetchCatalog(baseUrl, apiKey);

    const valid: string[] = [];
    const invalid: string[] = [];
    const free: string[] = [];
    const paid: string[] = [];

    for (const modelId of this.config.models) {
      if (modelId === "openrouter/free") {
        valid.push(modelId);
        free.push(modelId);
        continue;
      }

      const entry = catalog.get(modelId);
      if (!entry) {
        invalid.push(modelId);
        continue;
      }

      const isFreeModel = catalogCache.isFree(modelId);
      valid.push(modelId);
      if (isFreeModel) {
        free.push(modelId);
      } else {
        paid.push(modelId);
      }
    }

    if (freeOnly && paid.length > 0) {
      throw new OpenRouterNoFreeModelError(
        `Configured paid models are not allowed in free-only mode: ${paid.join(", ")}`
      );
    }

    return { valid, invalid, free, paid };
  }

  private async resolveModels(): Promise<string[]> {
    if (this.config.models.includes("openrouter/free")) {
      return ["openrouter/free"];
    }
    return [...this.config.models];
  }

  private buildHeaders(requestId: string): HeadersInit {
    return {
      Authorization: `Bearer ${this.config.apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": process.env.OPENROUTER_APP_URL || "https://nesale.local",
      "X-Title": "NESale AI Sales Assistant",
      "X-Request-Id": requestId,
    };
  }

  private async fetchWithRetry(
    requestId: string,
    body: Record<string, unknown>,
    stream: boolean
  ): Promise<{ response: Response; modelUsed: string; attempts: number }> {
    const models = await this.resolveModels();
    if (models.length === 0) {
      throw new OpenRouterNoFreeModelError("No OpenRouter models configured.", requestId);
    }

    let lastError: OpenRouterError | null = null;
    const startTime = Date.now();
    const deadline = startTime + this.config.timeoutMs;

    for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
      const now = Date.now();
      if (now >= deadline) {
        throw lastError ?? new OpenRouterTimeoutError("Request deadline exceeded.", requestId);
      }

      const remaining = deadline - now;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), Math.min(remaining, this.config.timeoutMs));

      const model = models[attempt % models.length];

      try {
        const res = await fetch(`${this.config.baseUrl}/chat/completions`, {
          method: "POST",
          headers: this.buildHeaders(requestId),
          body: JSON.stringify({
            ...body,
            model,
            stream,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (res.status === 401) {
          throw new OpenRouterAuthError("Invalid OpenRouter API key.", requestId);
        }

        if (res.status === 403) {
          throw new OpenRouterError("OpenRouter request forbidden.", {
            statusCode: 403,
            retryable: false,
            requestId,
          });
        }

        if (res.status === 400) {
          const errBody = (await res.json().catch(() => ({}))) as OpenRouterErrorResponse;
          throw new OpenRouterError(
            errBody.error?.message || "Invalid OpenRouter request.",
            { statusCode: 400, retryable: false, requestId }
          );
        }

        if (res.status === 429 || res.status >= 500) {
          const retryAfter = parseRetryAfter(res.headers.get("Retry-After"));
          const err = new OpenRouterRateLimitError(
            `OpenRouter upstream error (${res.status}).`,
            retryAfter,
            requestId
          );
          lastError = err;

          if (attempt < this.config.maxRetries) {
            const waitMs = retryAfter ?? jitter(Math.pow(2, attempt) * 1000);
            if (now + waitMs < deadline) {
              await sleep(waitMs);
              continue;
            }
          }
          throw err;
        }

        if (!res.ok) {
          throw new OpenRouterError(
            `OpenRouter unexpected response (${res.status}).`,
            { statusCode: res.status, retryable: false, requestId }
          );
        }

        return { response: res, modelUsed: model, attempts: attempt + 1 };
      } catch (err) {
        clearTimeout(timeoutId);

        if (err instanceof OpenRouterError && !err.retryable) {
          throw err;
        }

        if (err instanceof Error && err.name === "AbortError") {
          lastError = new OpenRouterTimeoutError("OpenRouter request timed out.", requestId);
          if (attempt < this.config.maxRetries && now + jitter(1000) < deadline) {
            await sleep(jitter(1000));
            continue;
          }
          throw lastError;
        }

        lastError = err instanceof OpenRouterError ? err : new OpenRouterError(String(err ?? "Unknown error"), { requestId });
        if (attempt < this.config.maxRetries && isRetryableError(lastError)) {
          await sleep(jitter(Math.pow(2, attempt) * 1000));
          continue;
        }
        throw lastError;
      }
    }

    throw lastError ?? new OpenRouterModelUnavailableError("All OpenRouter models exhausted.", requestId);
  }

  async chatCompletions(
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      seed?: number;
    } = {}
  ): Promise<OpenRouterChatResult> {
    const requestId = crypto.randomUUID();
    const { temperature, maxTokens, topP, frequencyPenalty, presencePenalty, seed } = options;

    if (!this.config.apiKey) {
      throw new OpenRouterAuthError("OpenRouter API key is not configured.", requestId);
    }

    const t0 = Date.now();
    const { response, modelUsed, attempts } = await this.fetchWithRetry(requestId, {
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      seed,
    }, false);

    const latencyMs = Date.now() - t0;

    let data: {
      id?: string;
      model?: string;
      choices?: Array<{
        message?: { content?: string };
        finish_reason?: string;
      }>;
      usage?: OpenRouterUsage;
    };

    try {
      data = await response.json();
    } catch {
      throw new OpenRouterError("Invalid OpenRouter response body.", {
        statusCode: 502,
        retryable: false,
        requestId,
      });
    }

    const choice = data.choices?.[0];
    const text = choice?.message?.content ?? "";

    if (!text) {
      throw new OpenRouterError("OpenRouter returned an empty response.", {
        statusCode: 502,
        retryable: false,
        requestId,
      });
    }

    return {
      text,
      model: data.model ?? modelUsed,
      usage: data.usage ?? {},
      latencyMs,
      fallbackUsed: attempts > 1,
      finishReason: choice?.finish_reason,
      requestId,
    };
  }

  async *streamCompletions(
    messages: OpenRouterMessage[],
    options: {
      temperature?: number;
      maxTokens?: number;
      topP?: number;
      frequencyPenalty?: number;
      presencePenalty?: number;
      seed?: number;
    } = {}
  ): AsyncGenerator<OpenRouterStreamChunk, void, unknown> {
    const requestId = crypto.randomUUID();
    const { temperature, maxTokens, topP, frequencyPenalty, presencePenalty, seed } = options;

    if (!this.config.apiKey) {
      throw new OpenRouterAuthError("OpenRouter API key is not configured.", requestId);
    }

    const { response, modelUsed } = await this.fetchWithRetry(requestId, {
      messages,
      temperature,
      max_tokens: maxTokens,
      top_p: topP,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty,
      seed,
    }, true);

    const reader = response.body?.getReader();
    if (!reader) {
      throw new OpenRouterError("OpenRouter response has no body.", {
        statusCode: 502,
        retryable: false,
        requestId,
      });
    }

    let buffer = "";
    let model = modelUsed;
    let finishReason: string | undefined;
    let usage: OpenRouterUsage | undefined;
    let yieldedFirstToken = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += new TextDecoder().decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;

          const payload = trimmed.slice(6);
          if (payload === "[DONE]") {
            yield { text: "", done: true, model, usage, finishReason };
            return;
          }

          try {
            const parsed = JSON.parse(payload);
            const choice = parsed.choices?.[0];
            const delta = choice?.delta;
            const content = delta?.content ?? "";

            if (content) {
              if (!yieldedFirstToken) {
                yieldedFirstToken = true;
              }
              yield {
                text: content,
                done: false,
                model: parsed.model ?? modelUsed,
              };
              model = parsed.model ?? model;
            }

            if (choice?.finish_reason) {
              finishReason = choice.finish_reason;
            }
            if (parsed.usage) {
              usage = parsed.usage;
            }
          } catch {
            // Skip malformed SSE lines
          }
        }
      }

      yield { text: "", done: true, model, usage, finishReason };
    } catch (err) {
      if (yieldedFirstToken) {
        throw new OpenRouterError("OpenRouter streaming interrupted after first token.", {
          statusCode: 502,
          retryable: false,
          requestId,
        });
      }
      throw err instanceof OpenRouterError ? err : new OpenRouterError(String(err ?? "Stream error"), { requestId });
    } finally {
      reader.releaseLock();
    }
  }

  async validateFreeModelAvailability(): Promise<{ available: boolean; models: string[]; details: string[] }> {
    const { apiKey, baseUrl, freeOnly } = this.config;
    const catalog = await catalogCache.fetchCatalog(baseUrl, apiKey);

    const available: string[] = [];
    const details: string[] = [];

    for (const modelId of this.config.models) {
      if (modelId === "openrouter/free") {
        available.push(modelId);
        details.push(`${modelId}: dynamic free routing`);
        continue;
      }

      const entry = catalog.get(modelId);
      if (!entry) {
        details.push(`${modelId}: not found in catalog`);
        continue;
      }

      if (freeOnly && !catalogCache.isFree(modelId)) {
        details.push(`${modelId}: paid model (skipped in free-only mode)`);
        continue;
      }

      available.push(modelId);
      details.push(`${modelId}: free (context ${entry.context_length ?? "unknown"})`);
    }

    return { available: available.length > 0, models: available, details };
  }
}

export const openRouterGateway = new OpenRouterGateway();

export async function createOpenRouterGateway(): Promise<OpenRouterGateway> {
  const gateway = new OpenRouterGateway();
  await gateway.validateModels();
  return gateway;
}
