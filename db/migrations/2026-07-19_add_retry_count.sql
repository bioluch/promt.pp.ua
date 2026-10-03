-- ============================================================
-- Migration: add retry_count to scheduled_jobs
-- Bounds transient (503/429 overload) auto-retries so an
-- overloaded provider cannot cause an infinite 30-min retry loop.
-- Reset to 0 whenever a run completes (success or permanent fail).
-- ============================================================
ALTER TABLE scheduled_jobs
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;
