# NE_Sale: Complete SaaS Architecture, Implementation State & Strategic Roadmap

> **Document Purpose:** This document provides a complete technical and product audit of the **NE_Sale** SaaS platform. It is formatted in token-efficient, highly structured Markdown so that it can be digested directly by Claude or another AI model for planning, architectural analysis, and execution of the next phases.
> 
> **Confidentiality:** All credentials, private tokens, and API secret values have been strictly omitted. Only environment variable names and configuration purposes are documented.

---

## 1. Executive Summary & SaaS Value Proposition

**NE_Sale** is an enterprise-grade, multi-tenant AI Shopper Assistant and Conversion Automation platform designed for:
1. **Ecommerce Stores (Shopify & Custom):** Autonomous shopper guidance, product recommendation carousels, real-time inventory lookup, and instant add-to-cart conversion.
2. **Local Services & Appointment Businesses (Clinics, Salons, Consultancies, Trades):** Autonomous lead capture, 2-way appointment scheduling with conflict prevention, and staff calendar sync.
3. **Omnichannel & Multi-Domain Merchants:** Support for multi-website embedding, team-scoped notification dispatching (Slack, Discord, HubSpot, WhatsApp, Email), and Bring-Your-Own-Key (BYO-Key) integrations.

### Core Technology Stack
- **Framework:** Next.js 16 (App Router, Turbopack, React 19)
- **Language:** TypeScript 5.x (Strict mode, 100% type-checked via `tsc --noEmit`)
- **Database & ORM:** PostgreSQL (Supabase / Neon compatible) via **Prisma ORM 7** with `@prisma/adapter-pg` driver adapter.
- **Styling & UI System:** Tailwind CSS 4, Lucide React icons, UI/UX Pro Max design system (60-30-10 color rule, 8pt grid, 44px touch targets, tactile micro-interactions).
- **Security & Crypto:** Authenticated **AES-256-GCM** encryption engine with random 12-byte IVs and 16-byte auth tags for sensitive third-party credentials.
- **Testing:** Vitest with **102 tests passing** across encryption, rate limiting, entitlements, vector search, usage metering, team auth, booking availability, and notification dispatch.
- **Hosting & Infrastructure:** Optimized for free/low-cost tiers on **Vercel** (Serverless/Edge) and **Supabase** (Postgres DB).

---

## 2. Complete Database Schema (Prisma ORM - 27 Models)

The data model is declared in `prisma/schema.prisma` and deployed via PostgreSQL migrations.

| # | Model Name | Table Name | Purpose & Primary Fields |
|---|---|---|---|
| 1 | `Business` | `businesses` | Core merchant tenant. Name, slug, businessType (ecommerce/services), websiteUrl, timezone, currency, status. |
| 2 | `User` | `users` | Authenticated account identities (email, name, Supabase auth link). |
| 3 | `BusinessMember` | `business_members` | Tenant membership associating User to Business with global role (`owner`, `admin`, `member`). |
| 4 | `Integration` | `integrations` | BYO-Key and third-party connections (`shopify`, `slack`, `discord`, `hubspot`, `google_calendar`, `gmail`, `webhook`, `whatsapp`, `website`). Stores `accessTokenEncrypted`, `metadata` (triggers, webhook URLs), and `teamId`. |
| 5 | `Product` | `products` | Merchant product catalog items. Name, description, priceMin, priceMax, currency, imageUrl, status, teamId. |
| 6 | `ProductVariant` | `product_variants` | SKU-level product options, inventory quantities, and pricing variants. |
| 7 | `Service` | `services` | Service catalog items for appointment businesses (durationMinutes, priceMin, priceMax, bookingUrl). |
| 8 | `Staff` | `staff` | Staff members assigned to bookable services, schedules, and appointments. |
| 9 | `Location` | `locations` | Physical brick-and-mortar locations, addresses, geo-coordinates, and operating hours. |
| 10 | `KnowledgeSource` | `knowledge_sources` | Ingested URLs, documents, policy manuals, and FAQs with crawling status and content hashes. |
| 11 | `KnowledgeChunk` | `knowledge_chunks` | Chunked text segments with pgvector embeddings and fallback cosine similarity indexes. |
| 12 | `Conversation` | `conversations` | Visitor shopper chat sessions (visitorId, sessionId, channel, status: active/closed/handed_off). |
| 13 | `Message` | `messages` | Chat transcript messages (role: user/assistant/tool/system, toolName, toolInput, toolOutput). |
| 14 | `Lead` | `leads` | Captured shopper leads (name, email, phone, notes, status: new/qualified/contacted, source). |
| 15 | `AnalyticsEvent` | `analytics_events` | Granular conversion tracking (widget_open, product_view, add_to_cart, purchase, lead_captured). |
| 16 | `UsageRecord` | `usage_records` | Token usage, conversation counts, and embedding calculations per billing period. |
| 17 | `Subscription` | `subscriptions` | Active subscription records (`free`, `starter`, `growth`, `pro`, status, period start/end). |
| 18 | `WidgetConfig` | `widget_configs` | Live chat widget branding (primaryColor, accentColor, welcomeMessage, assistantName, avatarUrl, position). |
| 19 | `BusinessSettings` | `business_settings` | AI prompt instructions, human handoff toggles, phone/email contact information. |
| 20 | `Team` | `teams` | Internal departments or functional units (Sales, Support, Clinic Staff, Wholesale). |
| 21 | `TeamMember` | `team_members` | Associates User to a Team with team roles (`team_admin`, `team_manager`, `team_member`). |
| 22 | `TeamPermission` | `team_permissions` | Granular RBAC actions per feature (view, create, edit, delete, manage_settings) assigned to a Team. |
| 23 | `TeamWebsiteAssignment` | `team_website_assignments` | Maps specific storefront domains or integrations to dedicated teams. |
| 24 | `Invitation` | `invitations` | Pending team invites with secure token hashes and expiration timestamps. |
| 25 | `Job` | `jobs` | Self-contained background queue for website scraping, embedding generation, and catalog sync. |
| 26 | `StaffSchedule` | `staff_schedules` | Weekly shift availability (dayOfWeek: 0-6, startTime: '09:00', endTime: '17:00'). |
| 27 | `Appointment` | `appointments` | Booked customer appointments with conflict prevention, customer contact details, and status. |

---

## 3. Pricing Tiers & Plan Entitlement Rules

All system quotas, AI capabilities, and integrations strictly follow this 4-tier model implemented in `src/lib/billing/entitlements.ts`:

```
┌────────────────────┬───────────┬──────────────────┬────────────────┬───────────────────────────┬──────────────────────────────────────┐
│ Tier Name          │ Price     │ Conversations/mo │ Websites Limit │ Active Integration Slots  │ Unlocked Features                    │
├────────────────────┼───────────┼──────────────────┼────────────────┼───────────────────────────┼──────────────────────────────────────┤
│ Free               │ $0/mo     │ 50 convos        │ 1 Domain       │ 1 Webhook Slot            │ Crawler, standard widget embed       │
│ Starter            │ $19/mo    │ 1,000 convos     │ 1 Domain       │ 2 Active Slots (Choose 2) │ Full sync, lead alerts, colors       │
│ Growth             │ $39/mo    │ 2,500 convos     │ Up to 3        │ 4 Active Slots (Choose 4) │ Shopify 1-click OAuth & webhooks     │
│ Pro (Pay As You Go)│ Usage-tier│ Unlimited        │ Unlimited      │ All Unlocked (Unlimited)  │ WhatsApp routing, VIP human handoff  │
└────────────────────┴───────────┴──────────────────┴────────────────┴───────────────────────────┴──────────────────────────────────────┘
```

### Integration Slot Rule Definition
- An **Active Integration Slot** is defined as `provider !== "website" && status === "active"`.
- Connected website domains are counted separately under `maxWebsites`.
- When a merchant reaches their slot limit (`usedSlots >= maxSlots`), the UI prevents adding new connectors and displays an interactive Upgrade Modal, while still allowing the merchant to manage, edit, test, pause, or disconnect existing integrations.

---

## 4. Frontend & Application Architecture

### 4.1 Public & Authentication Pages
- **Landing Page (`/`):** High-converting hero, interactive live widget preview, pricing comparison matrix, ROI calculator, and FAQ accordion. Fully dark/light mode responsive.
- **Registration (`/register`):** Streamlined onboarding. Removed website URL barrier during registration; replaced with master password and password confirmation. Redirects directly to dashboard for domain connection and setup.
- **Authentication (`/login`, `/forgot-password`, `/reset-password`):** Secure Supabase cookie session authentication with email password reset flow.
- **Team Invitation Acceptance (`/invite?token=...`):** Validates invitation token hashes, provisions team memberships, and redirects to dashboard.

### 4.2 Merchant Dashboard (`/dashboard/...`)
- **Overview (`/dashboard`):** High-level summary of active shopper sessions, conversation velocity, captured leads, conversion revenue, and pending booking requests.
- **Conversations (`/dashboard/conversations`):** Real-time inbox showing shopper sessions, message history, tool calls (product recommendations, calendar booking), and human operator handoff toggles.
- **Analytics & ROI (`/dashboard/analytics`):** Interactive charts showing conversion funnels, top recommended products, lead acquisition trends, and shopper engagement metrics.
- **Products & Catalog (`/dashboard/products`):** Full catalog management with variant support, pricing, inventory counters, image uploads, and status filters.
- **Knowledge Base (`/dashboard/knowledge`):** Webpage crawler, sitemap indexer, FAQ uploader, and manual document ingestion with real-time vector chunking status.
- **Appointments (`/dashboard/appointments`):** Calendar view for service appointments, staff assignment, scheduling adjustments, and customer contact tracking.
- **Leads & CRM (`/dashboard/leads`):** Searchable list of captured shopper leads with export functionality, conversion status tags, and direct customer details.
- **Team Management (`/dashboard/team`):** Organizational management supporting role assignment (`owner`, `admin`, `member`), custom teams (Sales, Support), and feature-level permission toggles.
- **Storefront Sync (`/dashboard/store`):** Shopify integration hub with OAuth handshake, product sync triggers, and webhook management.
- **Connected Websites (`/dashboard/integrations`):** Dedicated page for multi-domain management, CORS domain whitelisting, and copy-paste `<script>` embed snippets.
- **Billing & Plans (`/dashboard/billing`):** Plan management displaying the exact Free, Starter, Growth, and Pro Pay As You Go pricing tiers with Stripe Checkout redirection.
- **Settings (`/dashboard/settings`):** Tabbed settings center:
  - *General:* Business name, slug, phone, email, currency, timezone, profile editing.
  - *Store:* Store catalog options and safe disconnect protections.
  - *Team:* Team visibility and quick member links.
  - *Notifications:* Alert toggles for sales, leads, and weekly reports.
  - *Security:* Password update, session revocation, and security logs.
  - *Integrations Tab (BYO-Key Center):* Visual slot quota progress bar, categorized catalog (Slack, Discord, Gmail/SMTP, Google Calendar, Custom Webhooks, HubSpot, Shopify, WhatsApp), and interactive configuration drawer with live connection testing.

### 4.3 Embeddable Customer Chat Widget (`/widget` & embed script)
- **Floating Launcher:** Customizable position (`bottom-right` or `bottom-left`), brand colors, and greeting badge.
- **Adaptive UI:** Responsive drawer on mobile, floating bubble on desktop.
- **Dynamic Capabilities:**
  - Semantic product recommendations with price, image, and direct "Add to Cart" checkout links.
  - Conversational appointment booking wizard with live date/time slot picker.
  - In-chat lead capture form with instant validation.
  - Graceful human handoff fallback when shopper requests an operator.

---

## 5. Backend Architecture & API Engine

### 5.1 API Route Map (`/api/v1/...`)

| Endpoint | Method | Role & Description |
|---|---|---|
| `/api/v1/chat` | `POST` | Core shopper assistant endpoint. Orchestrates prompt building, semantic vector retrieval, tool calls, and streaming responses. |
| `/api/v1/leads` | `GET`, `POST` | Ingests new leads from widget and provides dashboard retrieval. Triggers `MerchantNotifier`. |
| `/api/v1/widget/config` | `GET` | Serves public widget configuration (colors, avatar, welcome message, enabled status) for a domain. |
| `/api/v1/widget/availability` | `GET` | Calculates bookable time slots for services and staff based on schedules and existing appointments. |
| `/api/v1/widget/book` | `POST` | Creates confirmed customer appointments with conflict locking and triggers instant notifications. |
| `/api/v1/widget/events` | `POST` | Logs granular shopper analytics events (widget opens, product views, add-to-carts). |
| `/api/v1/dashboard/settings` | `GET`, `POST` | Fetches and updates business settings, profile details, and notification toggles. |
| `/api/v1/dashboard/integrations` | `GET`, `POST`, `PATCH`, `DELETE` | Manages third-party BYO-Keys with AES-256-GCM encryption, slot quota enforcement, and team scoping. |
| `/api/v1/dashboard/integrations/test` | `POST` | Live connection diagnostic endpoint for Slack, Discord, Webhooks, HubSpot, Google Calendar, and SMTP. |
| `/api/v1/billing/checkout` | `POST` | Generates Stripe Checkout sessions mapped to specific plan codes. |
| `/api/v1/billing/webhook` | `POST` | Listens to Stripe lifecycle webhooks (`customer.subscription.created`, `updated`, `deleted`). |
| `/api/v1/integrations/shopify/auth` | `GET` | Initiates Shopify OAuth redirection flow with required API scopes. |
| `/api/v1/integrations/shopify/callback`| `GET` | Exchanges Shopify authorization code for permanent access token and schedules catalog sync. |
| `/api/v1/integrations/shopify/webhooks`| `POST` | Listens to real-time Shopify webhooks (`products/create`, `products/update`, `inventory/update`). |
| `/api/v1/jobs/process` | `POST` | Worker endpoint processing pending background crawl, embedding, or sync tasks from `jobs` table. |

### 5.2 Core Backend Subsystems

```
┌────────────────────────────────────────────────────────────────────────┐
│                          NE_Sale Backend Engine                         │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ Security & Crypto  │ AI & Retrieval     │ Notifications & Automation   │
│ - AES-256-GCM Auth │ - OpenRouter SDK   │ - Slack Blocks Formatter     │
│ - Rate Limiting    │ - pgvector Search  │ - Discord Embed Formatter    │
│ - Origin Checking  │ - Cosine Fallback  │ - HubSpot Contact Ingestion  │
│ - Team Permissions │ - Usage Metering   │ - Signed HMAC Webhooks       │
└────────────────────┴────────────────────┴──────────────────────────────┘
```

1. **Security & Cryptography (`src/lib/security/encryption.ts`):**
   - Implements AES-256-GCM authenticated encryption using Node's native `crypto`.
   - Every sensitive secret (Slack webhook, HubSpot token, SMTP password, WhatsApp token) is encrypted with a unique 12-byte initialization vector and validated with a 16-byte authentication tag.
   - Frontend masking utility prevents raw credentials from ever leaking to client components.
2. **AI Engine & Retrieval (`src/lib/ai/`):**
   - Multi-model OpenRouter gateway supporting streaming, automatic fallbacks, and rate-limit retry handling.
   - Vector Search with dual execution: native pgvector queries when supported, with automated in-memory cosine similarity fallback.
   - Heuristic fallback engine ensures the shopper always receives polite, accurate responses even during upstream AI gateway outages.
3. **Event Dispatcher (`src/lib/notifications/notifier.ts`):**
   - Whenever a shopper submits contact info or books an appointment, the system fetches all active integrations, decrypts credentials, filters by event triggers (`leadCaptured`, `appointmentBooked`), and dispatches formatted payloads in parallel to configured merchant destinations.
4. **Self-Contained Background Queue (`src/lib/jobs/queue.ts`):**
   - Zero-dependency queue stored directly in the `jobs` table. Eliminates the need for Redis, BullMQ, or Celery, making it 100% compliant with free Supabase and Vercel environments.

---

## 6. Static vs. Dynamic State Audit

To help prioritize next steps, here is the breakdown of what is currently **Dynamic** (connected to DB & live APIs) vs. **Static / Mocked**:

### What is 100% Dynamic & Production-Ready:
- **Authentication & Tenant Resolution:** Supabase Auth, cookie session parsing, multi-tenant resolution.
- **BYO-Key Integrations:** Encryption, database persistence, slot quota enforcement, live ping testing, and masked retrieval.
- **Runtime Notification Dispatch:** Live webhook delivery to Slack, Discord, custom webhooks, and HubSpot.
- **Product & Service Catalog:** Full database CRUD for products, variants, and services.
- **Appointments & Availability Engine:** Live calculation of available slots based on staff schedules and existing bookings, with conflict locking.
- **Lead Capture:** Real-time persistence to database and automatic notification routing.
- **Widget Customization:** Live loading of colors, branding, and assistant name from `widget_configs`.
- **Entitlements Gating:** Quota resolution across Free, Starter, Growth, and Pro tiers.

### What is Currently Simulated or Has Mocked Data:
- **Analytics Charts (`/dashboard/analytics`):** Metric cards display live DB numbers where available, but historical revenue graphs use synthetic sample time series data if the store is brand new.
- **Shopify 1-Click OAuth in Local Dev:** OAuth endpoints are fully implemented, but live syncing requires a live public HTTPS callback URL (e.g. ngrok or production Vercel domain).
- **Stripe Webhook in Sandbox:** Stripe customer checkout flow is wired, but requires live Stripe webhook signing secrets to advance subscription statuses automatically.

---

## 7. What We Did (Completed Work Log)

1. **Auth & Registration Flow Refactor:**
   - Removed the website URL requirement from the initial `/register` page to eliminate signup friction.
   - Added Master Password and Confirm Password fields with validation.
   - Relocated website and domain management into the dashboard (`/dashboard/integrations`).
2. **AES-256-GCM Security Engine:**
   - Built authenticated encryption, decryption, and secret masking routines with 100% test coverage.
3. **Unified Entitlements & Pricing Module:**
   - Enforced the exact Free ($0/50), Starter ($19/1,000/2 slots), Growth ($39/2,500/4 slots), and Pro Pay As You Go pricing structure.
   - Updated the billing UI and API limit gates.
4. **BYO-Key Integration Architecture:**
   - Built backend API endpoints for integrations with slot enforcement and team scoping.
   - Built live diagnostic tester endpoint supporting Slack, Discord, HubSpot, Google Calendar, and SMTP.
5. **Settings Integrations Center (UI/UX Pro Max):**
   - Built modular `IntegrationsSettingsTab` component with active quota progress bar, multi-category catalog, interactive setup drawer, live testing, and plan upgrade prompts.
6. **Runtime Event Dispatcher:**
   - Extended `MerchantNotifier` to query active BYO-keys, decrypt credentials, filter by event triggers, and broadcast leads and bookings in real-time.
7. **Verification & Testing:**
   - Verified 100% clean TypeScript build (`tsc --noEmit`).
   - Verified 100% passing test suite across all 13 test files (**102 tests green**).
   - Clean Git push to GitHub repository `origin/main`.

---

## 8. Strategic Roadmap: What We Should Do Next

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Recommended Next Steps                         │
├──────────────────────────┬───────────────────────┬─────────────────────┤
│ Phase 1: Launch Readiness│ Phase 2: Live Sync    │ Phase 3: AI Polish  │
│ - Supabase Auth Email    │ - Shopify App Listing │ - Voice & Audio     │
│ - Stripe Production Keys │ - Google Calendar sync│ - WhatsApp Cloud Bot│
│ - Cookie Domain / HTTPS  │ - Zapier Template App │ - Custom CSS Editor │
└──────────────────────────┴───────────────────────┴─────────────────────┘
```

### High Priority (Immediate Launch Preparation):
1. **Email Verification & Reset Delivery:** Wire production Resend or SendGrid API key so password reset and invitation acceptance emails dispatch automatically.
2. **Stripe Production Products & Webhook Binding:** Register the exact Stripe Price IDs for Starter ($19) and Growth ($39) and configure the Stripe CLI webhook listener for production testing.
3. **Production Domain & CORS Deployment:** Deploy to Vercel production domain and verify that cross-domain widget embedding works seamlessly on customer storefronts.

### Medium Priority (Enhanced Ecosystem):
1. **Google Calendar 2-Way Sync:** Add automatic creation of Google Calendar event invites with Google Meet links when an appointment is booked through the widget.
2. **Shopify Embedded App Bridge:** Package the widget and catalog sync as an unlisted or public Shopify App Store plugin so merchants can install it with 1 click from their Shopify admin.
3. **Public Zapier / Make Integration App:** Publish a pre-built Zapier Integration so merchants can connect NE_Sale events without writing webhook URLs.

---

## 9. What We Don't Need (Technical Debt & Pruning Guide)

To maintain a lean, high-performance SaaS without unnecessary complexity or recurring hosting costs:

1. **Do NOT add Redis / BullMQ:**
   - *Reason:* The built-in transactional `jobs` table in PostgreSQL handles background crawling, chunking, and sync jobs cleanly. Adding Redis increases infrastructure costs and complicates deployment on serverless environments.
2. **Do NOT add Heavy Document Parsers (Puppeteer / Chromium binaries on Vercel):**
   - *Reason:* Headless Chrome binaries frequently exceed Vercel's 50MB function size limit. The existing lightweight HTML parser and JSDOM crawler are fast, cost-effective, and stay well within serverless limits.
3. **Do NOT store unmasked credentials in browser storage:**
   - *Reason:* All sensitive keys must remain server-side and encrypted with AES-256-GCM. The client only ever receives masked tokens (`••••1234`).
4. **Avoid redundant third-party libraries for state management:**
   - *Reason:* Next.js App Router with React Server Components and lightweight React hooks (`useState`, `useEffect`) keep the client bundle size under 150KB. Redux, MobX, or heavy global stores are unnecessary.

---

## 10. Environment Variable Reference (Zero Secrets Exposed)

The application references the following environment variables across subsystems:

```bash
# Database & Persistence (Supabase / Postgres)
DATABASE_URL=                    # Pooled connection string for Prisma ORM
DIRECT_URL=                      # Direct TCP connection string for Prisma migrations

# Supabase Authentication
NEXT_PUBLIC_SUPABASE_URL=        # Public Supabase project API URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # Public anonymous API key for client auth
SUPABASE_SERVICE_ROLE_KEY=       # Private administrative service role key

# Security & Encryption Engine
ENCRYPTION_MASTER_KEY=           # 32-byte hexadecimal key for AES-256-GCM credential encryption

# AI Shopper Engine (OpenRouter)
OPENROUTER_API_KEY=              # Gateway API key for AI chat completions
AI_DEFAULT_MODEL=                # Primary model (e.g., anthropic/claude-3.5-sonnet)
AI_FALLBACK_MODEL=               # Secondary model for automatic rate-limit failover

# Billing & Subscriptions (Stripe)
STRIPE_SECRET_KEY=               # Private Stripe API secret
STRIPE_WEBHOOK_SECRET=           # Webhook signature verification secret
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY= # Public publishable key for client elements

# Shopify App Integration
SHOPIFY_API_KEY=                 # Shopify App Client ID
SHOPIFY_API_SECRET=              # Shopify App Client Secret
SHOPIFY_SCOPES=                  # Required scopes (read_products, read_inventory, etc.)
SHOPIFY_APP_URL=                 # Public HTTPS URL of the application for OAuth callbacks

# Email Notifications (Resend / SendGrid / SMTP)
RESEND_API_KEY=                  # Transactional email API key
NOTIFICATION_FROM_EMAIL=         # Sender email address for system alerts

# Application Environment
NEXT_PUBLIC_APP_URL=             # Root URL (e.g., https://ne-sale.vercel.app or http://localhost:3000)
NODE_ENV=                        # development | production | test
```
