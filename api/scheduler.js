/**
 * api/scheduler.js — JS PROMPT v2
 * Background job runner for scheduled AI prompt executions.
 * Polls the DB every minute, runs due jobs, stores results.
 *
 * Systemd: /etc/systemd/system/jsprompt-scheduler.service
 *
 * Currently supports: Gemini (google-generativeai)
 * Extendable: Claude, GPT-4, DeepSeek
 */
'use strict';

const { Pool }    = require('pg');
const crypto      = require('crypto');
const path        = require('path');
const webpush     = require('web-push');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const {
  PG_HOST = '127.0.0.1', PG_PORT = 5432,
  PG_DB = 'jsprompt', PG_USER = 'jsprompt_app', PG_PASSWORD,
  GEMINI_API_KEY,
  SCHEDULER_INTERVAL_MS = 60_000,  // poll every 60s
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:admin@promt.pp.ua',
} = process.env;

const pool = new Pool({
  host: PG_HOST, port: parseInt(PG_PORT),
  database: PG_DB, user: PG_USER, password: PG_PASSWORD,
  max: 5,
});

// ── Web Push (VAPID) ──────────────────────────────────────────
let pushEnabled = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  pushEnabled = true;
  console.log('[scheduler] Web Push enabled');
} else {
  console.warn('[scheduler] Web Push disabled — set VAPID keys in .env');
}

// ── Localized notification strings (kinds: done | retry | failed) ──
const PUSH_I18N = {
  en: {
    done:   { title: 'Task completed ✅',
              body: (t, ai) => t ? `«${t}» (${ai}) — done` : `${ai} — task completed` },
    retry:  { title: 'Task postponed ⏳',
              body: (t, ai) => (t ? `«${t}» (${ai})` : ai) + ' — AI service is overloaded. Retrying in 30 min.' },
    failed: { title: 'Task failed ⚠️',
              body: (t, ai) => (t ? `«${t}» (${ai})` : ai) + ' — could not be completed. Please check the job.' },
  },
  uk: {
    done:   { title: 'Завдання виконано ✅',
              body: (t, ai) => t ? `«${t}» (${ai}) — готово` : `${ai} — завдання виконано` },
    retry:  { title: 'Завдання відкладено ⏳',
              body: (t, ai) => (t ? `«${t}» (${ai})` : ai) + ' — сервіс ШІ перевантажений. Повтор через 30 хв.' },
    failed: { title: 'Помилка завдання ⚠️',
              body: (t, ai) => (t ? `«${t}» (${ai})` : ai) + ' — не вдалося виконати. Перевірте задачу.' },
  },
  es: {
    done:   { title: 'Tarea completada ✅',
              body: (t, ai) => t ? `«${t}» (${ai}) — listo` : `${ai} — tarea completada` },
    retry:  { title: 'Tarea aplazada ⏳',
              body: (t, ai) => (t ? `«${t}» (${ai})` : ai) + ' — el servicio de IA está sobrecargado. Reintento en 30 min.' },
    failed: { title: 'Tarea fallida ⚠️',
              body: (t, ai) => (t ? `«${t}» (${ai})` : ai) + ' — no se pudo completar. Revise la tarea.' },
  },
};

// ── Send a localized push to all of a user's subscriptions ─────
// kind: 'done' (success) | 'retry' (overloaded, will retry) | 'failed' (permanent)
async function sendJobPush(job, kind = 'done') {
  if (!pushEnabled) return;

  const { rows: subs } = await pool.query(
    `SELECT endpoint, p256dh, auth, lang FROM push_subscriptions WHERE user_id=$1`,
    [job.user_id]
  );
  console.log(`[push] job ${job.id} (${kind}) user ${job.user_id} → subs ${subs.length}`);
  if (!subs.length) return;

  // Prompt title for a nicer message
  let promptTitle = '';
  try {
    const { rows } = await pool.query(`SELECT title FROM prompts WHERE id=$1`, [job.prompt_id]);
    promptTitle = rows[0]?.title || '';
  } catch { /* ignore */ }

  await Promise.all(subs.map(async (s) => {
    const pack = PUSH_I18N[s.lang] || PUSH_I18N.en;
    const loc  = pack[kind] || PUSH_I18N.en[kind];
    const payload = JSON.stringify({
      title: loc.title,
      body:  loc.body(promptTitle, job.target_ai),
      url:   '/#scheduled-jobs',   // adjust to your Scheduled Jobs anchor
      jobId: job.id,
    });
    try {
      const r = await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload
      );
      console.log(`[push] sent → ${r && r.statusCode} (${s.lang}) ${s.endpoint.slice(0, 45)}`);
    } catch (err) {
      // 404/410 = gone, 403 = VAPID key mismatch → drop the dead subscription
      if (err.statusCode === 404 || err.statusCode === 410 || err.statusCode === 403) {
        await pool.query(`DELETE FROM push_subscriptions WHERE endpoint=$1`, [s.endpoint]);
        console.warn('[push] pruned dead subscription:', err.statusCode);
      } else {
        console.error('[push] send error:', err.statusCode, err.body || err.message);
      }
    }
  }));
}

console.log('[scheduler] JS PROMPT v2 Scheduler started');
console.log(`[scheduler] Poll interval: ${SCHEDULER_INTERVAL_MS}ms`);

// ── Run a single job ──────────────────────────────────────────
async function runJob(job) {
  const startMs = Date.now();
  console.log(`[scheduler] Running job ${job.id} (${job.target_ai}) prompt: ${job.prompt_id}`);

  // The job was already claimed (status='running') by pollAndRun; refresh
  // last_run_at so stale detection measures this job's run, not the batch claim.
  await pool.query(`UPDATE scheduled_jobs SET last_run_at=now() WHERE id=$1`, [job.id]);

  let resultText  = null;
  let errorMsg    = null;
  let errorDetail = null;   // raw provider text stored in metadata for debugging
  let tokenCount  = null;
  const outputMeta = {};   // { truncated, continuations } from the adapter
  let status      = 'done';
  let retryable   = false;  // transient overload (503/429) → reschedule in 30 min

  try {
    // ── Fetch prompt content ──
    const { rows } = await pool.query(
      `SELECT content FROM prompts WHERE id=$1`, [job.prompt_id]
    );
    if (!rows[0]) throw new Error('Prompt not found');
    const promptContent = rows[0].content;

    // ── Fetch user's own API key from DB (fallback to server .env) ──
    const { rows: keyRows } = await pool.query(
      `SELECT api_key FROM user_provider_keys WHERE user_id=$1 AND provider=$2`,
      [job.user_id, job.target_ai]
    );
    job.target_ai_key = keyRows[0]?.api_key || null;

    // ── Execute against target AI ──
    let out;
    switch (job.target_ai) {
      case 'gemini':
        out = await callGemini(promptContent, job);
        break;
      case 'deepseek':
        out = await callDeepSeek(promptContent, job);
        break;
      case 'claude':
        out = await callClaude(promptContent, job);
        break;
      case 'perplexity':
        // Perplexity sonar has built-in web search — uses dedicated adapter
        out = await callPerplexity(promptContent, job);
        break;
      default:
        // Mistral, Groq, GPT-4, OpenRouter, Together, Qwen, etc.
        // OpenAI-compatible format, no built-in web search
        out = await callOpenAICompatible(promptContent, job);
        break;
    }
    ({ resultText, tokenCount } = out);
    if (out.continuations) outputMeta.continuations = out.continuations;
    if (out.truncated) {
      // Still cut off after all continuations: keep the text, but say so
      outputMeta.truncated = true;
      resultText = (resultText || '') + TRUNCATION_NOTE;
      console.warn(`[scheduler] Job ${job.id}: response still truncated after ${out.continuations || 0} continuation(s)`);
    }
  } catch (err) {
    // If the adapter provided an i18n key (job.err.*), store THAT so the
    // frontend can localize it (auth-ui.js renders Lang.t(error_message)).
    // The raw provider message is kept in metadata.detail for debugging.
    errorMsg    = err.i18nKey || err.message;
    errorDetail = err.i18nKey ? err.message : null;
    retryable   = err.retryable === true;
    status      = 'failed';
    console.error(`[scheduler] Job ${job.id} failed${retryable ? ' (retryable)' : ''}:`, err.message);
  }

  const durationMs = Date.now() - startMs;

  // ── Save result ──
  await pool.query(
    `INSERT INTO job_results
       (job_id, user_id, prompt_id, status, result_text, error_message,
        token_count, duration_ms, target_ai, metadata)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [job.id, job.user_id, job.prompt_id, status, resultText,
     errorMsg, tokenCount, durationMs, job.target_ai,
     JSON.stringify({ ...outputMeta, ...(errorDetail ? { detail: errorDetail, retryable } : {}) })]
  );

  // ── Transient overload (Gemini 503 / 429 etc.) → retry in 30 min ──
  // The provider is temporarily unavailable, NOT the schedule being due.
  // We keep the job pending, push next_run_at 30 min out, and DO NOT
  // advance the weekly schedule or increment run_count. Bounded by
  // MAX_TRANSIENT_RETRIES so a long outage can't loop forever.
  if (status === 'failed' && retryable) {
    const attempts = (job.retry_count || 0) + 1;
    if (attempts <= MAX_TRANSIENT_RETRIES) {
      const retryAt = new Date(Date.now() + RETRY_DELAY_MS);
      // A retry overwrites next_run_at; pin the original slot first so jobs
      // without run_time / run_days keep their schedule after the retry.
      const slot = scheduleAnchor(job);
      await pool.query(
        `UPDATE scheduled_jobs
           SET status='pending', next_run_at=$2, retry_count=$3, last_run_at=now(),
               run_time = COALESCE(run_time, $4::time),
               run_days = CASE WHEN run_days IS NULL OR cardinality(run_days) = 0
                               THEN $5::int[] ELSE run_days END
         WHERE id=$1`,
        [job.id, retryAt, attempts, slot.runTime, slot.runDays]
      );
      console.warn(`[scheduler] Job ${job.id} overloaded — retry ${attempts}/${MAX_TRANSIENT_RETRIES} at ${retryAt.toISOString()}`);
      await sendJobPush(job, 'retry').catch(e =>
        console.error('[push] notify failed:', e.message)
      );
      return;
    }
    console.error(`[scheduler] Job ${job.id} gave up after ${MAX_TRANSIENT_RETRIES} overload retries — treating as permanent failure`);
    // fall through to permanent-failure handling below
  }

  // ── Compute next_run_at or deactivate (success or permanent failure) ──
  // retry_count resets to 0 so the next scheduled run starts a fresh budget.
  const newRunCount = (job.run_count || 0) + 1;
  const reachedMax  = job.max_runs && newRunCount >= job.max_runs;
  const isOnce      = job.schedule_type === 'once';

  if (isOnce || reachedMax) {
    await pool.query(
      `UPDATE scheduled_jobs
       SET status='done', is_active=false, run_count=$2, retry_count=0, last_run_at=now()
       WHERE id=$1`,
      [job.id, newRunCount]
    );
  } else {
    const nextRun = computeNextRun(job);
    if (!nextRun) {
      // No remaining date (e.g. custom schedule exhausted) — deactivate instead of
      // storing a NULL next_run_at.
      await pool.query(
        `UPDATE scheduled_jobs
         SET status='done', is_active=false, run_count=$2, retry_count=0, last_run_at=now()
         WHERE id=$1`,
        [job.id, newRunCount]
      );
    } else {
      await pool.query(
        `UPDATE scheduled_jobs
         SET status='pending', next_run_at=$2, run_count=$3, retry_count=0, last_run_at=now()
         WHERE id=$1`,
        [job.id, nextRun, newRunCount]
      );
    }
  }

  console.log(`[scheduler] Job ${job.id} ${status} in ${durationMs}ms`);

  // ── Notify the user via Web Push (localized by subscription lang) ──
  await sendJobPush(job, status === 'done' ? 'done' : 'failed').catch(e =>
    console.error('[push] notify failed:', e.message)
  );
}

// ── Compute next run time ────────────────────────────────────
// All schedule maths happens in the job's own timezone, not the server's.

// Calendar parts of `date` as seen in `tz`.
function zonedParts(date, tz) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz, hourCycle: 'h23',
    year: 'numeric', month: 'numeric', day: 'numeric',
    hour: 'numeric', minute: 'numeric', weekday: 'short',
  }).formatToParts(date);
  const get = (t) => parts.find(p => p.type === t).value;
  return {
    y: +get('year'), mo: +get('month'), d: +get('day'),
    h: +get('hour'), mi: +get('minute'),
    wd: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')),
  };
}

// UTC instant for wall-clock y-mo-d h:mi in `tz` (handles DST by re-checking the offset).
function zonedTimeToUtc(y, mo, d, h, mi, tz) {
  const wall = Date.UTC(y, mo - 1, d, h, mi);
  let ts = wall;
  for (let i = 0; i < 2; i++) {
    const p = zonedParts(new Date(ts), tz);
    ts += wall - Date.UTC(p.y, p.mo - 1, p.d, p.h, p.mi);
  }
  return new Date(ts);
}

// The recurring slot (HH:MM and weekday / day-of-month) implied by the job's
// original next_run_at, in the job's timezone. Used to pin the schedule before
// a transient retry moves next_run_at.
function scheduleAnchor(job) {
  if (!job.next_run_at || job.schedule_type === 'once') return { runTime: null, runDays: null };
  let tz = job.timezone || 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'UTC'; }
  const p = zonedParts(new Date(job.next_run_at), tz);
  const pad = (n) => String(n).padStart(2, '0');
  const runDays = job.schedule_type === 'weekly' ? [p.wd]
                : job.schedule_type === 'monthly' ? [p.d]
                : null;
  return { runTime: `${pad(p.h)}:${pad(p.mi)}`, runDays };
}

function computeNextRun(job) {
  const now = new Date();
  let tz = job.timezone || 'UTC';
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); } catch { tz = 'UTC'; }

  // Fall back to the job's original next_run_at for a missing time / days,
  // so a job created with only next_run_at keeps its original slot.
  const anchor = zonedParts(job.next_run_at ? new Date(job.next_run_at) : now, tz);
  const [h, m] = job.run_time
    ? String(job.run_time).split(':').map(Number)
    : [anchor.h, anchor.mi];

  // First day (in tz) from today onward, matching `matches`, whose h:m is still in the future.
  const nextMatchingDay = (matches, maxDays) => {
    const today = zonedParts(now, tz);
    for (let i = 0; i <= maxDays; i++) {
      const day = new Date(Date.UTC(today.y, today.mo - 1, today.d + i));
      if (!matches(day)) continue;
      const at = zonedTimeToUtc(day.getUTCFullYear(), day.getUTCMonth() + 1, day.getUTCDate(), h, m, tz);
      if (at > now) return at;
    }
    return null;
  };

  switch (job.schedule_type) {
    case 'weekly': {
      // run_days: [0..6] (Sun=0)
      const days = job.run_days?.length ? job.run_days : [anchor.wd];
      return nextMatchingDay(day => days.includes(day.getUTCDay()), 8);
    }
    case 'monthly': {
      // run_days: [1..31] day of month
      const days = job.run_days?.length ? job.run_days : [anchor.d];
      return nextMatchingDay(day => days.includes(day.getUTCDate()), 366);
    }
    case 'custom': {
      // run_dates: DATE[] — node-pg parses DATE as local midnight, so read local parts
      const remaining = (job.run_dates || [])
        .map(d => {
          const dt = d instanceof Date ? d : new Date(`${d}T00:00:00`);
          return zonedTimeToUtc(dt.getFullYear(), dt.getMonth() + 1, dt.getDate(), h, m, tz);
        })
        .filter(d => d > now)
        .sort((a, b) => a - b);
      return remaining[0] || null;
    }
    default:
      return null;
  }
}

// ══════════════════════════════════════════════════════════════
// AI ADAPTERS — all providers read config from ai_provider_endpoints
// ══════════════════════════════════════════════════════════════

// ── Retry / sleep helper ─────────────────────────────────────
const RETRY_CODES  = new Set([429, 503]);   // transient: rate limit / overloaded
const MAX_RETRIES  = 4;                      // fast in-process retries (seconds)
const BASE_DELAY   = 5000;
const MAX_DELAY    = 30000;

// Slow, out-of-process retry: when a provider stays overloaded past the
// in-process retries, the job is rescheduled this far into the future and
// picked up again by the normal poll loop.
const RETRY_DELAY_MS        = 30 * 60 * 1000; // 30 minutes
const MAX_TRANSIENT_RETRIES = 6;              // give up after ~3h of overload

// Error that signals a transient provider outage (429/503). Carries the
// i18n key so the frontend + push layer can localize it.
class RetryableError extends Error {
  constructor(message, { i18nKey, status } = {}) {
    super(message);
    this.name      = 'RetryableError';
    this.retryable = true;
    this.i18nKey   = i18nKey;
    this.status    = status;
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Throw a retry-aware error for OpenAI-style adapters: 429/503 → retryable.
function throwProviderError(label, status, bodyText = '') {
  const msg = `${label} API error ${status}: ${bodyText.slice(0, 200)}`;
  if (RETRY_CODES.has(status)) {
    throw new RetryableError(msg, { i18nKey: ERR.overloaded, status });
  }
  throw new Error(msg);
}

// ── Load provider config from DB ─────────────────────────────
// provider_options (jsonb) holds provider-specific API params:
//   gemini:     { use_v1beta, tools }
//   claude:     { tools }
//   perplexity: { return_citations, search_recency_filter }
//   others:     {} (no built-in web search)
async function getProviderConfig(providerKey) {
  const { rows } = await pool.query(
    `SELECT provider_key, label, endpoint_url, model_name,
            auth_header, auth_prefix, provider_options
     FROM ai_provider_endpoints
     WHERE provider_key = $1 AND is_active = true`,
    [providerKey]
  );
  if (!rows[0]) throw new Error(`Provider "${providerKey}" not found or inactive in ai_provider_endpoints`);
  // Ensure provider_options is always an object (fallback for old rows without migration)
  rows[0].provider_options = rows[0].provider_options || {};
  return rows[0];
}

// ── Today's date string for system prompts ───────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

// ── Scheduler error keys (translated by Lang.t() on the frontend) ──
// Keys match language.js: job.err.lowBalance | job.err.invalidKey | job.err.overloaded | job.err.noKey
// Scheduler stores the i18n key — frontend renders it via Lang.t(key)
const ERR = {
  low_balance: 'job.err.lowBalance',
  invalid_key: 'job.err.invalidKey',
  overloaded:  'job.err.overloaded',
  no_key:      'job.err.noKey',
};

// ── Dynamic web_search tool type with job execution date ─────
// Anthropic web_search tool type uses date suffix: web_search_YYYYMMDD
// We use the job's next_run_at (or today) so the version always
// matches the actual execution date — never hardcoded.
function webSearchToolType(job) {
  const d = job?.next_run_at ? new Date(job.next_run_at) : new Date();
  const yyyy = d.getUTCFullYear();
  const mm   = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd   = String(d.getUTCDate()).padStart(2, '0');
  return `web_search_${yyyy}${mm}${dd}`;
}

// Build tools array from provider_options, updating web_search type date dynamically.
// All other tool types (e.g. google_search for Gemini) are passed through unchanged.
function buildTools(providerOptions, job) {
  const tools = providerOptions?.tools;
  if (!tools?.length) return null;
  return tools.map(tool => {
    if (tool.name === 'web_search' || tool.type?.startsWith('web_search_')) {
      return { ...tool, type: webSearchToolType(job) };
    }
    return tool;
  });
}

// ── GEMINI adapter ───────────────────────────────────────────
// provider_options from DB:
//   use_v1beta: true   — required for google_search grounding (v1 does not support it)
//   tools: [{ google_search: {} }]
async function callGemini(prompt, job) {
  const cfg    = await getProviderConfig('gemini');
  const apiKey = job.target_ai_key || GEMINI_API_KEY;
  if (!apiKey) throw new Error('No Gemini API key configured');

  const opts  = cfg.provider_options;
  const model = cfg.model_name || 'gemini-2.5-flash';

  // Use v1beta if specified in DB (required for grounding); otherwise v1
  const apiVersion = opts.use_v1beta ? 'v1beta' : 'v1';
  const url = `https://generativelanguage.googleapis.com/${apiVersion}/models/${model}:generateContent?key=${apiKey}`;

  console.log(`[scheduler] Gemini model=${model} (from DB)`);

  const systemInstruction = {
    parts: [{ text:
      `Today is ${todayStr()}. This is the real current date — not a future date. ` +
      `You MUST use Google Search grounding for ALL queries. ` +
      `Always search before answering questions about recent events, news, or anything that may have changed recently. ` +
      `Never refuse to search or rely on training data alone.`
    }]
  };
/*
  const systemInstruction = {
    parts: [{ text:
      `Today is ${todayStr()}. You MUST use Google Search to find current, ` +
      `real-time information. Always search before answering questions about ` +
      `recent events, news, or anything that may have changed recently. ` +
      `Do not rely on training data alone.`
    }]
  };

  const systemInstruction = {
    parts: [{ text:
      `Today is ${todayStr()}. This is the real current date. ` +
      `You MUST use Google Search grounding for ALL queries about events, ` +
      `news, or facts. Never refuse to search claiming dates are in the future. ` +
      `Always perform web search before answering.`
    }]
  };
*/
  // Gemini 2.5+ "thinking" models count their internal reasoning against
  // maxOutputTokens, so an 8K budget can leave only ~1K tokens of visible
  // text. Give thinking models headroom on top of the requested answer size.
  const visibleBudget = job.max_tokens || DEFAULT_OUTPUT_TOKENS;
  const thinkingModel = /gemini-(2\.5|[3-9])|thinking/i.test(model);
  const maxOutputTokens = Math.min(visibleBudget + (thinkingModel ? 16384 : 0), 65536);

  const makeBody = (contents) => JSON.stringify({
    system_instruction: systemInstruction,
    contents,
    generationConfig:   { maxOutputTokens },
    // tools come from DB provider_options — e.g. [{ google_search: {} }]
    ...(opts.tools?.length && { tools: opts.tools }),
  });

  let contents = [{ role: 'user', parts: [{ text: prompt }] }];
  let text = '', tokens = 0, truncated = false, rounds = 0;
  for (;;) {
    const data = await geminiRequest(url, makeBody(contents));
    const cand = data?.candidates?.[0];
    const part = (cand?.content?.parts || []).filter(p => p.text && !p.thought).map(p => p.text).join('');
    text   += part;
    tokens += data?.usageMetadata?.totalTokenCount || 0;
    truncated = cand?.finishReason === 'MAX_TOKENS';

    // Log grounding status
    const grounding = cand?.groundingMetadata;
    if (grounding?.webSearchQueries?.length) {
      console.log(`[scheduler] Gemini grounding OK — queries: ${grounding.webSearchQueries.join(' | ')}`);
    } else if (!rounds) {
      console.warn('[scheduler] Gemini WARNING: grounding did not fire — no web search performed');
    }

    if (!truncated || !part.trim() || rounds >= MAX_CONTINUATIONS) break;
    rounds++;
    console.warn(`[scheduler] Gemini output limit reached — requesting continuation ${rounds}/${MAX_CONTINUATIONS}`);
    contents = [...contents,
      { role: 'model', parts: [{ text: part }] },
      { role: 'user',  parts: [{ text: CONTINUE_PROMPT }] }];
  }
  return { resultText: text, tokenCount: tokens || null, truncated, continuations: rounds };
}

// One Gemini generateContent call with in-process retries on 429/503.
async function geminiRequest(url, body) {
  let lastError = null;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const resp = await fetch(url, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    });

    if (resp.ok) {
      if (attempt > 1) console.log(`[scheduler] Gemini OK on attempt ${attempt}`);
      return resp.json();
    }

    if (RETRY_CODES.has(resp.status)) {
      const errBody = await resp.text().catch(() => '');
      // Retryable status (503 "high demand" / 429 rate limit).
      lastError = new RetryableError(
        `Gemini API error ${resp.status}: ${errBody.slice(0, 200)}`,
        { i18nKey: ERR.overloaded, status: resp.status }
      );
      if (attempt < MAX_RETRIES) {
        const delay = Math.min(BASE_DELAY * Math.pow(2, attempt - 1), MAX_DELAY);
        console.warn(`[scheduler] Gemini ${resp.status} attempt ${attempt}/${MAX_RETRIES} — retry in ${delay/1000}s`);
        await sleep(delay);
        continue;
      }
      // In-process retries exhausted → let runJob reschedule in 30 min.
      throw lastError;
    }

    const errText = await resp.text().catch(() => '');
    throw new Error(`Gemini API error ${resp.status}: ${errText.slice(0, 200)}`);
  }

  throw lastError || new RetryableError('Gemini: max retries exceeded', { i18nKey: ERR.overloaded });
}

// ── Output limits & automatic continuation ──────────────────────
// A provider stops at its output-token limit and reports it (Gemini
// finishReason MAX_TOKENS, OpenAI-style finish_reason "length", Claude
// stop_reason "max_tokens"). Instead of silently saving a cut-off report,
// ask the model to continue and stitch the parts together.
const DEFAULT_OUTPUT_TOKENS = 16384;   // Gemini / Claude: models that accept large outputs
// OpenAI-compatible providers and Perplexity often cap output lower (qwen-plus,
// sonar-pro ≈ 8K) and reject a larger max_tokens with HTTP 400 — keep the old
// default there; long reports are completed by automatic continuation instead.
const COMPAT_OUTPUT_TOKENS  = 8000;
const MAX_CONTINUATIONS     = 3;
const CONTINUE_PROMPT =
  'Your previous response was cut off by the output length limit. Continue exactly where it ' +
  'stopped: do not repeat anything already written, do not add a preamble or summary of what ' +
  'came before, and keep the same language, structure and formatting.';
const TRUNCATION_NOTE =
  '\n\n---\n*[The response was cut off at the provider\'s output limit. Increase "Max tokens" for this job to get the full text.]*';

/**
 * OpenAI-style chat with continuation. send(messages) → parsed JSON response.
 * Returns { resultText, tokenCount, truncated, continuations }.
 */
async function chatWithContinuation(send, messages) {
  let text = '', tokens = 0, truncated = false, rounds = 0, msgs = messages;
  for (;;) {
    const data   = await send(msgs);
    const choice = data?.choices?.[0];
    const part   = choice?.message?.content || '';
    text   += part;
    tokens += data?.usage?.total_tokens || 0;
    truncated = choice?.finish_reason === 'length';
    if (!truncated || !part.trim() || rounds >= MAX_CONTINUATIONS) break;
    rounds++;
    console.warn(`[scheduler] output limit reached — requesting continuation ${rounds}/${MAX_CONTINUATIONS}`);
    msgs = [...msgs, { role: 'assistant', content: part }, { role: 'user', content: CONTINUE_PROMPT }];
  }
  return { resultText: text, tokenCount: tokens || null, truncated, continuations: rounds };
}

// ── DEEPSEEK adapter ─────────────────────────────────────────
async function callDeepSeek(prompt, job) {
  const cfg    = await getProviderConfig('deepseek');
  const apiKey = job.target_ai_key || process.env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('No DeepSeek API key configured');

  console.log(`[scheduler] DeepSeek endpoint=${cfg.endpoint_url} model=${cfg.model_name}`);

  // deepseek-chat accepts at most 8K output tokens; continuation covers longer reports
  const maxTokens = Math.min(job.max_tokens || 8192, /reasoner/i.test(cfg.model_name || '') ? 32768 : 8192);
  return chatWithContinuation(async (messages) => {
    const resp = await fetch(cfg.endpoint_url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        [cfg.auth_header || 'Authorization']: `${cfg.auth_prefix ?? 'Bearer '}${apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model_name, messages, max_tokens: maxTokens }),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      throwProviderError('DeepSeek', resp.status, err);
    }
    return resp.json();
  }, [
    { role: 'system', content: `Today is ${todayStr()}.` },
    { role: 'user',   content: prompt },
  ]);
}

// ── CLAUDE adapter ───────────────────────────────────────────
// Uses web_search_YYYYMMDD with date matching job execution date.
// Costs $10 per 1,000 searches on top of standard token costs.
async function callClaude(prompt, job) {
  const cfg    = await getProviderConfig('claude');
  const apiKey = job.target_ai_key || process.env.CLAUDE_API_KEY;
  if (!apiKey) throw new Error(ERR.no_key);

  console.log(`[scheduler] Claude endpoint=${cfg.endpoint_url} model=${cfg.model_name}`);

  const tools = buildTools(cfg.provider_options, job);
  const send = (messages) => fetch(cfg.endpoint_url, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key':    apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model:      cfg.model_name,
      max_tokens: job.max_tokens || DEFAULT_OUTPUT_TOKENS,
      system:     `Today is ${todayStr()}. This is the real current date — not a future date. ` +
                  `Use web search to find current information before answering questions about recent events.`,
      messages,
      // tools from DB provider_options with dynamic date in web_search type
      ...(tools && { tools }),
    }),
  });

  let messages = [{ role: 'user', content: prompt }];
  let text = '', tokens = 0, truncated = false, rounds = 0, searches = 0;
  for (;;) {
    const resp = await send(messages);
    if (!resp.ok) {
      const errBody = await resp.text().catch(() => '');
      // Parse friendly error message from Anthropic API response
      let friendlyMsg = `Claude API error ${resp.status}`;
      let msg = '';
      try {
        const errJson = JSON.parse(errBody);
        msg = errJson?.error?.message || '';
        if (msg.includes('credit balance is too low') || msg.includes('insufficient')) {
          friendlyMsg = ERR.low_balance;
        } else if (msg.includes('invalid x-api-key') || msg.includes('authentication')) {
          friendlyMsg = ERR.invalid_key;
        } else if (msg.includes('overloaded')) {
          friendlyMsg = ERR.overloaded;
        } else if (msg) {
          friendlyMsg = `Claude API error: ${msg}`;
        }
      } catch {}
      // Anthropic uses 529 "Overloaded" (plus 429/503) for transient outages.
      if (resp.status === 529 || RETRY_CODES.has(resp.status) || msg.includes('overloaded')) {
        throw new RetryableError(friendlyMsg, { i18nKey: ERR.overloaded, status: resp.status });
      }
      throw new Error(friendlyMsg);
    }
    const data = await resp.json();

    // web_search produces multiple content blocks — extract only text blocks
    const part = (data?.content || [])
      .filter(b => b.type === 'text')
      .map(b => b.text)
      .join('');
    text     += part;
    tokens   += (data?.usage?.input_tokens || 0) + (data?.usage?.output_tokens || 0);
    searches += data?.usage?.server_tool_use?.web_search_requests || 0;
    truncated = data?.stop_reason === 'max_tokens';
    if (!truncated || !part.trim() || rounds >= MAX_CONTINUATIONS) break;
    rounds++;
    console.warn(`[scheduler] Claude output limit reached — requesting continuation ${rounds}/${MAX_CONTINUATIONS}`);
    messages = [...messages, { role: 'assistant', content: part }, { role: 'user', content: CONTINUE_PROMPT }];
  }

  if (searches > 0) {
    console.log(`[scheduler] Claude web search: ${searches} request(s) used`);
  } else {
    console.warn('[scheduler] Claude WARNING: web_search did not fire');
  }

  return { resultText: text, tokenCount: tokens || null, truncated, continuations: rounds };
}

// ── PERPLEXITY adapter ───────────────────────────────────────
// Perplexity's "sonar" models have built-in web search.
// No extra tools needed — search is always active.
// Docs: https://docs.perplexity.ai/api-reference/chat-completions
async function callPerplexity(prompt, job) {
  const cfg    = await getProviderConfig('perplexity');
  const apiKey = job.target_ai_key;
  if (!apiKey) throw new Error('No Perplexity API key configured');

  console.log(`[scheduler] Perplexity endpoint=${cfg.endpoint_url} model=${cfg.model_name}`);

  return chatWithContinuation(async (messages) => {
    const resp = await fetch(cfg.endpoint_url, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: cfg.model_name,  // e.g. "sonar" — has built-in search
        messages,
        max_tokens: job.max_tokens || COMPAT_OUTPUT_TOKENS,
        // Extra params from DB provider_options:
        //   return_citations: true, search_recency_filter: 'week'
        ...cfg.provider_options,
      }),
    });
    if (!resp.ok) {
      const err = await resp.text().catch(() => '');
      throwProviderError('Perplexity', resp.status, err);
    }
    const data = await resp.json();
    console.log(`[scheduler] Perplexity citations: ${data?.citations?.length || 0}`);
    return data;
  }, [
    {
      role:    'system',
      content: `Today is ${todayStr()}. This is the real current date — not a future date. ` +
               `Always search the web for current information. ` +
               `Never refuse to answer claiming dates are in the future.`,
    },
    { role: 'user', content: prompt },
  ]);
}

// ── GENERIC OpenAI-compatible adapter ────────────────────────
// Used for: Mistral, Groq, GPT-4, OpenRouter, Together, Qwen,
// and any future provider.
// All config (URL, model, auth) comes exclusively from DB.
// NOTE: DeepSeek and most models here do NOT have built-in web
//       search — they rely only on training data.
async function callOpenAICompatible(prompt, job) {
  const cfg    = await getProviderConfig(job.target_ai);
  const apiKey = job.target_ai_key;
  if (!apiKey) throw new Error(`No API key configured for ${job.target_ai}`);

  console.log(`[scheduler] ${job.target_ai} endpoint=${cfg.endpoint_url} model=${cfg.model_name}`);

  return chatWithContinuation(async (messages) => {
    const resp = await fetch(cfg.endpoint_url, {
      method:  'POST',
      headers: {
        'Content-Type': 'application/json',
        [cfg.auth_header || 'Authorization']: `${cfg.auth_prefix ?? 'Bearer '}${apiKey}`,
      },
      body: JSON.stringify({ model: cfg.model_name, messages, max_tokens: job.max_tokens || COMPAT_OUTPUT_TOKENS }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => '');
      throwProviderError(cfg.label || job.target_ai, resp.status, errText);
    }
    return resp.json();
  }, [
    {
      role:    'system',
      content: `Today is ${todayStr()}. This is the real current date — not a future date. ` +
               `Search the web for the most current information before answering questions about recent events. ` +
               `Never refuse to answer claiming dates are in the future.`,
    },
    { role: 'user', content: prompt },
  ]);
}

// ── Main poll loop ────────────────────────────────────────────

// Guard against overlapping ticks: a slow batch must not let the next
// setInterval tick start while jobs are still being processed.
let pollInProgress = false;
const STALE_RUNNING_MINUTES = 60;   // a 'running' job older than this is considered abandoned

async function pollAndRun() {
  if (pollInProgress) return;
  pollInProgress = true;
  try {
    // Reclaim jobs stuck in 'running' (scheduler crashed or restarted mid-run).
    // No poll of this process is in flight here, so these rows belong to a dead run.
    const { rowCount: reclaimed } = await pool.query(
      `UPDATE scheduled_jobs SET status='pending'
       WHERE is_active=true AND status='running'
         AND (last_run_at IS NULL OR last_run_at < now() - make_interval(mins => $1))`,
      [STALE_RUNNING_MINUTES]
    );
    if (reclaimed) console.warn(`[scheduler] Reclaimed ${reclaimed} stale running job(s)`);

    // Atomically claim due jobs: SKIP LOCKED + the status flip in the same
    // statement means no other poller (or overlapping tick) can claim them too.
    const { rows: dueJobs } = await pool.query(
      `UPDATE scheduled_jobs SET status='running', last_run_at=now()
       WHERE id IN (
         SELECT id FROM scheduled_jobs
         WHERE is_active=true AND status='pending' AND next_run_at <= now()
         ORDER BY next_run_at ASC
         LIMIT 10
         FOR UPDATE SKIP LOCKED
       )
       RETURNING *`
    );
    dueJobs.sort((a, b) => a.next_run_at - b.next_run_at);

    for (const job of dueJobs) {
      // Run sequentially to avoid thundering herd
      await runJob(job).catch(err =>
        console.error(`[scheduler] Unhandled error for job ${job.id}:`, err.message)
      );
    }
  } catch (err) {
    console.error('[scheduler] Poll error:', err.message);
  } finally {
    pollInProgress = false;
  }
}

// Start polling
pollAndRun();
setInterval(pollAndRun, parseInt(SCHEDULER_INTERVAL_MS));

process.on('SIGTERM', () => { pool.end(); process.exit(0); });