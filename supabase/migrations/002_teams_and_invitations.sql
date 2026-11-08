-- 002_teams_and_invitations.sql
-- Creates Team Management + Invitation tables and team_id columns.
-- IMPORTANT: This intentionally does NOT touch knowledge_chunks.embedding or its
-- vector indexes. Do not replace this with `prisma db push`, which would convert
-- the pgvector column to TEXT and drop the HNSW/ivfflat indexes.
--
-- Apply with:
--   npx prisma db execute --file supabase/migrations/002_teams_and_invitations.sql

-- ---------------------------------------------------------------------------
-- 1. Core team tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "teams" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" TEXT NOT NULL DEFAULT 'custom',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "team_members" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'team_member',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "team_members_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "team_permissions" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "feature" TEXT NOT NULL,
    "actions" JSONB DEFAULT '[]',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "team_permissions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "team_website_assignments" (
    "id" TEXT NOT NULL,
    "team_id" TEXT NOT NULL,
    "integration_id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "assigned_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "assigned_by" TEXT,
    CONSTRAINT "team_website_assignments_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 2. Invitations
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "invitations" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "team_id" TEXT,
    "email" TEXT NOT NULL,
    "token_hash" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'team_member',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "invited_by_id" TEXT NOT NULL,
    "accepted_by_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- ---------------------------------------------------------------------------
-- 3. team_id columns on tenant-scoped tables
-- ---------------------------------------------------------------------------

ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "conversations" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "integrations" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "knowledge_chunks" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "knowledge_sources" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "leads" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "locations" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "messages" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "product_variants" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "team_id" TEXT;
ALTER TABLE "staff" ADD COLUMN IF NOT EXISTS "team_id" TEXT;

-- ---------------------------------------------------------------------------
-- 4. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS "teams_business_id_idx" ON "teams"("business_id");

CREATE INDEX IF NOT EXISTS "team_members_business_id_idx" ON "team_members"("business_id");
CREATE INDEX IF NOT EXISTS "team_members_user_id_idx" ON "team_members"("user_id");
CREATE INDEX IF NOT EXISTS "team_members_team_id_idx" ON "team_members"("team_id");
CREATE UNIQUE INDEX IF NOT EXISTS "team_members_team_id_user_id_key" ON "team_members"("team_id", "user_id");

CREATE INDEX IF NOT EXISTS "team_permissions_team_id_idx" ON "team_permissions"("team_id");
CREATE UNIQUE INDEX IF NOT EXISTS "team_permissions_team_id_feature_key" ON "team_permissions"("team_id", "feature");

CREATE INDEX IF NOT EXISTS "team_website_assignments_team_id_idx" ON "team_website_assignments"("team_id");
CREATE INDEX IF NOT EXISTS "team_website_assignments_integration_id_idx" ON "team_website_assignments"("integration_id");
CREATE UNIQUE INDEX IF NOT EXISTS "team_website_assignments_team_id_integration_id_key" ON "team_website_assignments"("team_id", "integration_id");

CREATE INDEX IF NOT EXISTS "invitations_business_id_idx" ON "invitations"("business_id");
CREATE INDEX IF NOT EXISTS "invitations_team_id_idx" ON "invitations"("team_id");
CREATE INDEX IF NOT EXISTS "invitations_token_hash_idx" ON "invitations"("token_hash");
CREATE INDEX IF NOT EXISTS "invitations_expires_at_idx" ON "invitations"("expires_at");
CREATE INDEX IF NOT EXISTS "invitations_status_idx" ON "invitations"("status");
CREATE UNIQUE INDEX IF NOT EXISTS "invitations_email_team_id_key" ON "invitations"("email", "team_id");

CREATE INDEX IF NOT EXISTS "analytics_events_team_id_idx" ON "analytics_events"("team_id");
CREATE INDEX IF NOT EXISTS "conversations_team_id_idx" ON "conversations"("team_id");
CREATE INDEX IF NOT EXISTS "integrations_team_id_idx" ON "integrations"("team_id");
CREATE INDEX IF NOT EXISTS "knowledge_chunks_team_id_idx" ON "knowledge_chunks"("team_id");
CREATE INDEX IF NOT EXISTS "knowledge_sources_team_id_idx" ON "knowledge_sources"("team_id");
CREATE INDEX IF NOT EXISTS "leads_team_id_idx" ON "leads"("team_id");
CREATE INDEX IF NOT EXISTS "locations_team_id_idx" ON "locations"("team_id");
CREATE INDEX IF NOT EXISTS "messages_team_id_idx" ON "messages"("team_id");
CREATE INDEX IF NOT EXISTS "product_variants_team_id_idx" ON "product_variants"("team_id");
CREATE INDEX IF NOT EXISTS "products_team_id_idx" ON "products"("team_id");
CREATE INDEX IF NOT EXISTS "services_team_id_idx" ON "services"("team_id");
CREATE INDEX IF NOT EXISTS "staff_team_id_idx" ON "staff"("team_id");

-- ---------------------------------------------------------------------------
-- 5. Foreign keys (guarded so the migration is idempotent)
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'teams_business_id_fkey') THEN
    ALTER TABLE "teams" ADD CONSTRAINT "teams_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_team_id_fkey') THEN
    ALTER TABLE "team_members" ADD CONSTRAINT "team_members_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_user_id_fkey') THEN
    ALTER TABLE "team_members" ADD CONSTRAINT "team_members_user_id_fkey"
      FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_members_business_id_fkey') THEN
    ALTER TABLE "team_members" ADD CONSTRAINT "team_members_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_permissions_team_id_fkey') THEN
    ALTER TABLE "team_permissions" ADD CONSTRAINT "team_permissions_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_website_assignments_team_id_fkey') THEN
    ALTER TABLE "team_website_assignments" ADD CONSTRAINT "team_website_assignments_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_website_assignments_integration_id_fkey') THEN
    ALTER TABLE "team_website_assignments" ADD CONSTRAINT "team_website_assignments_integration_id_fkey"
      FOREIGN KEY ("integration_id") REFERENCES "integrations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'team_website_assignments_business_id_fkey') THEN
    ALTER TABLE "team_website_assignments" ADD CONSTRAINT "team_website_assignments_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_business_id_fkey') THEN
    ALTER TABLE "invitations" ADD CONSTRAINT "invitations_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_team_id_fkey') THEN
    ALTER TABLE "invitations" ADD CONSTRAINT "invitations_team_id_fkey"
      FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_invited_by_id_fkey') THEN
    ALTER TABLE "invitations" ADD CONSTRAINT "invitations_invited_by_id_fkey"
      FOREIGN KEY ("invited_by_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'invitations_accepted_by_id_fkey') THEN
    ALTER TABLE "invitations" ADD CONSTRAINT "invitations_accepted_by_id_fkey"
      FOREIGN KEY ("accepted_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
