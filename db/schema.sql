-- ============================================================
-- JS PROMPT v2 — PostgreSQL Database Schema
-- Debian 12 · PostgreSQL 15+
-- Run as superuser: psql -U postgres -f schema.sql
-- ============================================================

-- ── 1. DATABASE & ROLE ──────────────────────────────────────
CREATE DATABASE jsprompt
  ENCODING    'UTF8'
  LC_COLLATE  'en_US.UTF-8'
  LC_CTYPE    'en_US.UTF-8'
  TEMPLATE    template0;

\c jsprompt

-- Application role (least-privilege)
CREATE ROLE jsprompt_app LOGIN PASSWORD 'CHANGE_ME_STRONG_PASSWORD';

-- Admin role
CREATE ROLE jsprompt_admin LOGIN PASSWORD 'CHANGE_ME_ADMIN_PASSWORD' SUPERUSER;

-- ── 2. EXTENSIONS ───────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid(), crypt()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- full-text trigram search on prompts

-- ── 3. USERS ────────────────────────────────────────────────
CREATE TABLE users (
    id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email         VARCHAR(320) NOT NULL,
    email_lower   VARCHAR(320) GENERATED ALWAYS AS (lower(email)) STORED,
    display_name  VARCHAR(100),
    role          VARCHAR(20)  NOT NULL DEFAULT 'user'   -- 'user' | 'admin'
                               CHECK (role IN ('user','admin')),
    is_active     BOOLEAN      NOT NULL DEFAULT true,
    created_at    TIMESTAMPTZ  NOT NULL DEFAULT now(),
    last_login_at TIMESTAMPTZ,
    login_count   INTEGER      NOT NULL DEFAULT 0,
    CONSTRAINT uq_users_email UNIQUE (email_lower)
);

-- ── 4. AUTH TOKENS (magic-link email codes) ─────────────────
-- One-time-use tokens sent by email.  Expire in 15 minutes.
CREATE TABLE auth_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  CHAR(64)    NOT NULL,   -- SHA-256(raw_token) stored hex
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '15 minutes'),
    used_at     TIMESTAMPTZ,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_auth_token UNIQUE (token_hash)
);
CREATE INDEX idx_auth_tokens_user ON auth_tokens(user_id);

-- ── 5. SESSIONS (HttpOnly JWT refresh tokens) ───────────────
CREATE TABLE sessions (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  CHAR(64)    NOT NULL,   -- SHA-256(refresh_token)
    user_agent  TEXT,
    ip_address  INET,
    expires_at  TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    revoked_at  TIMESTAMPTZ,
    CONSTRAINT uq_sessions_token UNIQUE (token_hash)
);
CREATE INDEX idx_sessions_user ON sessions(user_id);

-- ── 6. DOMAIN ENUM ──────────────────────────────────────────
-- Mirrors the 13 domain classifiers in python_core.js / deepseek.js
CREATE TYPE prompt_domain AS ENUM (
    'intelligence_analysis',
    'osint',
    'strategic_risk',
    'medical_diagnostics',
    'cybersecurity',
    'financial_analysis',
    'legal_analysis',
    'programming',
    'data_science',
    'business_strategy',
    'product_management',
    'scientific_research',
    'general'
);

-- ── 7. USER SOURCE TEXTS (raw user input before generation) ─
CREATE TABLE source_texts (
    id              UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID         NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    original_text   TEXT         NOT NULL,
    translated_text TEXT,                   -- English version after auto-translate
    detected_lang   VARCHAR(8),             -- 'uk' | 'en' | 'es'
    domain          prompt_domain NOT NULL DEFAULT 'general',
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT now(),
    is_deleted      BOOLEAN      NOT NULL DEFAULT false
);
CREATE INDEX idx_source_texts_user ON source_texts(user_id) WHERE NOT is_deleted;
CREATE INDEX idx_source_texts_domain ON source_texts(user_id, domain) WHERE NOT is_deleted;
-- Trigram index for full-text search across original + translated text
CREATE INDEX idx_source_texts_search ON source_texts
    USING gin ((original_text || ' ' || COALESCE(translated_text,'')) gin_trgm_ops)
    WHERE NOT is_deleted;

-- ── 8. PROMPTS (generated output saved by user) ─────────────
CREATE TABLE prompts (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    source_text_id  UUID          REFERENCES source_texts(id) ON DELETE SET NULL,
    title           VARCHAR(300)  NOT NULL DEFAULT '',
    content         TEXT          NOT NULL,
    domain          prompt_domain NOT NULL DEFAULT 'general',
    style           VARCHAR(30),            -- 'detailed'|'concise'|'expert'|'creative'|'technical'
    output_lang     VARCHAR(8),             -- 'uk'|'en'|'es'
    engine          VARCHAR(30),            -- 'deepseek'|'local'
    token_count     INTEGER,
    word_count      INTEGER,
    quality_score   NUMERIC(4,1),
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    is_deleted      BOOLEAN       NOT NULL DEFAULT false
);
CREATE INDEX idx_prompts_user ON prompts(user_id) WHERE NOT is_deleted;
CREATE INDEX idx_prompts_domain ON prompts(user_id, domain) WHERE NOT is_deleted;
CREATE INDEX idx_prompts_created ON prompts(user_id, created_at DESC) WHERE NOT is_deleted;
-- Trigram search on title + content
CREATE INDEX idx_prompts_search ON prompts
    USING gin ((title || ' ' || content) gin_trgm_ops)
    WHERE NOT is_deleted;

-- ── 9. USAGE EVENTS (statistics) ────────────────────────────
CREATE TABLE usage_events (
    id          BIGSERIAL     PRIMARY KEY,
    user_id     UUID          REFERENCES users(id) ON DELETE SET NULL,
    event_type  VARCHAR(50)   NOT NULL,  -- 'prompt_generated'|'voice_input'|'translation'|'search'|'login'
    domain      prompt_domain,
    engine      VARCHAR(30),
    token_count INTEGER,
    metadata    JSONB         DEFAULT '{}',
    created_at  TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_usage_events_user ON usage_events(user_id, created_at DESC);
CREATE INDEX idx_usage_events_type ON usage_events(event_type, created_at DESC);

-- ── 10. SCHEDULED JOBS (future AI execution) ────────────────
CREATE TYPE schedule_type AS ENUM ('once','weekly','monthly','custom');
CREATE TYPE job_status AS ENUM ('pending','running','done','failed','cancelled');
CREATE TYPE target_ai AS ENUM ('gemini','claude','gpt4','deepseek','custom');

CREATE TABLE scheduled_jobs (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_id       UUID          NOT NULL REFERENCES prompts(id) ON DELETE CASCADE,
    target_ai       target_ai     NOT NULL DEFAULT 'gemini',
    target_ai_key   TEXT,                     -- encrypted API key for target AI
    schedule_type   schedule_type NOT NULL DEFAULT 'once',
    -- For 'once': next_run_at = exact time
    -- For 'weekly': run_days = [0..6] (Sun=0), run_time = HH:MM
    -- For 'monthly': run_days = [1..31], run_time = HH:MM
    -- For 'custom': run_dates = array of specific dates
    next_run_at     TIMESTAMPTZ   NOT NULL,
    run_days        INTEGER[],                -- days of week or month
    run_dates       DATE[],                   -- specific dates for 'custom'
    run_time        TIME,                     -- HH:MM for recurring
    timezone        VARCHAR(60)   NOT NULL DEFAULT 'UTC',
    status          job_status    NOT NULL DEFAULT 'pending',
    last_run_at     TIMESTAMPTZ,
    run_count       INTEGER       NOT NULL DEFAULT 0,
    max_runs        INTEGER,                  -- NULL = unlimited
    is_active       BOOLEAN       NOT NULL DEFAULT true,
    created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now()
);
CREATE INDEX idx_jobs_user ON scheduled_jobs(user_id);
CREATE INDEX idx_jobs_next_run ON scheduled_jobs(next_run_at) WHERE status = 'pending' AND is_active;

-- ── 11. JOB RESULTS ─────────────────────────────────────────
CREATE TABLE job_results (
    id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
    job_id          UUID          NOT NULL REFERENCES scheduled_jobs(id) ON DELETE CASCADE,
    user_id         UUID          NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    prompt_id       UUID          REFERENCES prompts(id) ON DELETE SET NULL,
    ran_at          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    status          job_status    NOT NULL,   -- 'done'|'failed'
    result_text     TEXT,                     -- AI response content
    error_message   TEXT,
    token_count     INTEGER,
    duration_ms     INTEGER,
    target_ai       target_ai,
    metadata        JSONB         DEFAULT '{}'
);
CREATE INDEX idx_job_results_job ON job_results(job_id, ran_at DESC);
CREATE INDEX idx_job_results_user ON job_results(user_id, ran_at DESC);

-- ── 12. STATISTICS VIEW ──────────────────────────────────────
-- Per-user per-domain prompt counts — used by the Stats tab
CREATE VIEW user_domain_stats AS
SELECT
    p.user_id,
    p.domain,
    COUNT(*) AS prompt_count,
    SUM(p.token_count) AS total_tokens,
    MAX(p.created_at) AS last_created_at
FROM prompts p
WHERE NOT p.is_deleted
GROUP BY p.user_id, p.domain;

-- ── 13. GRANT PERMISSIONS ────────────────────────────────────
GRANT CONNECT ON DATABASE jsprompt TO jsprompt_app;
GRANT USAGE ON SCHEMA public TO jsprompt_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jsprompt_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jsprompt_app;

-- Admin gets full access
GRANT ALL PRIVILEGES ON DATABASE jsprompt TO jsprompt_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jsprompt_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jsprompt_admin;

-- ── 14. TRIGGER: update updated_at automatically ─────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_source_texts_updated
    BEFORE UPDATE ON source_texts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_prompts_updated
    BEFORE UPDATE ON prompts
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_jobs_updated
    BEFORE UPDATE ON scheduled_jobs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── 15. SEED: default admin user ────────────────────────────
-- Replace email with your actual admin email before running
-- Password login is not used — admin logs in via magic link
INSERT INTO users (email, display_name, role)
VALUES ('admin@promt.pp.ua', 'Administrator', 'admin')
ON CONFLICT DO NOTHING;
