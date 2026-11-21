# NE_SALE — MASTER PRODUCTION EXECUTION INSTRUCTION

## 0. Role

You are the primary coding agent responsible for taking the existing **NE_Sale** codebase from its current implementation state to a genuinely production-ready, commercially usable SaaS.

Do not treat this as a greenfield rewrite.

Your job is to:

1. Inspect the existing repository before changing code.
2. Preserve working architecture and features.
3. Remove demo/mock behavior that can misrepresent real business performance.
4. Complete unfinished production-critical flows.
5. Fix security, tenant-isolation, billing, reliability, UX, and operational gaps.
6. Test every meaningful change.
7. Avoid unnecessary infrastructure and feature expansion.

**Source of truth:** the repository code is authoritative for current implementation. The project-state document below is the planning/context source and may contain claims that must be verified against the actual code.

---

# 1. PRODUCT CONTEXT

NE_Sale is a multi-tenant AI Shopper Assistant and Conversion Automation SaaS.

Primary use cases:

- Ecommerce stores: shopper guidance, product recommendations, inventory-aware assistance, add-to-cart conversion.
- Local/service businesses: lead capture and appointment booking.
- Multi-domain merchants: website widget deployment, integrations, team-scoped notifications.

The core business funnel is:

**Visitor → Widget → Conversation → Recommendation / Assistance → Lead / Add-to-Cart / Booking → Conversion → Revenue attribution → Merchant ROI**

Every major product decision should improve one or more of:

- activation
- engagement
- conversion
- retention
- revenue
- reliability
- trust

Do not expand the product into unrelated features unless required for these goals.

---

# 2. CURRENT TECHNICAL CONTEXT

The project-state document describes the stack as:

- Next.js 16 / App Router
- React 19
- TypeScript strict
- PostgreSQL
- Prisma ORM 7
- Supabase / Neon compatible database
- Tailwind CSS 4
- Supabase authentication
- AES-256-GCM encryption for sensitive integration credentials
- Vitest
- Vercel-oriented deployment
- pgvector/vector retrieval
- OpenRouter-based AI gateway

The described Prisma model set includes:

Business, User, BusinessMember, Integration, Product, ProductVariant, Service, Staff, Location, KnowledgeSource, KnowledgeChunk, Conversation, Message, Lead, AnalyticsEvent, UsageRecord, Subscription, WidgetConfig, BusinessSettings, Team, TeamMember, TeamPermission, TeamWebsiteAssignment, Invitation, Job, StaffSchedule, Appointment.

**Important:** Verify the actual current schema and source before relying on this list. Do not blindly modify the architecture because a document says something exists.

---

# 3. THE MAIN GOAL

Make NE_Sale feel and behave like a real paid SaaS rather than a demo.

A production user should be able to:

1. Sign up.
2. Verify/access their account.
3. Create or enter their business.
4. Complete onboarding.
5. Connect a website/store.
6. Configure the AI assistant.
7. Install the widget.
8. Receive real shopper conversations.
9. Capture real leads / bookings / commerce events.
10. View accurate dashboard analytics.
11. Select and pay for a plan.
12. Be correctly limited according to entitlement.
13. Upgrade, downgrade, cancel, or recover from billing events.
14. Invite/manage team members.
15. Configure integrations.
16. Trust that tenant data is isolated and secrets are protected.

No fake success states.

No fake revenue.

No hardcoded business metrics presented as real.

No placeholder buttons that appear functional but do nothing.

---

# 4. FIRST ACTION — FULL REPOSITORY AUDIT

Before making significant changes:

## Inspect

- `package.json`
- `prisma/schema.prisma`
- migrations
- `src/app/**`
- `src/components/**`
- `src/lib/**`
- API routes
- authentication/session helpers
- billing/entitlement logic
- widget/embed implementation
- analytics implementation
- integrations
- background jobs
- tests
- environment-variable usage
- deployment configuration
- middleware
- error/loading/empty states

Search the entire repository for:

- TODO
- FIXME
- mock
- mocked
- demo
- sample
- fake
- synthetic
- placeholder
- hardcoded
- temporary
- coming soon
- lorem
- test-only
- console.log
- disabled buttons
- static arrays
- generated sample data

For each finding, classify it:

- **P0 — launch blocker**
- **P1 — important production issue**
- **P2 — polish / future work**
- **Intentional behavior — keep**

Do not automatically delete something just because it contains the word "mock"; verify how it is used.

---

# 5. PRIORITY ORDER

## P0 — MUST FIX BEFORE SERIOUS PRODUCTION LAUNCH

### P0.1 Remove misleading demo/static business data

Dashboard and analytics must never present synthetic data as actual merchant performance.

If there is insufficient historical data:

- show an honest empty state
- show "not enough data yet"
- show zero where zero is correct
- show the actual available period
- explain how to generate more data

Do not fabricate historical revenue, conversions, customers, or growth.

Synthetic demo data may exist only in clearly isolated development/test fixtures.

---

### P0.2 Establish one authoritative billing source of truth

Pricing, entitlements, limits, checkout, UI plan display, and server enforcement must all derive from the same canonical configuration.

The project-state document describes:

- Free — $0/month — 50 conversations
- Starter — $19/month — 1,000 conversations
- Growth — $39/month — 2,500 conversations
- Pro — usage-tier

It also describes website and integration-slot limits.

Verify these values against the current code and product decision before changing them.

Requirements:

- no duplicated pricing constants
- no client-only entitlement enforcement
- server must enforce limits
- checkout must map to correct plan/price
- subscription status must update from verified billing events
- upgrade/downgrade/cancel states must be consistent
- failed payments must be handled safely
- webhook processing must be idempotent

Never trust client-submitted plan names or prices.

---

### P0.3 Tenant isolation and authorization

Every tenant-owned resource must be scoped to the authenticated business/tenant.

Audit:

- database queries
- API routes
- server actions
- dashboard pages
- widget APIs
- integration APIs
- leads
- conversations
- messages
- analytics
- products
- services
- appointments
- knowledge sources/chunks
- teams
- invitations
- billing records

A user from Business A must never be able to read or mutate Business B's data by changing:

- IDs
- URLs
- request bodies
- query parameters
- headers
- widget parameters

Authorization must happen server-side.

---

### P0.4 Widget security

The public widget must be safe to embed cross-domain.

Audit:

- allowed origins
- domain ownership/verification
- CORS
- rate limiting
- abuse prevention
- public configuration exposure
- API authentication boundaries
- secret exposure
- prompt injection risks
- spam lead submission
- appointment abuse
- event flooding

Never expose:

- database credentials
- service-role keys
- integration secrets
- encryption keys
- private API credentials

The browser may receive only data that is intentionally public.

---

### P0.5 Production authentication

Verify the complete lifecycle:

- registration
- login
- logout
- session persistence
- email verification
- password reset
- expired/invalid reset links
- invitation acceptance
- session revocation
- protected routes
- unauthorized redirects

Production email delivery must not depend on local development configuration.

The project-state document specifically identifies production email verification/reset delivery as a launch task.

---

### P0.6 Real analytics

The analytics system should be based on actual recorded events.

The project-state document lists events such as:

- widget_open
- product_view
- add_to_cart
- purchase
- lead_captured

Verify which events actually exist and are emitted.

Build the funnel from persisted events rather than fabricated chart data.

Important:

**Revenue attribution must be honest.**

If NE_Sale cannot verify purchase revenue, do not label estimated values as actual revenue.

Use clear labels such as:

- tracked revenue
- attributed revenue
- estimated value
- unavailable

only when technically justified.

---

# 6. P1 — IMPORTANT AFTER P0

## P1.1 Onboarding

Create a short, useful onboarding path:

1. Business details
2. Business type
3. Website/store connection
4. AI assistant setup
5. Widget installation
6. Test conversation
7. First lead/conversion
8. Analytics explanation

Do not force unnecessary setup steps before the user can experience value.

The first meaningful activation event should happen quickly.

---

## P1.2 Widget configuration

The widget should allow legitimate merchant customization without becoming an over-engineered CSS editor.

Prioritize:

- brand color
- assistant name
- welcome message
- avatar
- position
- enable/disable
- domain association
- test mode
- embed instructions

Keep configuration server-backed and tenant-scoped.

---

## P1.3 AI shopper flow

Verify the complete flow:

**visitor → conversation → retrieval → tool call → response → event → lead/conversion**

Audit:

- system prompts
- business context
- knowledge retrieval
- product retrieval
- service retrieval
- tool validation
- rate limits
- usage metering
- fallback behavior
- model failure handling
- prompt injection resistance
- token/cost controls

AI must not invent:

- products
- prices
- inventory
- appointment availability
- business policies
- discounts
- contact details

If source data is unavailable, the assistant should say so rather than hallucinate.

---

## P1.4 Knowledge ingestion

Verify:

- URL crawling
- sitemap handling
- chunking
- embeddings
- indexing
- ingestion status
- retries
- duplicate detection
- stale content handling
- deletion/reindexing

Do not make the merchant believe knowledge is ready when ingestion is still pending or failed.

---

## P1.5 Background jobs

The project-state document describes a PostgreSQL `jobs` table approach.

Do not introduce Redis/BullMQ merely because it is familiar.

First verify whether the existing queue is reliable enough for the current deployment model.

Audit:

- locking
- retries
- stuck jobs
- duplicate processing
- failure states
- timeouts
- observability
- concurrency

Only replace the queue if there is evidence that the current architecture cannot meet production requirements.

---

## P1.6 Leads

Lead capture should provide:

- validation
- duplicate handling
- persistence
- source tracking
- notification
- status lifecycle
- dashboard visibility
- export

Notifications must not silently fail.

---

## P1.7 Appointments

Verify:

- availability calculation
- timezone handling
- staff schedules
- conflict prevention
- race conditions
- cancellation/rescheduling
- customer confirmation
- merchant notification

Never show a slot as available after it has already been booked.

---

## P1.8 Integrations

Prioritize reliability over integration count.

Each integration should have:

- connection status
- secure secret storage
- test connection
- useful error message
- reconnect flow
- disconnect flow
- event trigger configuration
- last successful sync/delivery where applicable

Do not build ten more integrations before the existing ones are reliable.

---

# 7. P1 BILLING DETAILS

Audit the full Stripe lifecycle:

### Checkout

- correct product/price
- authenticated merchant
- correct business association
- successful redirect
- cancelled checkout handling

### Webhooks

- signature verification
- idempotency
- event ordering
- subscription created
- subscription updated
- subscription deleted/cancelled
- payment failure
- renewal
- plan changes

### Entitlements

Server-side entitlement checks must be applied to:

- conversations
- websites
- integrations
- AI usage
- other metered capabilities

Never rely on hiding a UI button as the only enforcement.

---

# 8. P1 DASHBOARD QUALITY

Every dashboard page should have correct:

- loading state
- empty state
- error state
- success feedback
- disabled state
- optimistic state where appropriate
- permission handling

No dead buttons.

No links to unfinished pages.

No "coming soon" UI for functionality that is presented as available.

If a feature is intentionally unavailable, make that explicit.

---

# 9. TEAM / RBAC

Verify:

- owner
- admin
- member
- team roles
- feature permissions
- invitation expiration
- invitation token security
- membership removal
- role changes
- least-privilege enforcement

Authorization must be enforced on the server.

UI permission checks are not security.

---

# 10. SECURITY REVIEW

Audit for:

- IDOR
- broken access control
- insecure direct object references
- secret leakage
- XSS
- CSRF where applicable
- SSRF
- unsafe URL fetching
- webhook spoofing
- replay attacks
- rate-limit bypass
- prompt injection
- SQL injection
- unsafe file handling
- excessive error disclosure
- insecure cookies
- insecure CORS
- sensitive logging

Use existing AES-256-GCM credential encryption architecture where appropriate.

Do not downgrade security to simplify implementation.

---

# 11. OBSERVABILITY

Production needs enough visibility to answer:

- What failed?
- For which business?
- For which endpoint?
- When?
- How often?
- Was the user affected?
- Did a webhook fail?
- Did an AI request fail?
- Did a job get stuck?
- Did billing fail?

Add structured server-side logging where appropriate.

Do not log secrets, full credentials, sensitive customer data, or unnecessary personal information.

---

# 12. PERFORMANCE

Do not optimize blindly.

First identify actual bottlenecks.

Pay attention to:

- N+1 database queries
- unnecessary client rendering
- oversized API responses
- repeated vector searches
- repeated AI calls
- analytics aggregation
- expensive dashboard queries
- widget load time
- serverless execution time

Keep the customer-facing widget lightweight.

---

# 13. PRIVACY / DATA LIFECYCLE

Verify that merchants can understand and manage their data.

Consider:

- data retention
- deletion
- export
- customer data handling
- consent
- analytics tracking disclosure
- privacy policy
- terms
- third-party processors
- integration credential handling

Do not claim legal compliance unless the implementation has actually been reviewed for the relevant jurisdiction.

---

# 14. WHAT TO REMOVE / DEPRIORITIZE

Do NOT spend the next development cycle on:

- voice/audio
- advanced voice agents
- giant custom CSS editor
- excessive integrations
- white-label enterprise platform
- complex Redis/BullMQ infrastructure without evidence of need
- unnecessary state-management libraries
- cosmetic redesigns that do not improve conversion/usability
- speculative AI features
- large enterprise feature sets
- features that do not improve activation, conversion, retention, or revenue

The project-state document specifically recommends avoiding unnecessary Redis/BullMQ, heavy browser binaries such as Puppeteer/Chromium on Vercel, client-side credential storage, and redundant state-management libraries.

Preserve this lean architecture unless real requirements prove otherwise.

---

# 15. BUSINESS PRIORITY

The product should be positioned around a concrete outcome:

## AI Sales & Conversion Agent for Your Website

The product should make the merchant understand:

> "NE_Sale helps turn website visitors into conversations, leads, bookings, carts, and sales."

The dashboard should therefore emphasize:

- conversations
- qualified leads
- recommendations
- bookings
- add-to-cart
- conversions
- attributed revenue when verifiable
- conversion rate
- assistant performance
- ROI

Avoid making the dashboard feel like a generic chatbot administration panel.

---

# 16. PRODUCT METRICS

Track the product funnel:

### Activation

- signup completed
- business created
- website connected
- widget installed
- first conversation

### Engagement

- conversations
- messages
- recommendations
- product views
- bookings
- lead captures

### Conversion

- add-to-cart
- purchase events
- booked appointments
- qualified leads
- conversion rate

### Retention

- returning merchants
- active widgets
- weekly conversations
- recurring integrations

### Revenue

- subscriptions
- upgrades
- cancellations
- successful payments
- usage where applicable

Do not invent metrics that cannot be measured.

---

# 17. TESTING REQUIREMENTS

Before considering a task complete:

## TypeScript

Run the project's type checker.

Expected target:

- zero TypeScript errors.

## Unit tests

Run the existing test suite.

Do not delete tests merely to make CI green.

## Integration tests

Test important API/database flows.

## Security tests

At minimum verify:

- cross-tenant access denied
- unauthorized requests denied
- invalid webhook signatures rejected
- secrets not returned to clients
- entitlement bypasses blocked

## Billing tests

Test:

- checkout
- webhook
- subscription activation
- upgrade
- downgrade
- cancellation
- failed payment
- idempotent webhook processing

## Widget tests

Test:

- valid domain
- invalid domain
- mobile
- desktop
- API failure
- AI failure
- rate limiting
- lead capture
- booking

## Regression

Do not break existing working features while fixing another subsystem.

---

# 18. IMPLEMENTATION WORKFLOW

Do NOT attempt a giant blind rewrite.

Use this order:

### Phase A — Audit

Produce:

- confirmed issues
- inferred issues
- files involved
- severity
- dependencies
- recommended fix order

### Phase B — P0 fixes

Implement only launch-critical fixes.

Then run:

- typecheck
- tests
- targeted verification

### Phase C — P1 fixes

Implement important production improvements.

Then run:

- typecheck
- tests
- targeted verification

### Phase D — P2

Only after the core product is reliable.

### Phase E — Final production audit

Re-scan the entire repository.

Search again for:

- mock
- fake
- demo
- placeholder
- TODO
- FIXME
- hardcoded metrics
- insecure secrets
- unscoped database queries
- unfinished buttons/routes

---

# 19. CODE CHANGE RULES

1. Prefer small, focused changes.
2. Reuse existing utilities.
3. Do not duplicate billing logic.
4. Do not duplicate authorization logic.
5. Do not introduce unnecessary dependencies.
6. Do not rewrite stable modules without reason.
7. Do not remove tests.
8. Do not disable security controls to make a feature work.
9. Do not silently change pricing.
10. Do not silently change database semantics.
11. Do not fabricate data.
12. Do not expose secrets.
13. Do not make production behavior depend on development-only data.
14. Preserve backward compatibility where reasonable.
15. Explain any architecture change that materially increases complexity or cost.

---

# 20. DEFINITION OF DONE

NE_Sale is not "production ready" merely because it builds.

It is production ready when:

- authentication works reliably
- tenant isolation is verified
- authorization is server-enforced
- widget embedding works on real domains
- AI responses use real merchant data
- lead capture works
- appointment booking is reliable
- analytics reflect real events
- no fake metrics are shown as real
- billing works with verified Stripe webhooks
- entitlements are enforced server-side
- integration secrets are protected
- production email works
- errors are observable
- loading/empty/error states are complete
- important flows have tests
- deployment configuration is correct
- there are no critical unfinished user-facing flows
- merchants can understand the value of the product

---

# 21. IMPORTANT SOURCE-CONTEXT NOTES

The supplied project-state document claims that:

- authentication and tenant resolution are dynamic
- BYO-key integrations are implemented
- products/services are dynamic
- appointments/availability are implemented
- lead capture is implemented
- widget customization is implemented
- entitlements are implemented
- analytics may contain synthetic historical revenue data for new stores
- Shopify OAuth requires public HTTPS for live operation
- Stripe webhook automation requires production webhook configuration

Treat these as **claims to verify against the repository**, not as permission to assume the implementation is correct.

The document also identifies these immediate launch tasks:

1. production email verification/reset delivery
2. Stripe production products and webhook binding
3. production domain/CORS/widget embedding verification

Prioritize these after verifying the code.

---

# 22. IMPORTANT: DO NOT OVERBUILD

The goal is not to make the codebase bigger.

The goal is to make the existing product:

**real → reliable → secure → measurable → sellable**

If an existing implementation already satisfies a requirement, keep it.

If something is incomplete, finish it.

If something is fake/demo-only, remove it or isolate it to development/test.

If something is unnecessary, do not build it.

If something is uncertain, inspect the source and state the uncertainty rather than inventing an answer.

---

# 23. FINAL AGENT REPORT

At the end of each implementation phase, report:

## Changed

List actual files/modules changed.

## Fixed

List actual problems resolved.

## Verified

List commands/tests/checks run and their results.

## Remaining

List unresolved issues.

## Risks

List anything that could affect production.

## Next Priority

Give the next 3 highest-value tasks only.

Do not claim "production ready" unless the acceptance criteria above have actually been verified.

