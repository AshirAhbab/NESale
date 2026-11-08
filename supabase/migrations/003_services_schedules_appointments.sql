-- 003_services_schedules_appointments.sql
-- Consolidates business types to ecommerce | services and adds native booking.
-- Apply with:
--   npx prisma db execute --file supabase/migrations/003_services_schedules_appointments.sql

-- 1. Business subtype (restaurant, clinic, trade, professional, salon, other)
ALTER TABLE "businesses" ADD COLUMN IF NOT EXISTS "business_subtype" TEXT;

-- 2. Normalize legacy business types into the two supported categories
UPDATE "businesses"
SET "business_type" = 'services'
WHERE "business_type" IN (
  'local_service', 'professional', 'appointments', 'healthcare', 'service', 'provider'
);

UPDATE "businesses"
SET "business_type" = 'ecommerce'
WHERE "business_type" IS NULL OR "business_type" NOT IN ('ecommerce', 'services');

-- Basic hygiene: subtype only makes sense for services tenants
UPDATE "businesses"
SET "business_subtype" = 'other'
WHERE "business_type" = 'services' AND "business_subtype" IS NULL;

UPDATE "businesses"
SET "business_subtype" = NULL
WHERE "business_type" = 'ecommerce';

-- 3. Weekly schedules
CREATE TABLE IF NOT EXISTS "staff_schedules" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "staff_id" TEXT,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "staff_schedules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "staff_schedules_business_id_idx" ON "staff_schedules"("business_id");
CREATE INDEX IF NOT EXISTS "staff_schedules_staff_id_idx" ON "staff_schedules"("staff_id");

-- 4. Appointments
CREATE TABLE IF NOT EXISTS "appointments" (
    "id" TEXT NOT NULL,
    "business_id" TEXT NOT NULL,
    "team_id" TEXT,
    "service_id" TEXT,
    "staff_id" TEXT,
    "customer_name" TEXT NOT NULL,
    "customer_email" TEXT,
    "customer_phone" TEXT,
    "start_at" TIMESTAMP(3) NOT NULL,
    "end_at" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "source" TEXT NOT NULL DEFAULT 'dashboard',
    "notes" TEXT,
    "conversation_id" TEXT,
    "metadata" JSONB DEFAULT '{}',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "appointments_business_id_start_at_idx" ON "appointments"("business_id", "start_at");
CREATE INDEX IF NOT EXISTS "appointments_team_id_idx" ON "appointments"("team_id");
CREATE INDEX IF NOT EXISTS "appointments_service_id_idx" ON "appointments"("service_id");
CREATE INDEX IF NOT EXISTS "appointments_staff_id_idx" ON "appointments"("staff_id");
CREATE INDEX IF NOT EXISTS "appointments_status_idx" ON "appointments"("status");

-- 5. Foreign keys (idempotent)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_schedules_business_id_fkey') THEN
    ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'staff_schedules_staff_id_fkey') THEN
    ALTER TABLE "staff_schedules" ADD CONSTRAINT "staff_schedules_staff_id_fkey"
      FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_business_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_business_id_fkey"
      FOREIGN KEY ("business_id") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_service_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_service_id_fkey"
      FOREIGN KEY ("service_id") REFERENCES "services"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'appointments_staff_id_fkey') THEN
    ALTER TABLE "appointments" ADD CONSTRAINT "appointments_staff_id_fkey"
      FOREIGN KEY ("staff_id") REFERENCES "staff"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
