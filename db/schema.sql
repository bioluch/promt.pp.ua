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

-- ── 3. SCHEMA ───────────────────────────────────────────────
-- Generated from the production database with `pg_dump -s --no-owner --no-privileges`
-- (extension statements removed — they are created in section 2).
-- Regenerate this section after every migration so the file stays in sync with
-- what api/server.js and api/scheduler.js expect.
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SET check_function_bodies = false;
SET client_min_messages = warning;

--
-- Name: job_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.job_status AS ENUM (
    'pending',
    'running',
    'done',
    'failed',
    'cancelled'
);

--
-- Name: prompt_domain; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.prompt_domain AS ENUM (
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

--
-- Name: schedule_type; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.schedule_type AS ENUM (
    'once',
    'weekly',
    'monthly',
    'custom'
);

--
-- Name: target_ai; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.target_ai AS ENUM (
    'gemini',
    'claude',
    'gpt4',
    'deepseek',
    'custom',
    'perplexity'
);

--
-- Name: set_updated_at(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ai_provider_endpoints; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_provider_endpoints (
    provider_key character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    endpoint_url text NOT NULL,
    model_name character varying(100) NOT NULL,
    auth_header character varying(50) DEFAULT 'Authorization'::character varying NOT NULL,
    auth_prefix character varying(50) DEFAULT 'Bearer '::character varying NOT NULL,
    is_builtin boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    provider_options jsonb DEFAULT '{}'::jsonb NOT NULL
);

--
-- Name: auth_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.auth_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '00:15:00'::interval) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: email_verifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.email_verifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '24:00:00'::interval) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: job_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.job_results (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    job_id uuid NOT NULL,
    user_id uuid NOT NULL,
    prompt_id uuid,
    ran_at timestamp with time zone DEFAULT now() NOT NULL,
    status public.job_status NOT NULL,
    result_text text,
    error_message text,
    token_count integer,
    duration_ms integer,
    target_ai character varying(50),
    metadata jsonb DEFAULT '{}'::jsonb
);

--
-- Name: password_reset_tokens; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.password_reset_tokens (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    expires_at timestamp with time zone DEFAULT (now() + '01:00:00'::interval) NOT NULL,
    used_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: prompts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.prompts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    source_text_id uuid,
    title character varying(300) DEFAULT ''::character varying NOT NULL,
    content text NOT NULL,
    domain public.prompt_domain DEFAULT 'general'::public.prompt_domain NOT NULL,
    style character varying(30),
    output_lang character varying(8),
    engine character varying(30),
    token_count integer,
    word_count integer,
    quality_score character varying(20),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id bigint NOT NULL,
    user_id uuid NOT NULL,
    endpoint text NOT NULL,
    p256dh text NOT NULL,
    auth text NOT NULL,
    user_agent text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    lang text DEFAULT 'en'::text NOT NULL
);

--
-- Name: push_subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.push_subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);

--
-- Name: scheduled_jobs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.scheduled_jobs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    prompt_id uuid NOT NULL,
    target_ai character varying(50) DEFAULT 'gemini'::character varying NOT NULL,
    target_ai_key text,
    schedule_type public.schedule_type DEFAULT 'once'::public.schedule_type NOT NULL,
    next_run_at timestamp with time zone NOT NULL,
    run_days integer[],
    run_dates date[],
    run_time time without time zone,
    timezone character varying(60) DEFAULT 'UTC'::character varying NOT NULL,
    status public.job_status DEFAULT 'pending'::public.job_status NOT NULL,
    last_run_at timestamp with time zone,
    run_count integer DEFAULT 0 NOT NULL,
    max_runs integer,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    max_tokens integer,
    retry_count integer DEFAULT 0 NOT NULL
);

--
-- Name: sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    token_hash character(64) NOT NULL,
    user_agent text,
    ip_address inet,
    expires_at timestamp with time zone DEFAULT (now() + '30 days'::interval) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    revoked_at timestamp with time zone
);

--
-- Name: source_texts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.source_texts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    original_text text NOT NULL,
    translated_text text,
    detected_lang character varying(8),
    domain public.prompt_domain DEFAULT 'general'::public.prompt_domain NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL
);

--
-- Name: usage_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.usage_events (
    id bigint NOT NULL,
    user_id uuid,
    event_type character varying(50) NOT NULL,
    domain public.prompt_domain,
    engine character varying(30),
    token_count integer,
    metadata jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: usage_events_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.usage_events_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

--
-- Name: usage_events_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.usage_events_id_seq OWNED BY public.usage_events.id;

--
-- Name: user_api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_api_keys (
    user_id uuid NOT NULL,
    deepseek_key text,
    claude_key text,
    gemini_key text,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: user_custom_providers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_custom_providers (
    user_id uuid NOT NULL,
    provider_key character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    prefix character varying(100) DEFAULT ''::character varying,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: user_domain_stats; Type: VIEW; Schema: public; Owner: -
--

CREATE VIEW public.user_domain_stats AS
 SELECT prompts.user_id,
    prompts.domain,
    count(*) AS prompt_count,
    COALESCE(sum(prompts.token_count), (0)::bigint) AS total_tokens,
    max(prompts.created_at) AS last_created_at
   FROM public.prompts
  WHERE (NOT prompts.is_deleted)
  GROUP BY prompts.user_id, prompts.domain;

--
-- Name: user_provider_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_provider_keys (
    user_id uuid NOT NULL,
    provider character varying(50) NOT NULL,
    api_key text NOT NULL,
    label character varying(100),
    key_prefix character varying(100) DEFAULT ''::character varying,
    is_builtin boolean DEFAULT false NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    email character varying(320) NOT NULL,
    display_name character varying(100),
    role character varying(20) DEFAULT 'user'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    last_login_at timestamp with time zone,
    login_count integer DEFAULT 0 NOT NULL,
    password_hash character varying(100),
    email_verified boolean DEFAULT false NOT NULL,
    CONSTRAINT users_role_check CHECK (((role)::text = ANY (ARRAY[('user'::character varying)::text, ('admin'::character varying)::text])))
);

--
-- Name: usage_events id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events ALTER COLUMN id SET DEFAULT nextval('public.usage_events_id_seq'::regclass);

--
-- Name: ai_provider_endpoints ai_provider_endpoints_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_provider_endpoints
    ADD CONSTRAINT ai_provider_endpoints_pkey PRIMARY KEY (provider_key);

--
-- Name: auth_tokens auth_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_pkey PRIMARY KEY (id);

--
-- Name: email_verifications email_verifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_pkey PRIMARY KEY (id);

--
-- Name: job_results job_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_results
    ADD CONSTRAINT job_results_pkey PRIMARY KEY (id);

--
-- Name: password_reset_tokens password_reset_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_pkey PRIMARY KEY (id);

--
-- Name: prompts prompts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_pkey PRIMARY KEY (id);

--
-- Name: push_subscriptions push_subscriptions_endpoint_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_endpoint_key UNIQUE (endpoint);

--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);

--
-- Name: scheduled_jobs scheduled_jobs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_jobs
    ADD CONSTRAINT scheduled_jobs_pkey PRIMARY KEY (id);

--
-- Name: sessions sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_pkey PRIMARY KEY (id);

--
-- Name: source_texts source_texts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_texts
    ADD CONSTRAINT source_texts_pkey PRIMARY KEY (id);

--
-- Name: auth_tokens uq_auth_token; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT uq_auth_token UNIQUE (token_hash);

--
-- Name: email_verifications uq_email_verif_token; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT uq_email_verif_token UNIQUE (token_hash);

--
-- Name: password_reset_tokens uq_pwreset_token; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT uq_pwreset_token UNIQUE (token_hash);

--
-- Name: sessions uq_sessions_token; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT uq_sessions_token UNIQUE (token_hash);

--
-- Name: usage_events usage_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_pkey PRIMARY KEY (id);

--
-- Name: user_api_keys user_api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT user_api_keys_pkey PRIMARY KEY (user_id);

--
-- Name: user_custom_providers user_custom_providers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_custom_providers
    ADD CONSTRAINT user_custom_providers_pkey PRIMARY KEY (user_id, provider_key);

--
-- Name: user_provider_keys user_provider_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_provider_keys
    ADD CONSTRAINT user_provider_keys_pkey PRIMARY KEY (user_id, provider);

--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);

--
-- Name: idx_auth_tokens_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_auth_tokens_user ON public.auth_tokens USING btree (user_id);

--
-- Name: idx_email_verif_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_email_verif_user ON public.email_verifications USING btree (user_id);

--
-- Name: idx_job_results_job; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_results_job ON public.job_results USING btree (job_id, ran_at DESC);

--
-- Name: idx_job_results_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_job_results_user ON public.job_results USING btree (user_id, ran_at DESC);

--
-- Name: idx_jobs_next_run; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_next_run ON public.scheduled_jobs USING btree (next_run_at) WHERE ((status = 'pending'::public.job_status) AND is_active);

--
-- Name: idx_jobs_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_jobs_user ON public.scheduled_jobs USING btree (user_id);

--
-- Name: idx_prompts_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompts_created ON public.prompts USING btree (user_id, created_at DESC) WHERE (NOT is_deleted);

--
-- Name: idx_prompts_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompts_domain ON public.prompts USING btree (user_id, domain) WHERE (NOT is_deleted);

--
-- Name: idx_prompts_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompts_search ON public.prompts USING gin (((((title)::text || ' '::text) || content)) public.gin_trgm_ops) WHERE (NOT is_deleted);

--
-- Name: idx_prompts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_prompts_user ON public.prompts USING btree (user_id) WHERE (NOT is_deleted);

--
-- Name: idx_push_sub_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_push_sub_user ON public.push_subscriptions USING btree (user_id);

--
-- Name: idx_pwreset_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_pwreset_user ON public.password_reset_tokens USING btree (user_id);

--
-- Name: idx_sessions_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sessions_user ON public.sessions USING btree (user_id);

--
-- Name: idx_source_texts_domain; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_texts_domain ON public.source_texts USING btree (user_id, domain) WHERE (NOT is_deleted);

--
-- Name: idx_source_texts_search; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_texts_search ON public.source_texts USING gin ((((original_text || ' '::text) || COALESCE(translated_text, ''::text))) public.gin_trgm_ops) WHERE (NOT is_deleted);

--
-- Name: idx_source_texts_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_source_texts_user ON public.source_texts USING btree (user_id) WHERE (NOT is_deleted);

--
-- Name: idx_usage_events_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_events_type ON public.usage_events USING btree (event_type, created_at DESC);

--
-- Name: idx_usage_events_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_usage_events_user ON public.usage_events USING btree (user_id, created_at DESC);

--
-- Name: uq_users_email_lower; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX uq_users_email_lower ON public.users USING btree (lower((email)::text));

--
-- Name: scheduled_jobs trg_jobs_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_jobs_updated BEFORE UPDATE ON public.scheduled_jobs FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: prompts trg_prompts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prompts_updated BEFORE UPDATE ON public.prompts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: source_texts trg_source_texts_updated; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_source_texts_updated BEFORE UPDATE ON public.source_texts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

--
-- Name: auth_tokens auth_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.auth_tokens
    ADD CONSTRAINT auth_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: email_verifications email_verifications_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.email_verifications
    ADD CONSTRAINT email_verifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: job_results job_results_job_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_results
    ADD CONSTRAINT job_results_job_id_fkey FOREIGN KEY (job_id) REFERENCES public.scheduled_jobs(id) ON DELETE CASCADE;

--
-- Name: job_results job_results_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_results
    ADD CONSTRAINT job_results_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id) ON DELETE SET NULL;

--
-- Name: job_results job_results_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.job_results
    ADD CONSTRAINT job_results_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: password_reset_tokens password_reset_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.password_reset_tokens
    ADD CONSTRAINT password_reset_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: prompts prompts_source_text_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_source_text_id_fkey FOREIGN KEY (source_text_id) REFERENCES public.source_texts(id) ON DELETE SET NULL;

--
-- Name: prompts prompts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.prompts
    ADD CONSTRAINT prompts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: push_subscriptions push_subscriptions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: scheduled_jobs scheduled_jobs_prompt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_jobs
    ADD CONSTRAINT scheduled_jobs_prompt_id_fkey FOREIGN KEY (prompt_id) REFERENCES public.prompts(id) ON DELETE CASCADE;

--
-- Name: scheduled_jobs scheduled_jobs_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.scheduled_jobs
    ADD CONSTRAINT scheduled_jobs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: sessions sessions_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sessions
    ADD CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: source_texts source_texts_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.source_texts
    ADD CONSTRAINT source_texts_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: usage_events usage_events_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.usage_events
    ADD CONSTRAINT usage_events_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;

--
-- Name: user_api_keys user_api_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_api_keys
    ADD CONSTRAINT user_api_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_custom_providers user_custom_providers_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_custom_providers
    ADD CONSTRAINT user_custom_providers_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- Name: user_provider_keys user_provider_keys_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_provider_keys
    ADD CONSTRAINT user_provider_keys_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

--
-- PostgreSQL database dump complete
--

-- ── 4. GRANT PERMISSIONS ────────────────────────────────────
GRANT CONNECT ON DATABASE jsprompt TO jsprompt_app;
GRANT USAGE ON SCHEMA public TO jsprompt_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO jsprompt_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO jsprompt_app;

-- Admin gets full access
GRANT ALL PRIVILEGES ON DATABASE jsprompt TO jsprompt_admin;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO jsprompt_admin;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO jsprompt_admin;

-- ── 5. SEED: default admin user ─────────────────────────────
-- Replace email with your actual admin email before running.
-- Set a password via the app's reset-password flow, or log in via magic link.
INSERT INTO public.users (email, display_name, role, email_verified)
VALUES ('admin@promt.pp.ua', 'Administrator', 'admin', true)
ON CONFLICT DO NOTHING;
