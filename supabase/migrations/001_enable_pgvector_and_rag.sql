-- ==============================================================================
-- Migration: Enable pgvector and RAG infrastructure for knowledge chunks
-- ==============================================================================
-- Run this in your Supabase SQL Editor.
-- ==============================================================================

-- 1. Enable pgvector extension (requires postgres superuser)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Add embedding_model column if it does not exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_chunks' AND column_name = 'embedding_model'
  ) THEN
    ALTER TABLE knowledge_chunks ADD COLUMN embedding_model TEXT;
  END IF;
END $$;

-- 3. Alter embedding column from text to vector(768)
--    Existing text values like "[0.1,0.2,...]" are cast automatically.
ALTER TABLE knowledge_chunks
  ALTER COLUMN embedding TYPE vector(768)
  USING embedding::vector;

-- 4. Create HNSW index for cosine similarity search
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding_cosine
  ON knowledge_chunks USING hnsw (embedding vector_cosine_ops);

-- 5. Create composite index for tenant-scoped retrieval
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_business_embedding
  ON knowledge_chunks (business_id, embedding);

-- 6. Enable Row Level Security on knowledge tables
ALTER TABLE knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_chunks ENABLE ROW LEVEL SECURITY;

-- 7. RLS policies: tenants can only access their own knowledge sources/chunks
--    These assume a `business_id` column exists and app sets `app.current_business_id`
--    via `SET LOCAL app.current_business_id = '...'` before queries, or uses
--    application-level filtering (already implemented in route handlers).

DO $$
BEGIN
  -- knowledge_sources: select/insert/update/delete only own business
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_sources' AND policyname = 'tenant_isolation_select'
  ) THEN
    CREATE POLICY tenant_isolation_select ON knowledge_sources
      FOR SELECT TO authenticated
      USING (business_id = current_setting('app.current_business_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_sources' AND policyname = 'tenant_isolation_insert'
  ) THEN
    CREATE POLICY tenant_isolation_insert ON knowledge_sources
      FOR INSERT TO authenticated
      WITH CHECK (business_id = current_setting('app.current_business_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_sources' AND policyname = 'tenant_isolation_update'
  ) THEN
    CREATE POLICY tenant_isolation_update ON knowledge_sources
      FOR UPDATE TO authenticated
      USING (business_id = current_setting('app.current_business_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_sources' AND policyname = 'tenant_isolation_delete'
  ) THEN
    CREATE POLICY tenant_isolation_delete ON knowledge_sources
      FOR DELETE TO authenticated
      USING (business_id = current_setting('app.current_business_id', true));
  END IF;

  -- knowledge_chunks: same tenant isolation
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_chunks' AND policyname = 'tenant_isolation_select'
  ) THEN
    CREATE POLICY tenant_isolation_select ON knowledge_chunks
      FOR SELECT TO authenticated
      USING (business_id = current_setting('app.current_business_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_chunks' AND policyname = 'tenant_isolation_insert'
  ) THEN
    CREATE POLICY tenant_isolation_insert ON knowledge_chunks
      FOR INSERT TO authenticated
      WITH CHECK (business_id = current_setting('app.current_business_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_chunks' AND policyname = 'tenant_isolation_update'
  ) THEN
    CREATE POLICY tenant_isolation_update ON knowledge_chunks
      FOR UPDATE TO authenticated
      USING (business_id = current_setting('app.current_business_id', true));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'knowledge_chunks' AND policyname = 'tenant_isolation_delete'
  ) THEN
    CREATE POLICY tenant_isolation_delete ON knowledge_chunks
      FOR DELETE TO authenticated
      USING (business_id = current_setting('app.current_business_id', true));
  END IF;
END $$;

-- ==============================================================================
-- End of migration
-- ==============================================================================
