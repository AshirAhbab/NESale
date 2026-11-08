# NE_Sale — Comprehensive Architectural & Development Master Blueprint

> **Purpose of this document:**  
> This master document outlines the entire architecture, database schema, codebase organization, implemented modules, recent fixes/optimizations, and remaining backlog for **NE_Sale**. Share or paste this document directly into ChatGPT, Claude, or any LLM to immediately resume development without losing context.

---

## 1. Project Overview & Business Logic

**NE_Sale** is an autonomous AI sales assistant and customer conversion SaaS platform built for e-commerce storefronts and service-based professionals.

### Core Value Proposition:
1. **Autonomous Conversational Sales Agent:** An interactive embeddable widget (`widget.js` + `ShopperWidget.tsx`) that lives on the merchant's external website. It analyzes shopper intent, answers questions from a store knowledge base, and recommends in-stock catalog products or service bookings with real-time checkout links.
2. **Catalog & Storefront Synchronization:** Automatically syncs products from Shopify, Supabase databases, headless API endpoints, or website web crawlers (`cheerio`).
3. **Multi-Tenant Architecture:** Strict tenant isolation keyed by `businessId`. Every business owns its products, services, conversations, analytics events, and knowledge vectors.
4. **Performance-Optimized In-Memory Caching:** SWR (Stale-While-Revalidate) cache layer and tenant memoization in `globalThis` to slash latency from overseas PostgreSQL databases (e.g., Supabase in Australia/US) down to sub-50ms responses.

---

## 2. Tech Stack & Environment

- **Framework:** Next.js 16.3.8 (App Router, Turbopack, React 19)
- **Language:** TypeScript 5
- **ORM:** Prisma ORM 7 (`@prisma/adapter-pg` with native PostgreSQL driver adapter `pg`)
  - *Generated Client Path:* `@/generated/prisma` (configured via `src/generated/prisma`)
- **Database:** PostgreSQL (Hosted on Supabase)
- **Auth:** Supabase Auth (`@supabase/ssr`, `@supabase/supabase-js`)
- **AI Engine:** Google Gemini SDK (`@google/genai`)
- **Styling:** Tailwind CSS v4, Lucide React icons
- **Design System:** UI/UX Pro Max (60-30-10 color rule, dark/light adaptive, tactile micro-interactions `active:scale-[0.98]`, responsive 8pt grid)

---

## 3. Database Schema Overview (`prisma/schema.prisma`)

The database contains 19 core models:

### 1. Multi-Tenant & Identity
- `Business`: Central tenant model (`id`, `name`, `slug`, `businessType`, `websiteUrl`, `currency`, `timezone`, `status`).
- `User`: Application user profile (`id`, `email`, `name`).
- `BusinessMember`: Maps users to businesses with role (`owner`, `admin`, `member`). Unique constraint: `@@unique([businessId, userId])`.
- `BusinessSettings`: Per-store configuration (`defaultTone`, `escalationEmail`, `enableHumanHandoff`, `autoTagLeads`).

### 2. Catalog & Offerings
- `Product`: Catalog items (`id`, `businessId`, `name`, `slug`, `priceMin`, `priceMax`, `currency`, `status`, `productType`, `imageUrl`, `metadata` JSON containing SKU, stock, AI rec counts, CTR, orders, etc.).
- `ProductVariant`: SKU-level sizes/colors (`productId`, `title`, `sku`, `price`, `inventoryQuantity`).
- `Service`: For non-product service businesses (doctors, lawyers, plumbers, etc.) with `priceMin`, `durationMinutes`, `bookingUrl`, `status`.
- `Staff` & `Location`: Staff members and physical business branch addresses.

### 3. AI Knowledge Base & RAG
- `KnowledgeSource`: Stores indexed URLs, manual text, or uploaded document definitions.
- `KnowledgeChunk`: Embedded text chunks with vector embeddings (`chunkText`, `embedding` vector, `tokenCount`).

### 4. Live Chat, Telemetry & Leads
- `Conversation`: Shopper chat sessions (`businessId`, `channel`, `status`, `startedAt`, `endedAt`, `metadata`).
- `Message`: Chat history (`conversationId`, `sender` [shopper|assistant|agent], `body`, `tokensUsed`).
- `Lead`: Shoppers captured by the AI (`email`, `phone`, `name`, `leadScore`, `status`, `intentSummary`).
- `AnalyticsEvent`: Live telemetry events (`eventType`: `page_view`, `product_view`, `product_click`, `add_to_cart`, `order_complete`, `chat_open`).
- `UsageRecord` & `Subscription`: Token usage tracking, billing plans, and Stripe/payment tiers.
- `WidgetConfig`: Branding, greeting message, theme colors, bubble position (`bottom_right`, `bottom_left`).

---

## 4. Codebase Directory Map

```
NE_Sale/
├── prisma/
│   └── schema.prisma                  # Prisma ORM schema (19 models)
├── public/
│   └── widget.js                      # Universal embeddable script for merchant stores
├── src/
│   ├── app/
│   │   ├── api/v1/
│   │   │   ├── dashboard/
│   │   │   │   ├── overview/route.ts  # KPI cards, funnel calculation, user resolution
│   │   │   │   ├── analytics/route.ts # Sales performance charts, time ranges, attribution
│   │   │   │   ├── products/route.ts  # CRUD catalog + AI semantic vector tuning
│   │   │   │   ├── services/route.ts  # Service offerings & appointment booking endpoints
│   │   │   │   ├── knowledge/route.ts # RAG data ingestion, crawler, embeddings
│   │   │   │   ├── settings/route.ts  # Store preferences & prompt guidelines
│   │   │   │   ├── store/sync-public/ # Storefront auto-sync (Supabase/Shopify/HTML)
│   │   │   │   └── team/route.ts      # Multi-user member invitations
│   │   │   └── widget/
│   │   │       ├── chat/route.ts      # Gemini AI chat completion + product recommendations
│   │   │       └── config/route.ts    # Public widget branding & configuration
│   │   ├── dashboard/
│   │   │   ├── page.tsx               # Overview dashboard (KPIs, Funnel, Charts)
│   │   │   ├── products/page.tsx      # Products catalog (Paginated, Search, Filters, Inspector)
│   │   │   ├── analytics/page.tsx     # Deep analytics & conversion metrics
│   │   │   ├── conversations/page.tsx # Real-time conversation audit & transcript reader
│   │   │   ├── store/page.tsx         # Store sync settings & audit trail
│   │   │   ├── widget/page.tsx        # Widget customizer with live phone preview
│   │   │   ├── knowledge/page.tsx     # AI Knowledge base & document sync
│   │   │   ├── settings/page.tsx      # Merchant settings
│   │   │   └── layout.tsx             # Sidebar, Header, and authenticated shell
│   │   ├── login/page.tsx             # Supabase Auth Login
│   │   ├── register/page.tsx          # Merchant Registration
│   │   ├── onboarding/page.tsx        # 3-step store connect wizard
│   │   └── page.tsx                   # Marketing landing page
│   ├── components/
│   │   ├── dashboard/
│   │   │   ├── Header.tsx             # Profile icon, DB user name/email, store switcher
│   │   │   ├── Sidebar.tsx            # Collapsible navigation drawer
│   │   │   └── PerformanceChart.tsx   # SVG animated sales chart with hover-only tooltip
│   │   ├── widget/
│   │   │   └── ShopperWidget.tsx      # Customer-facing chat modal with product cards
│   │   └── ui/
│   │       └── Toast.tsx              # Toast notification system
│   └── lib/
│       ├── cache/
│       │   ├── apiCache.ts            # SWR in-memory caching store on globalThis
│       │   └── tenantMemo.ts          # 60s memoized tenant/user resolver
│       ├── db/
│       │   ├── prisma.ts              # Edge-compatible Prisma Client with pg adapter
│       │   └── seed.ts                # Initial demo merchant seeder
│       └── integrations/
│           └── storefrontSync.ts      # Multi-engine crawler & Supabase/Shopify auto-detector
```

---

## 5. What Was Completed & Fixed Recently

1. **Storefront Public Sync Engine (`storefrontSync.ts`):**
   - Automatically detects whether an external target storefront (e.g. `tech-nexa-hub.vercel.app`) runs on Supabase by scanning client JavaScript chunks for `supabaseUrl` and anon keys.
   - Queries the remote `Product` table directly to synchronize 185+ real products instead of dummy mock items.
   - Cleanses stale/fake seed products during synchronization.

2. **Audit Trail Persistence (`dashboard/store/page.tsx`):**
   - "Catalog Synchronization Audit Trail" cards now persist logs locally via `localStorage` with automated timestamping, status badges, and duration metrics.

3. **Dashboard Header & User Identity (`Header.tsx` & `overview/route.ts`):**
   - Header profile icon dynamically loads the authentic merchant's name (`Alex Grey`), email (`gocexaw278@ensproxy.com`), and avatar initials (`AG`) by querying `BusinessMember` -> `User`.
   - Fixed realistic conversion funnel metrics (conversion rate corrected from an erroneous 286% down to a realistic 4.3%).

4. **PerformanceChart Component (`PerformanceChart.tsx`):**
   - Implemented dynamic SVG line-drawing animations (`strokeDashoffset`).
   - Replaced static tooltips with hover-only responsive metric inspection cards.
   - Added area-fill gradients and dynamic hover guides.

5. **Sub-50ms Performance Caching Layer (`apiCache.ts` & `tenantMemo.ts`):**
   - Built a high-performance in-memory Stale-While-Revalidate (SWR) cache.
   - Stored in `globalThis` to preserve warm cache states across Next.js Turbopack hot-reloads.
   - Slashed repeat response times from Sydney PostgreSQL (300ms network round-trip):
     - **Overview API:** Dropped from `~9,200ms` down to **`~41ms`**.
     - **Products API:** Dropped from `~5,700ms` down to **`~95ms`**.

6. **Products Page Card Pagination (`dashboard/products/page.tsx`):**
   - Products are no longer dumped all at once on a massive single scroll.
   - Displays clean **10 items per page/card**.
   - Features full pagination bar: `First («)`, `Prev (‹)`, dynamic numbered pills with ellipsis (`1 … 4 [5] 6 … 20`), `Next (›)`, and `Last (»)` buttons.
   - Automatically resets to Page 1 on search queries or category filter switches.
   - Row counter calculates global offset indices (`Showing 1-10 of 194`).

---

## 6. How the Platform Supports Non-Product Businesses

For businesses that sell services or bookings rather than physical merchandise (doctors, dentists, lawyers, plumbers, home repairs, real estate agencies, restaurants):

- **Data Model:** Handled via the `Service` model in `prisma/schema.prisma` (`bookingUrl`, `durationMinutes`, `priceMin`, `category`).
- **UI Tab:** Products page has an existing toggle between **Products** and **Services**.
- **AI Behavior:** The AI prompt shifts from recommending physical cart items to:
  1. *Triaging customer symptoms, legal cases, or repair needs.*
  2. *Answering FAQ (pricing estimates, insurance, opening hours).*
  3. *Capturing shopper leads (Name, Phone, Email, Address).*
  4. *Dispatching direct appointment/booking URLs (Calendly, WhatsApp, custom booking).*

---

## 8. OpenRouter AI Integration (Free Models)

NE_Sale uses OpenRouter's free-model ecosystem for AI chat completions, replacing the previous Google Gemini integration. All provider-specific code is centralized in `src/lib/ai/openrouter.ts`.

### Architecture

- **Central Gateway** (`src/lib/ai/openrouter.ts`): `OpenRouterGateway` class handles all OpenRouter API communication, model routing, retries, streaming, and error normalization.
- **AI Engine** (`src/lib/ai/engine.ts`): `AIEngine.processMessage()` builds the system prompt, calls OpenRouter via the gateway, and falls back to deterministic rules when OpenRouter is unavailable.
- **Usage Tracking** (`src/lib/ai/usage.ts`): Records AI usage (tokens, latency, model, success/failure) to the `UsageRecord` table for per-business and platform-level cost controls.
- **Rate Limiting**: Per-business rate limiting (30 req/min) using the in-memory `ApiCache` layer.

### Model Configuration

All model settings are configured via environment variables in `.env`:

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENROUTER_API_KEY` | (required) | OpenRouter API key from https://openrouter.ai/keys |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | OpenRouter API base URL |
| `OPENROUTER_MODELS` | `openrouter/free` | Comma-separated model list or `openrouter/free` for dynamic routing |
| `OPENROUTER_FREE_ONLY` | `true` | Reject paid models when true |
| `OPENROUTER_TIMEOUT_MS` | `20000` | Request timeout in milliseconds |
| `OPENROUTER_MAX_RETRIES` | `1` | Max retry attempts for transient failures |
| `OPENROUTER_APP_URL` | `https://nesale.local` | App URL for OpenRouter referer header |

### Embedding Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `EMBEDDING_PROVIDER` | `gemini` | Embedding provider: `gemini` or `none` (deterministic hash fallback) |
| `EMBEDDING_MODEL` | `text-embedding-004` | Gemini embedding model |
| `EMBEDDING_DIMENSIONS` | `768` | Vector dimensions (must match model output) |
| `EMBEDDING_REJECT_FALLBACK` | `false` | When `true`, fail instead of silently falling back to deterministic embeddings |
| `CRON_SECRET` | (empty) | Secret for securing `/api/v1/system/process-jobs` cron endpoint |

### Free-Only Enforcement

- `OPENROUTER_FREE_ONLY=true` prevents any paid model from being selected.
- Models are validated against OpenRouter's model catalog at startup via `validateModels()`.
- `openrouter/free` enables dynamic free-model routing through OpenRouter.
- Specific free model IDs can be listed as an ordered fallback chain.

### Automatic Fallback

1. Request sent to the first configured model.
2. On transient failure (429, 5xx, timeout), OpenRouter retries with the next model in the list.
3. `Retry-After` headers are respected for rate limits.
4. Exponential backoff with jitter prevents retry storms.
5. Non-retryable errors (401, 400, 403) fail immediately without fallback.
6. Deterministic local fallback is used as last resort when OpenRouter is fully unavailable.

### Usage Tracking & Cost Controls

- Per-business daily limits: 100 requests, 50,000 tokens.
- Platform daily budget: 1,000 requests.
- Usage recorded with `businessId`, model, tokens, latency, success/failure, and `requestId` for idempotency.
- `checkBusinessUsageLimit()` enforces per-business caps before processing.

### Environment Setup

1. Copy `.env.example` to `.env` and add your OpenRouter API key.
2. Run `npx prisma generate` to ensure the Prisma client is up to date.
3. Run `npm run dev` to start the development server.

---

## 7. What Needs Work Next (Pending Backlog)

### High Priority
1. **Database Cold Query Aggregation (Plan 3 of Performance Roadmap):**
   - Cold cache requests on `/api/v1/dashboard/analytics` still take ~6-9 seconds when retrieving thousands of raw conversation messages from Supabase in Sydney.
   - *Fix:* Replace full `findMany({ include: { messages: true } })` with Prisma SQL `_count` / `groupBy` aggregations to fetch summarized statistics without hydrating all text bodies into memory.
2. **Client-Side SWR / TanStack Query:**
   - Add client-side SWR caching (`stale-while-revalidate`) on the front-end dashboard pages to make tab switching 100% instant without triggering skeleton loaders.
3. **Services Management UI Full Integration (`dashboard/products/page.tsx`):**
   - Enhance the "Services" tab on the products page to support service creation modals, duration pickers (15m, 30m, 1h), and booking URL links.
4. **Widget Real-time Lead Dispatch:**
   - When a customer provides their phone/email in the chat widget, trigger an instant email/webhook notification to the merchant (`BusinessSettings.escalationEmail`).

### Medium Priority
5. **AI Knowledge Base Embeddings** — IMPLEMENTED
   - pgvector extension enabled via `supabase/migrations/001_enable_pgvector_and_rag.sql`
   - `knowledge_chunks.embedding` column is native `vector(768)` type
   - HNSW cosine similarity index: `idx_knowledge_chunks_embedding_cosine`
   - Embedding provider: `src/lib/ai/embedding.ts` (Gemini + deterministic fallback)
   - Vector search: `src/lib/ai/vector-search.ts` (tenant-scoped, `<=>` operator)
   - Background job queue: `src/lib/jobs/queue.ts` (crawl → extract → chunk → embed → store)
   - Job processor endpoint: `POST /api/v1/system/process-jobs` (call via cron)
   - Document upload: `POST /api/v1/dashboard/knowledge/upload` (.txt, .md, .csv, .json; PDF needs `pdf-parse`)
   - Per-business embedding limits: `src/lib/ai/usage.ts` (`checkEmbeddingLimit`, `recordEmbeddingUsage`)
   - Row Level Security: enabled on `knowledge_sources` and `knowledge_chunks` (migration)
   - Silent fallback tracking: `EMBEDDING_REJECT_FALLBACK` env var
   - Atomic re-index: old chunks deleted and new ones inserted in single transaction

6. **Multi-Store Switcher:**
   - Allow merchants owning multiple businesses to switch between tenants seamlessly in the Header dropdown.

### Remaining Items (Post-RAG)
