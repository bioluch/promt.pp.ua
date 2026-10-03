/**
 * api/server.js — JS PROMPT v2
 * Express API backend: auth, prompts, search, stats, scheduler.
 * Runs on port 3100. nginx proxies /api/* → http://127.0.0.1:3100
 *
 * Systemd: /etc/systemd/system/jsprompt-api.service
 *
 * Requires:
 *   npm install express pg jsonwebtoken nodemailer crypto dotenv
 *              helmet cors express-rate-limit
 */
'use strict';

const express      = require('express');
const { Pool }     = require('pg');
const jwt          = require('jsonwebtoken');
const nodemailer   = require('nodemailer');
const crypto       = require('crypto');
const helmet       = require('helmet');
const cors         = require('cors');
const rateLimit    = require('express-rate-limit');
const path         = require('path');
const fs           = require('fs');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFileAsync = promisify(execFile);
const webpush      = require('web-push');

// ── Load .env ──────────────────────────────────────────────────
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const {
  PORT          = 3100,
  PG_HOST       = '127.0.0.1',
  PG_PORT       = 5432,
  PG_DB         = 'jsprompt',
  PG_USER       = 'jsprompt_app',
  PG_PASSWORD,
  JWT_SECRET,
  JWT_REFRESH_SECRET,
  MAIL_HOST     = '127.0.0.1',
  MAIL_PORT     = 587,
  MAIL_USER,
  MAIL_PASS,
  MAIL_FROM     = 'noreply@promt.pp.ua',
  APP_URL       = 'https://promt.pp.ua',
  DEEPSEEK_API_KEY,
  NODE_ENV      = 'production',
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT = 'mailto:admin@promt.pp.ua',
} = process.env;

if (!JWT_SECRET || !JWT_REFRESH_SECRET || !PG_PASSWORD) {
  console.error('[FATAL] Missing required env vars: JWT_SECRET, JWT_REFRESH_SECRET, PG_PASSWORD');
  process.exit(1);
}

// ── Web Push (VAPID) ───────────────────────────────────────────
let pushEnabled = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  pushEnabled = true;
  console.log('[api] Web Push enabled');
} else {
  console.warn('[api] Web Push disabled — set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in .env');
}

// ── PostgreSQL pool ────────────────────────────────────────────
const pool = new Pool({
  host:     PG_HOST,
  port:     parseInt(PG_PORT),
  database: PG_DB,
  user:     PG_USER,
  password: PG_PASSWORD,
  max:      20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

pool.on('error', (err) => console.error('[PG] Unexpected error:', err.message));

// ── Backup storage ─────────────────────────────────────────────
const BACKUP_DIR = path.resolve(__dirname, '../backups');
if (!fs.existsSync(BACKUP_DIR)) fs.mkdirSync(BACKUP_DIR, { recursive: true });
const BACKUP_FILENAME_RE = /^(jsprompt|uploaded)_[0-9]{4}-[0-9]{2}-[0-9]{2}_[0-9]{2}-[0-9]{2}-[0-9]{2}\.sql\.gz$/;

// ── Mail transporter (Mailcow SMTP) ───────────────────────────
const mailer = nodemailer.createTransport({
  host:   MAIL_HOST,
  port:   parseInt(MAIL_PORT),
  secure: parseInt(MAIL_PORT) === 465,
  auth:   { user: MAIL_USER, pass: MAIL_PASS },
  tls:    { rejectUnauthorized: false },
});

// ── Express app ────────────────────────────────────────────────
const app = express();

app.use(helmet({ contentSecurityPolicy: false }));  // CSP handled by nginx
app.use(express.json({ limit: '2mb' }));
app.use(cors({
  origin:      APP_URL,
  credentials: true,
  methods:     ['GET','POST','PUT','PATCH','DELETE','OPTIONS'],
}));
app.set('trust proxy', 1);   // behind nginx

// ── Rate limiters ──────────────────────────────────────────────
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 min
  max: 30,
  message: { error: 'Too many auth requests. Try again in 15 minutes.' },
  standardHeaders: true, legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 60 * 1000,  // 1 min
  max: 120,
  message: { error: 'Rate limit exceeded.' },
  standardHeaders: true, legacyHeaders: false,
});

app.use('/api/', apiLimiter);
app.use('/api/auth/', authLimiter);

// ── Utilities ──────────────────────────────────────────────────
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function generateToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    JWT_SECRET,
    { expiresIn: '2h' }
  );
}

function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    JWT_REFRESH_SECRET,
    { expiresIn: '30d' }
  );
}

// ── Auth middleware ────────────────────────────────────────────
async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    // Quick DB check that user is still active
    const { rows } = await pool.query(
      'SELECT id, email, role, is_active FROM users WHERE id=$1', [payload.sub]
    );
    if (!rows[0] || !rows[0].is_active) return res.status(401).json({ error: 'Unauthorized' });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

function requireAdmin(req, res, next) {
  if (req.user?.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  next();
}

// ── Mail helper ───────────────────────────────────────────────
async function sendMagicLink(email, rawToken) {
  const link = `${APP_URL}/api/auth/verify?token=${rawToken}`;
  await mailer.sendMail({
    from:    MAIL_FROM,
    to:      email,
    subject: 'Sign in to JS PROMPT',
    html: `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0a1929;color:#e3f2fd;padding:40px;">
<div style="max-width:480px;margin:0 auto;background:#132f4c;border-radius:12px;padding:32px;border:1px solid rgba(79,195,247,0.2);">
  <h2 style="color:#4fc3f7;margin-top:0;">🔑 Sign in to JS PROMPT</h2>
  <p>Click the button below to sign in. This link is valid for <strong>15 minutes</strong> and can only be used once.</p>
  <a href="${link}" style="display:inline-block;background:#4fc3f7;color:#0a1929;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Sign In</a>
  <p style="font-size:13px;color:#90a4ae;">If you did not request this, ignore this email. Link expires automatically.</p>
  <hr style="border-color:rgba(79,195,247,0.1);margin:24px 0;">
  <p style="font-size:12px;color:#607080;">JS PROMPT · promt.pp.ua</p>
</div></body></html>`,
    text: `Sign in to JS PROMPT:\n\n${link}\n\nThis link expires in 15 minutes.`,
  });
}

// ══════════════════════════════════════════════════════════════
//  AUTH ROUTES
// ══════════════════════════════════════════════════════════════

// POST /api/auth/send-link — request magic-link email
app.post('/api/auth/send-link', async (req, res) => {
  const { email } = req.body;
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Valid email required' });
  }
  const emailLower = email.trim().toLowerCase();

  try {
    // Upsert user (auto-register on first login)
    const { rows } = await pool.query(
      `INSERT INTO users (email)
       VALUES ($1)
       ON CONFLICT (lower(email::text)) DO UPDATE SET email=EXCLUDED.email
       RETURNING id, email, role, is_active`,
      [emailLower]
    );
    const user = rows[0];
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });

    // Invalidate previous unused tokens for this user
    await pool.query(
      `UPDATE auth_tokens SET used_at=now()
       WHERE user_id=$1 AND used_at IS NULL AND expires_at > now()`,
      [user.id]
    );

    // Create new magic-link token
    const rawToken  = generateToken(32);
    const tokenHash = sha256(rawToken);
    await pool.query(
      `INSERT INTO auth_tokens (user_id, token_hash) VALUES ($1, $2)`,
      [user.id, tokenHash]
    );

    // Send email (do not await in prod — send async)
    sendMagicLink(emailLower, rawToken).catch(err =>
      console.error('[mail] Failed to send magic link:', err.message)
    );

    // Never reveal whether account existed
    res.json({ message: 'If an account exists, a sign-in link has been sent.' });
  } catch (err) {
    console.error('[auth/send-link]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify?token=xxx — consume magic link
app.get('/api/auth/verify', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).json({ error: 'Token required' });

  const tokenHash = sha256(token);
  try {
    const { rows } = await pool.query(
      `SELECT at.id, at.user_id, at.expires_at, at.used_at,
              u.email, u.role, u.is_active
       FROM auth_tokens at
       JOIN users u ON u.id = at.user_id
       WHERE at.token_hash = $1`,
      [tokenHash]
    );
    const rec = rows[0];
    if (!rec)              return res.status(400).json({ error: 'Invalid link' });
    if (rec.used_at)       return res.status(400).json({ error: 'Link already used' });
    if (rec.expires_at < new Date()) return res.status(400).json({ error: 'Link expired' });
    if (!rec.is_active)    return res.status(403).json({ error: 'Account disabled' });

    // Mark token used
    await pool.query(`UPDATE auth_tokens SET used_at=now() WHERE id=$1`, [rec.id]);

    // Update last_login
    await pool.query(
      `UPDATE users SET last_login_at=now(), login_count=login_count+1 WHERE id=$1`,
      [rec.user_id]
    );

    // Create session with refresh token
    const rawRefresh = generateToken(40);
    const refreshHash = sha256(rawRefresh);
    const ip = req.ip;
    const ua = req.headers['user-agent'] || '';
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [rec.user_id, refreshHash, ip, ua.slice(0, 300)]
    );

    // Log event
    await pool.query(
      `INSERT INTO usage_events (user_id, event_type) VALUES ($1, 'login')`,
      [rec.user_id]
    );

    const user = { id: rec.user_id, email: rec.email, role: rec.role };
    const accessToken  = signAccessToken(user);

    // Redirect to app with tokens in fragment (or return JSON for SPA)
    // Using fragment so tokens never appear in server logs
    const redirectUrl = `${APP_URL}/#auth_success&access=${accessToken}&refresh=${rawRefresh}`;
    res.redirect(302, redirectUrl);
  } catch (err) {
    console.error('[auth/verify]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/refresh — exchange refresh token for new access token
app.post('/api/auth/refresh', async (req, res) => {
  const { refresh_token } = req.body;
  if (!refresh_token) return res.status(400).json({ error: 'refresh_token required' });

  const refreshHash = sha256(refresh_token);
  try {
    const { rows } = await pool.query(
      `SELECT s.user_id, s.expires_at, s.revoked_at,
              u.email, u.role, u.is_active
       FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1`,
      [refreshHash]
    );
    const sess = rows[0];
    if (!sess || sess.revoked_at || sess.expires_at < new Date() || !sess.is_active) {
      return res.status(401).json({ error: 'Invalid or expired session' });
    }
    const user = { id: sess.user_id, email: sess.email, role: sess.role };
    res.json({ access_token: signAccessToken(user) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/logout
app.post('/api/auth/logout', requireAuth, async (req, res) => {
  const { refresh_token } = req.body;
  if (refresh_token) {
    const refreshHash = sha256(refresh_token);
    await pool.query(
      `UPDATE sessions SET revoked_at=now() WHERE token_hash=$1 AND user_id=$2`,
      [refreshHash, req.user.id]
    );
  }
  res.json({ message: 'Logged out' });
});

// GET /api/auth/me
app.get('/api/auth/me', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT id, email, display_name, role, created_at, last_login_at, login_count
     FROM users WHERE id=$1`, [req.user.id]
  );
  res.json(rows[0]);
});

// ══════════════════════════════════════════════════════════════
//  SOURCE TEXTS (user input drafts)
// ══════════════════════════════════════════════════════════════

// POST /api/sources — save raw input text
app.post('/api/sources', requireAuth, async (req, res) => {
  const { original_text, translated_text, detected_lang, domain } = req.body;
  if (!original_text?.trim()) return res.status(400).json({ error: 'original_text required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO source_texts (user_id, original_text, translated_text, detected_lang, domain)
       VALUES ($1,$2,$3,$4,$5) RETURNING *`,
      [req.user.id, original_text, translated_text||null, detected_lang||'en', domain||'general']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[sources/post]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/sources — list user's source texts
app.get('/api/sources', requireAuth, async (req, res) => {
  const { domain, q, limit=50, offset=0 } = req.query;
  let sql = `SELECT * FROM source_texts WHERE user_id=$1 AND NOT is_deleted`;
  const params = [req.user.id];
  if (domain) { params.push(domain); sql += ` AND p.domain=$${params.length}`; }
  if (q) {
    params.push(q);
    sql += ` AND (original_text ILIKE '%'||$${params.length}||'%' OR translated_text ILIKE '%'||$${params.length}||'%')`;
  }
  sql += ` ORDER BY created_at DESC LIMIT $${params.push(Math.min(parseInt(limit),200))} OFFSET $${params.push(parseInt(offset))}`;
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

// DELETE /api/sources/:id
app.delete('/api/sources/:id', requireAuth, async (req, res) => {
  await pool.query(
    `UPDATE source_texts SET is_deleted=true WHERE id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Deleted' });
});

// ══════════════════════════════════════════════════════════════
//  PROMPTS (generated output)
// ══════════════════════════════════════════════════════════════

// POST /api/prompts — save generated prompt
app.post('/api/prompts', requireAuth, async (req, res) => {
  const {
    source_text_id, title, content, domain,
    style, output_lang, engine, token_count, word_count, quality_score
  } = req.body;

  if (!content?.trim()) return res.status(400).json({ error: 'content required' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO prompts
         (user_id, source_text_id, title, content, domain, style, output_lang, engine,
          token_count, word_count, quality_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
       RETURNING *`,
      [
        req.user.id, source_text_id||null,
        (title||'').slice(0,300) || content.slice(0,80),
        content, domain||'general', style||null, output_lang||null,
        engine||null, token_count||null, word_count||null, quality_score||null
      ]
    );

    // Log stats event
    await pool.query(
      `INSERT INTO usage_events (user_id, event_type, domain, engine, token_count)
       VALUES ($1,'prompt_generated',$2,$3,$4)`,
      [req.user.id, domain||'general', engine||null, token_count||null]
    );

    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[prompts/post]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/prompts — search + list user prompts
app.get('/api/prompts', requireAuth, async (req, res) => {
  const { domain, q, limit=50, offset=0 } = req.query;
  let sql = `SELECT p.id, p.title, p.domain, p.style, p.output_lang, p.engine, p.token_count,
                    p.word_count, p.quality_score, p.created_at, p.updated_at,
                    left(p.content, 200) AS content_preview,
                    left(s.original_text, 150) AS source_original_text
             FROM prompts p
             LEFT JOIN source_texts s ON s.id = p.source_text_id
             WHERE p.user_id=$1 AND NOT p.is_deleted`;
  const params = [req.user.id];

  if (domain) { params.push(domain); sql += ` AND p.domain=$${params.length}`; }
  if (q) {
    params.push(`%${q}%`);
    sql += ` AND (title ILIKE $${params.length} OR content ILIKE $${params.length})`;
  }
  sql += ` ORDER BY created_at DESC LIMIT $${params.push(Math.min(parseInt(limit),200))} OFFSET $${params.push(parseInt(offset))}`;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

// GET /api/prompts/:id — full prompt content
app.get('/api/prompts/:id', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT p.*, s.original_text AS source_original_text
     FROM prompts p
     LEFT JOIN source_texts s ON s.id = p.source_text_id
     WHERE p.id=$1 AND p.user_id=$2 AND NOT p.is_deleted`,
    [req.params.id, req.user.id]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// PUT /api/prompts/:id — update title or content
app.put('/api/prompts/:id', requireAuth, async (req, res) => {
  const { title, content } = req.body;
  const { rows } = await pool.query(
    `UPDATE prompts
     SET title=COALESCE($3,title), content=COALESCE($4,content), updated_at=now()
     WHERE id=$1 AND user_id=$2 AND NOT is_deleted
     RETURNING *`,
    [req.params.id, req.user.id, title||null, content||null]
  );
  if (!rows[0]) return res.status(404).json({ error: 'Not found' });
  res.json(rows[0]);
});

// DELETE /api/prompts/:id
app.delete('/api/prompts/:id', requireAuth, async (req, res) => {
  await pool.query(
    `UPDATE prompts SET is_deleted=true WHERE id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Deleted' });
});

// ══════════════════════════════════════════════════════════════
//  STATISTICS
// ══════════════════════════════════════════════════════════════

// GET /api/stats — user dashboard statistics
app.get('/api/stats', requireAuth, async (req, res) => {
  try {
    // Per-domain counts
    const domainStats = await pool.query(
      `SELECT domain, prompt_count, total_tokens, last_created_at
       FROM user_domain_stats WHERE user_id=$1 ORDER BY prompt_count DESC`,
      [req.user.id]
    );

    // Total prompts
    const totals = await pool.query(
      `SELECT COUNT(*) AS total_prompts,
              COALESCE(SUM(token_count),0) AS total_tokens,
              COALESCE(AVG(token_count),0) AS avg_tokens
       FROM prompts WHERE user_id=$1 AND NOT is_deleted`,
      [req.user.id]
    );

    // Recent activity (last 30 days, grouped by day)
    const activity = await pool.query(
      `SELECT DATE(created_at) AS day, COUNT(*) AS count
       FROM prompts
       WHERE user_id=$1 AND NOT is_deleted
         AND created_at > now() - INTERVAL '30 days'
       GROUP BY day ORDER BY day`,
      [req.user.id]
    );

    // Engines used
    const engines = await pool.query(
      `SELECT COALESCE(engine,'unknown') AS engine, COUNT(*) AS count
       FROM prompts WHERE user_id=$1 AND NOT is_deleted
       GROUP BY engine`,
      [req.user.id]
    );

    res.json({
      totals:      totals.rows[0],
      by_domain:   domainStats.rows,
      activity:    activity.rows,
      by_engine:   engines.rows,
    });
  } catch (err) {
    console.error('[stats]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  SCHEDULED JOBS
// ══════════════════════════════════════════════════════════════

// POST /api/jobs — create scheduled job
app.post('/api/jobs', requireAuth, async (req, res) => {
  const {
    prompt_id, target_ai, schedule_type,
    next_run_at, run_days, run_dates, run_time, timezone, max_runs, max_tokens
  } = req.body;
  if (!prompt_id || !next_run_at) {
    return res.status(400).json({ error: 'prompt_id and next_run_at required' });
  }
  // Verify prompt belongs to user
  const { rowCount } = await pool.query(
    `SELECT 1 FROM prompts WHERE id=$1 AND user_id=$2 AND NOT is_deleted`,
    [prompt_id, req.user.id]
  );
  if (!rowCount) return res.status(404).json({ error: 'Prompt not found' });

  const { rows } = await pool.query(
    `INSERT INTO scheduled_jobs
       (user_id, prompt_id, target_ai, schedule_type, next_run_at,
        run_days, run_dates, run_time, timezone, max_runs, max_tokens)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
    [req.user.id, prompt_id, target_ai||'gemini', schedule_type||'once',
     next_run_at, run_days||null, run_dates||null, run_time||null,
     timezone||'UTC', max_runs||null, max_tokens||null]
  );
  res.status(201).json(rows[0]);
});

// GET /api/jobs — list user's scheduled jobs
app.get('/api/jobs', requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT j.*, p.title AS prompt_title, p.domain
     FROM scheduled_jobs j JOIN prompts p ON p.id=j.prompt_id
     WHERE j.user_id=$1 ORDER BY j.created_at DESC`,
    [req.user.id]
  );
  res.json(rows);
});

// GET /api/jobs/:id/results — execution results for a job
app.get('/api/jobs/:id/results', requireAuth, async (req, res) => {
  const { from, to } = req.query;
  let sql = `SELECT * FROM job_results WHERE job_id=$1 AND user_id=$2`;
  const params = [req.params.id, req.user.id];
  if (from) { params.push(from); sql += ` AND ran_at >= $${params.length}`; }
  if (to)   { params.push(to);   sql += ` AND ran_at <= $${params.length}`; }
  sql += ' ORDER BY ran_at DESC LIMIT 100';
  const { rows } = await pool.query(sql, params);
  res.json(rows);
});

// DELETE /api/jobs/:id/permanent — fully delete job and its results
app.delete('/api/jobs/:id/permanent', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM job_results WHERE job_id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    await pool.query(`DELETE FROM scheduled_jobs WHERE id=$1 AND user_id=$2`, [req.params.id, req.user.id]);
    res.status(204).end();
  } catch (err) {
    console.error('[jobs/permanent-delete]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/jobs/:id
app.delete('/api/jobs/:id', requireAuth, async (req, res) => {
  await pool.query(
    `UPDATE scheduled_jobs SET status='cancelled', is_active=false WHERE id=$1 AND user_id=$2`,
    [req.params.id, req.user.id]
  );
  res.json({ message: 'Job cancelled' });
});

// ══════════════════════════════════════════════════════════════
//  PUSH NOTIFICATIONS (Web Push / VAPID)
// ══════════════════════════════════════════════════════════════

// GET /api/push/vapid-public-key — public key for the browser subscription
app.get('/api/push/vapid-public-key', (req, res) => {
  if (!pushEnabled) return res.status(503).json({ error: 'Push not configured' });
  res.json({ key: VAPID_PUBLIC_KEY });
});

// POST /api/push/subscribe — save a browser push subscription
app.post('/api/push/subscribe', requireAuth, async (req, res) => {
  const sub = req.body; // { endpoint, keys: { p256dh, auth }, lang }
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return res.status(400).json({ error: 'Invalid subscription' });
  }
  const lang = ['en', 'uk', 'es'].includes(sub.lang) ? sub.lang : 'en';
  try {
    await pool.query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent, lang)
       VALUES ($1,$2,$3,$4,$5,$6)
       ON CONFLICT (endpoint) DO UPDATE
         SET user_id = $1, p256dh = $3, auth = $4, user_agent = $5, lang = $6`,
      [req.user.id, sub.endpoint, sub.keys.p256dh, sub.keys.auth,
       (req.headers['user-agent'] || '').slice(0, 300), lang]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[push/subscribe]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/push/unsubscribe — remove a subscription (e.g. on logout)
app.post('/api/push/unsubscribe', requireAuth, async (req, res) => {
  const { endpoint } = req.body || {};
  if (!endpoint) return res.status(400).json({ error: 'endpoint required' });
  await pool.query(
    `DELETE FROM push_subscriptions WHERE endpoint=$1 AND user_id=$2`,
    [endpoint, req.user.id]
  );
  res.json({ ok: true });
});

// ══════════════════════════════════════════════════════════════
//  ADMIN — AI PROVIDER ENDPOINTS MAP (view/edit/export/import)
// ══════════════════════════════════════════════════════════════

// GET /api/admin/provider-endpoints — list the global AI provider map
app.get('/api/admin/provider-endpoints', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT provider_key, label, endpoint_url, model_name, auth_header, auth_prefix,
              is_builtin, is_active, provider_options, created_at, updated_at
       FROM ai_provider_endpoints ORDER BY is_builtin DESC, label`
    );
    res.json({ providers: rows });
  } catch (err) {
    console.error('[admin/provider-endpoints/get]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/provider-endpoints — create or update a provider entry
app.post('/api/admin/provider-endpoints', requireAuth, requireAdmin, async (req, res) => {
  const { provider_key, label, endpoint_url, model_name, auth_header, auth_prefix, is_active, is_builtin, provider_options } = req.body;
  if (!provider_key || !label || !endpoint_url || !model_name) {
    return res.status(400).json({ error: 'provider_key, label, endpoint_url, model_name required' });
  }
  try {
    await pool.query(
      `INSERT INTO ai_provider_endpoints
         (provider_key, label, endpoint_url, model_name, auth_header, auth_prefix,
          is_builtin, is_active, provider_options, updated_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,now())
       ON CONFLICT (provider_key) DO UPDATE SET
         label=$2, endpoint_url=$3, model_name=$4,
         auth_header=COALESCE($5,ai_provider_endpoints.auth_header),
         auth_prefix=COALESCE($6,ai_provider_endpoints.auth_prefix),
         is_builtin=COALESCE($7,ai_provider_endpoints.is_builtin),
         is_active=COALESCE($8,ai_provider_endpoints.is_active),
         provider_options=COALESCE($9,ai_provider_endpoints.provider_options),
         updated_at=now()`,
      [provider_key, label, endpoint_url, model_name,
       auth_header || 'Authorization', auth_prefix ?? 'Bearer ',
       is_builtin === true,
       is_active !== false,
       provider_options ? JSON.stringify(provider_options) : null]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[admin/provider-endpoints/post]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/provider-endpoints/:key — remove a non-builtin provider
app.delete('/api/admin/provider-endpoints/:key', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT is_builtin FROM ai_provider_endpoints WHERE provider_key=$1`, [req.params.key]);
    if (rows[0]?.is_builtin) return res.status(403).json({ error: 'Cannot delete a built-in provider' });
    await pool.query(`DELETE FROM ai_provider_endpoints WHERE provider_key=$1`, [req.params.key]);
    res.status(204).end();
  } catch (err) {
    console.error('[admin/provider-endpoints/delete]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/provider-endpoints/export — download the full map as JSON
app.get('/api/admin/provider-endpoints/export', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(`SELECT * FROM ai_provider_endpoints ORDER BY label`);
    res.json({ providers: rows, exportedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[admin/provider-endpoints/export]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/provider-endpoints/import — bulk import the map from a file
app.post('/api/admin/provider-endpoints/import', requireAuth, requireAdmin, async (req, res) => {
  const { providers } = req.body;
  if (!Array.isArray(providers)) return res.status(400).json({ error: 'providers array required' });
  try {
    let count = 0;
    for (const p of providers) {
      if (!p.provider_key || !p.label || !p.endpoint_url || !p.model_name) continue;
      await pool.query(
        `INSERT INTO ai_provider_endpoints
           (provider_key, label, endpoint_url, model_name, auth_header, auth_prefix, is_builtin, is_active, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,now())
         ON CONFLICT (provider_key) DO UPDATE SET
           label=$2, endpoint_url=$3, model_name=$4, auth_header=$5, auth_prefix=$6, is_active=$8, updated_at=now()`,
        [p.provider_key, p.label, p.endpoint_url, p.model_name,
         p.auth_header || 'Authorization', p.auth_prefix ?? 'Bearer ',
         !!p.is_builtin, p.is_active !== false]
      );
      count++;
    }
    res.json({ ok: true, imported: count });
  } catch (err) {
    console.error('[admin/provider-endpoints/import]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  ADMIN — USER MANAGEMENT (delete, create, wipe)
// ══════════════════════════════════════════════════════════════

// DELETE /api/admin/users/:id — permanently delete a user account
app.delete('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Cannot delete your own account' });
  try {
    await pool.query(`DELETE FROM users WHERE id=$1`, [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error('[admin/users/delete]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/users — create a new user account (admin-initiated, pre-verified)
app.post('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const { email, password, display_name, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const emailClean = email.trim().toLowerCase();
  try {
    const existing = await pool.query('SELECT id FROM users WHERE lower(email)=$1', [emailClean]);
    if (existing.rows[0]) return res.status(409).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash, role, email_verified, is_active)
       VALUES ($1,$2,$3,$4,true,true) RETURNING id, email, role, display_name`,
      [emailClean, display_name || null, password_hash, role === 'admin' ? 'admin' : 'user']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    console.error('[admin/users/post]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/wipe-database — DANGER: deletes all user data (keeps schema)
app.post('/api/admin/wipe-database', requireAuth, requireAdmin, async (req, res) => {
  const { confirm } = req.body;
  if (confirm !== 'WIPE_EVERYTHING') {
    return res.status(400).json({ error: 'Must send { confirm: "WIPE_EVERYTHING" } to proceed' });
  }
  try {
    await pool.query(`DELETE FROM users WHERE id != $1`, [req.user.id]); // cascades to all owned data
    res.json({ ok: true, message: 'All other accounts and their data wiped. Your admin account was preserved.' });
  } catch (err) {
    console.error('[admin/wipe-database]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  ADMIN — VIEW / MANAGE ALL USERS' PROMPTS & SOURCE TEXTS
// ══════════════════════════════════════════════════════════════

// GET /api/admin/prompts — list ALL prompts across all users (with source text)
app.get('/api/admin/prompts', requireAuth, requireAdmin, async (req, res) => {
  const { q, user_id, limit = 100, offset = 0 } = req.query;
  let sql = `SELECT p.id, p.title, p.domain, p.token_count, p.word_count, p.quality_score,
                    p.created_at, u.email AS user_email, u.id AS user_id,
                    left(p.content, 300) AS content_preview,
                    s.original_text AS source_original_text
             FROM prompts p
             JOIN users u ON u.id = p.user_id
             LEFT JOIN source_texts s ON s.id = p.source_text_id
             WHERE NOT p.is_deleted`;
  const params = [];
  if (user_id) { params.push(user_id); sql += ` AND p.user_id=$${params.length}`; }
  if (q) { params.push(`%${q}%`); sql += ` AND (p.title ILIKE $${params.length} OR p.content ILIKE $${params.length})`; }
  sql += ` ORDER BY p.created_at DESC LIMIT $${params.push(Math.min(parseInt(limit),300))} OFFSET $${params.push(parseInt(offset))}`;
  try {
    const { rows } = await pool.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error('[admin/prompts/get]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/prompts/:id — full prompt content (admin can view any user's prompt)
app.get('/api/admin/prompts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT p.*, u.email AS user_email, s.original_text AS source_original_text
       FROM prompts p JOIN users u ON u.id=p.user_id
       LEFT JOIN source_texts s ON s.id = p.source_text_id
       WHERE p.id=$1`,
      [req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[admin/prompts/:id/get]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/prompts/:id — edit any user's prompt (title, content, domain, owner)
app.put('/api/admin/prompts/:id', requireAuth, requireAdmin, async (req, res) => {
  const { title, content, domain, user_email } = req.body;
  try {
    let targetUserId = null;
    if (user_email) {
      const emailLower = String(user_email).trim().toLowerCase();
      const { rows: userRows } = await pool.query(
        'SELECT id FROM users WHERE lower(email::text)=$1', [emailLower]
      );
      if (!userRows[0]) return res.status(400).json({ error: 'No user found with that email' });
      targetUserId = userRows[0].id;
    }

    const { rows } = await pool.query(
      `UPDATE prompts
       SET title=COALESCE($2,title),
           content=COALESCE($3,content),
           domain=COALESCE($4,domain),
           user_id=COALESCE($5,user_id),
           updated_at=now()
       WHERE id=$1 RETURNING *`,
      [req.params.id, title || null, content || null, domain || null, targetUserId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    console.error('[admin/prompts/:id/put]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/prompts/:id — soft-delete any user's prompt
app.delete('/api/admin/prompts/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query(`UPDATE prompts SET is_deleted=true WHERE id=$1`, [req.params.id]);
    res.status(204).end();
  } catch (err) {
    console.error('[admin/prompts/:id/delete]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/admin/prompts/:id/copy — duplicate a prompt (admin tool, can target any user/title/domain)
app.post('/api/admin/prompts/:id/copy', requireAuth, requireAdmin, async (req, res) => {
  const { title, domain, user_email } = req.body || {};
  try {
    const { rows } = await pool.query(`SELECT * FROM prompts WHERE id=$1`, [req.params.id]);
    const orig = rows[0];
    if (!orig) return res.status(404).json({ error: 'Not found' });

    let targetUserId = orig.user_id;
    if (user_email) {
      const emailLower = String(user_email).trim().toLowerCase();
      const { rows: userRows } = await pool.query(
        'SELECT id FROM users WHERE lower(email::text)=$1', [emailLower]
      );
      if (!userRows[0]) return res.status(400).json({ error: 'No user found with that email' });
      targetUserId = userRows[0].id;
    }

    const finalTitle  = (title && title.trim()) ? title.trim() : (orig.title + ' (copy)');
    const finalDomain = (domain && domain.trim()) ? domain.trim() : orig.domain;

    const { rows: copyRows } = await pool.query(
      `INSERT INTO prompts (user_id, source_text_id, title, content, domain, style, output_lang, engine, token_count, word_count, quality_score)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [targetUserId, orig.source_text_id, finalTitle, orig.content, finalDomain,
       orig.style, orig.output_lang, orig.engine, orig.token_count, orig.word_count, orig.quality_score]
    );
    res.status(201).json(copyRows[0]);
  } catch (err) {
    console.error('[admin/prompts/:id/copy]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// ══════════════════════════════════════════════════════════════
//  ADMIN ROUTES
// ══════════════════════════════════════════════════════════════

// GET /api/admin/users
app.get('/api/admin/users', requireAuth, requireAdmin, async (req, res) => {
  const { rows } = await pool.query(
    `SELECT u.id, u.email, u.display_name, u.role, u.is_active,
            u.created_at, u.last_login_at, u.login_count,
            COUNT(DISTINCT p.id) AS prompt_count
     FROM users u
     LEFT JOIN prompts p ON p.user_id=u.id AND NOT p.is_deleted
     GROUP BY u.id ORDER BY u.created_at DESC`
  );
  res.json(rows);
});

// PATCH /api/admin/users/:id
app.patch('/api/admin/users/:id', requireAuth, requireAdmin, async (req, res) => {
  const { is_active, role, display_name } = req.body;
  const { rows } = await pool.query(
    `UPDATE users
     SET is_active=COALESCE($2,is_active),
         role=COALESCE($3,role),
         display_name=COALESCE($4,display_name)
     WHERE id=$1 RETURNING *`,
    [req.params.id, is_active, role, display_name]
  );
  res.json(rows[0]);
});

// ── ADMIN: User API Keys management ─────────────────────────

// GET /api/admin/users/:id/keys — list all provider keys for a user (masked)
app.get('/api/admin/users/:id/keys', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT provider, label, key_prefix, is_builtin, updated_at
       FROM user_provider_keys WHERE user_id=$1 ORDER BY provider`,
      [req.params.id]
    );
    res.json({ keys: rows });
  } catch (err) {
    console.error('[admin/users/keys/get]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// PUT /api/admin/users/:id/keys/:provider — add or update a key for a user
app.put('/api/admin/users/:id/keys/:provider', requireAuth, requireAdmin, async (req, res) => {
  const { api_key, label } = req.body;
  if (!api_key) return res.status(400).json({ error: 'api_key required' });
  try {
    const provider   = req.params.provider;
    const key_prefix = api_key.slice(0, 10);
    await pool.query(
      `INSERT INTO user_provider_keys (user_id, provider, api_key, label, key_prefix, is_builtin, updated_at)
       VALUES ($1,$2,$3,$4,$5,true,now())
       ON CONFLICT (user_id, provider) DO UPDATE SET
         api_key=$3, label=$4, key_prefix=$5, updated_at=now()`,
      [req.params.id, provider, api_key, label || provider, key_prefix]
    );
    res.json({ ok: true });
  } catch (err) {
    console.error('[admin/users/keys/put]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/admin/users/:id/keys/:provider — remove a key for a user
app.delete('/api/admin/users/:id/keys/:provider', requireAuth, requireAdmin, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM user_provider_keys WHERE user_id=$1 AND provider=$2`,
      [req.params.id, req.params.provider]
    );
    res.status(204).end();
  } catch (err) {
    console.error('[admin/users/keys/delete]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/stats — global platform statistics
app.get('/api/admin/stats', requireAuth, requireAdmin, async (req, res) => {
  const [users, prompts, events, jobs] = await Promise.all([
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE is_active) AS active FROM users`),
    pool.query(`SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE NOT is_deleted) AS active FROM prompts`),
    pool.query(`SELECT event_type, COUNT(*) AS count FROM usage_events GROUP BY event_type`),
    pool.query(`SELECT status, COUNT(*) AS count FROM scheduled_jobs GROUP BY status`),
  ]);
  res.json({
    users:   users.rows[0],
    prompts: prompts.rows[0],
    events:  events.rows,
    jobs:    jobs.rows,
  });
});

// ── DeepSeek key endpoint (replaces env-server.js) ────────────
// Only for authenticated users — replaces unauthenticated /env
app.get('/api/env', requireAuth, (req, res) => {
  res.json({
    DEEPSEEK_API_KEY: DEEPSEEK_API_KEY || '',
    APP_URL,
  });
});

// ── Password auth ──────────────────────────────────────────
const bcrypt = require("bcrypt");
const SALT_ROUNDS = 12;


// POST /api/auth/register
app.post('/api/auth/register', authLimiter, async (req, res) => {
  const { email, password, display_name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Invalid email address' });
  if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const emailClean = email.trim().toLowerCase();
  try {
    const existing = await pool.query('SELECT id FROM users WHERE lower(email)=$1', [emailClean]);
    if (existing.rows[0]) return res.status(409).json({ error: 'Email already registered' });
    const password_hash = await bcrypt.hash(password, SALT_ROUNDS);
    const { rows } = await pool.query(
      `INSERT INTO users (email, display_name, password_hash, email_verified)
       VALUES ($1, $2, $3, false) RETURNING id, email, role`,
      [emailClean, display_name || null, password_hash]
    );
    const user = rows[0];
    await pool.query(`INSERT INTO usage_events (user_id, event_type) VALUES ($1, 'register')`, [user.id]);

    // Send email verification
    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await pool.query(
      `INSERT INTO email_verifications (user_id, token_hash) VALUES ($1, $2)`,
      [user.id, tokenHash]
    );
    const verifyLink = `${APP_URL}/api/auth/verify-email?token=${rawToken}`;
    await mailer.sendMail({
      from:    MAIL_FROM,
      to:      emailClean,
      subject: 'Verify your email — JS PROMPT',
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0a1929;color:#e3f2fd;padding:40px;">
<div style="max-width:480px;margin:0 auto;background:#132f4c;border-radius:12px;padding:32px;border:1px solid rgba(79,195,247,0.2);">
  <h2 style="color:#4fc3f7;margin-top:0;">✉️ Verify your email</h2>
  <p>Thank you for signing up for <strong>JS PROMPT</strong>!</p>
  <p>Click the button below to verify your email address. This link is valid for <strong>24 hours</strong>.</p>
  <a href="${verifyLink}" style="display:inline-block;background:#4fc3f7;color:#0a1929;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Verify Email</a>
  <p style="font-size:13px;color:#90a4ae;">If you did not create an account, please ignore this email.</p>
  <hr style="border-color:rgba(79,195,247,0.1);margin:24px 0;">
  <p style="font-size:12px;color:#607080;">JS PROMPT · promt.pp.ua</p>
</div></body></html>`,
      text: `Verify your email — JS PROMPT:\n\n${verifyLink}\n\nThis link is valid for 24 hours.`,
    });

    res.status(201).json({ message: 'Registration successful. Please check your email to verify your account.' });
  } catch (err) {
    console.error('[auth/register]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify-email?token=xxx
app.get('/api/auth/verify-email', async (req, res) => {
  const { token } = req.query;
  if (!token) return res.status(400).send('Token required');
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  try {
    const { rows } = await pool.query(
      `SELECT ev.id, ev.user_id, ev.expires_at, ev.used_at, u.email
       FROM email_verifications ev JOIN users u ON u.id = ev.user_id
       WHERE ev.token_hash = $1`,
      [tokenHash]
    );
    const rec = rows[0];
    if (!rec)        return res.status(400).send('Invalid or expired link');
    if (rec.used_at) return res.status(400).send('Link already used');
    if (rec.expires_at < new Date()) return res.status(400).send('Link expired');

    await pool.query(`UPDATE email_verifications SET used_at=now() WHERE id=$1`, [rec.id]);
    await pool.query(`UPDATE users SET email_verified=true, is_active=true WHERE id=$1`, [rec.user_id]);

    // Redirect to app with success message
    res.redirect(`${APP_URL}/?verified=1`);
  } catch (err) {
    console.error('[auth/verify-email]', err.message);
    res.status(500).send('Server error');
  }
});

// POST /api/auth/login
app.post('/api/auth/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const emailClean = email.trim().toLowerCase();
  try {
    const { rows } = await pool.query(
      'SELECT id, email, role, is_active, email_verified, password_hash FROM users WHERE lower(email)=$1',
      [emailClean]
    );
    const user = rows[0];
    if (!user || !user.password_hash) return res.status(401).json({ error: 'Invalid email or password' });
    if (!user.is_active) return res.status(403).json({ error: 'Account disabled' });
    if (!user.email_verified) return res.status(403).json({ error: 'Please verify your email before logging in. Check your inbox.' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid email or password' });
    await pool.query('UPDATE users SET last_login_at=now(), login_count=login_count+1 WHERE id=$1', [user.id]);
    const accessToken = signAccessToken(user);
    const rawRefresh  = crypto.randomBytes(40).toString('hex');
    const refreshHash = crypto.createHash('sha256').update(rawRefresh).digest('hex');
    await pool.query(
      `INSERT INTO sessions (user_id, token_hash, ip_address, user_agent) VALUES ($1,$2,$3,$4)`,
      [user.id, refreshHash, req.ip, (req.headers['user-agent']||'').slice(0,300)]
    );
    await pool.query(`INSERT INTO usage_events (user_id, event_type) VALUES ($1, 'login')`, [user.id]);
    res.json({ access_token: accessToken, refresh_token: rawRefresh, user: { id: user.id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('[auth/login]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/change-password
app.post('/api/auth/change-password', requireAuth, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'Both passwords required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'New password must be at least 8 characters' });
  try {
    const { rows } = await pool.query('SELECT password_hash FROM users WHERE id=$1', [req.user.id]);
    if (!rows[0].password_hash) return res.status(400).json({ error: 'No password set' });
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'Current password is incorrect' });
    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, req.user.id]);
    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/change-password]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/forgot-password — request a password reset email
app.post('/api/auth/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const emailClean = email.trim().toLowerCase();
  try {
    const { rows } = await pool.query('SELECT id, email FROM users WHERE lower(email)=$1', [emailClean]);
    const user = rows[0];
    // Always respond success — never reveal whether the email exists
    if (!user) return res.json({ ok: true });

    // Invalidate previous unused reset tokens
    await pool.query(
      `UPDATE password_reset_tokens SET used_at=now()
       WHERE user_id=$1 AND used_at IS NULL AND expires_at > now()`,
      [user.id]
    );

    const rawToken  = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token_hash) VALUES ($1, $2)`,
      [user.id, tokenHash]
    );

    const resetLink = `${APP_URL}/#reset_password&token=${rawToken}`;
    await mailer.sendMail({
      from:    MAIL_FROM,
      to:      user.email,
      subject: 'Password reset — JS PROMPT',
      html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#0a1929;color:#e3f2fd;padding:40px;">
<div style="max-width:480px;margin:0 auto;background:#132f4c;border-radius:12px;padding:32px;border:1px solid rgba(79,195,247,0.2);">
  <h2 style="color:#4fc3f7;margin-top:0;">🔑 Password Reset</h2>
  <p>Click the button below to set a new password. This link is valid for <strong>1 hour</strong> and can only be used once.</p>
  <a href="${resetLink}" style="display:inline-block;background:#4fc3f7;color:#0a1929;padding:14px 28px;border-radius:8px;text-decoration:none;font-weight:bold;margin:16px 0;">Reset Password</a>
  <p style="font-size:13px;color:#90a4ae;">If you did not request a password reset, please ignore this email.</p>
  <hr style="border-color:rgba(79,195,247,0.1);margin:24px 0;">
  <p style="font-size:12px;color:#607080;">JS PROMPT · promt.pp.ua</p>
</div></body></html>`,
      text: `Password reset — JS PROMPT:\n\n${resetLink}\n\nThis link is valid for 1 hour.`,
    });

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/forgot-password]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/reset-password — consume reset token and set new password
app.post('/api/auth/reset-password', authLimiter, async (req, res) => {
  const { token, new_password } = req.body;
  if (!token || !new_password) return res.status(400).json({ error: 'Token and new password required' });
  if (new_password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters' });
  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  try {
    const { rows } = await pool.query(
      `SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash=$1`,
      [tokenHash]
    );
    const rec = rows[0];
    if (!rec)              return res.status(400).json({ error: 'Invalid or expired link' });
    if (rec.used_at)       return res.status(400).json({ error: 'This link has already been used' });
    if (rec.expires_at < new Date()) return res.status(400).json({ error: 'This link has expired' });

    const hash = await bcrypt.hash(new_password, SALT_ROUNDS);
    await pool.query('UPDATE users SET password_hash=$1 WHERE id=$2', [hash, rec.user_id]);
    await pool.query('UPDATE password_reset_tokens SET used_at=now() WHERE id=$1', [rec.id]);

    res.json({ ok: true });
  } catch (err) {
    console.error('[auth/reset-password]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/deepseek/balance — proxy to DeepSeek API (avoids CORS)
app.get('/api/deepseek/balance', requireAuth, async (req, res) => {
  if (!DEEPSEEK_API_KEY) return res.status(503).json({ error: 'DeepSeek key not configured' });
  try {
    const response = await fetch('https://api.deepseek.com/user/balance', {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${DEEPSEEK_API_KEY}`, 'Accept': 'application/json' },
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (err) {
    console.error('[deepseek/balance]', err.message);
    res.status(502).json({ error: 'DeepSeek API unreachable' });
  }
});



// POST /api/user-keys — save/update a single provider key (used by Scheduler)
app.post('/api/user-keys', requireAuth, async (req, res) => {
  const { deepseek_key, claude_key, gemini_key } = req.body;
  try {
    const entries = [
      ['deepseek', deepseek_key, 'DeepSeek', true],
      ['claude',   claude_key,   'Claude',   true],
      ['gemini',   gemini_key,   'Gemini',   true],
    ];
    for (const [provider, key, label, isBuiltin] of entries) {
      if (!key) continue;
      await pool.query(
        `INSERT INTO user_provider_keys (user_id, provider, api_key, label, is_builtin, updated_at)
         VALUES ($1,$2,$3,$4,$5,now())
         ON CONFLICT (user_id, provider) DO UPDATE SET api_key=$3, updated_at=now()`,
        [req.user.id, provider, key, label, isBuiltin]
      );
    }
    res.json({ ok: true });
  } catch (err) {
    console.error('[user-keys/post]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user-keys — check which keys are configured (masked, never full value)
app.get('/api/user-keys', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT provider FROM user_provider_keys WHERE user_id=$1`,
      [req.user.id]
    );
    const set = new Set(rows.map(r => r.provider));
    res.json({
      deepseek: set.has('deepseek'),
      claude:   set.has('claude'),
      gemini:   set.has('gemini'),
    });
  } catch (err) {
    console.error('[user-keys/get]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/user-keys/all — full export of ALL provider keys for this user (real values)
app.get('/api/user-keys/all', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT provider, api_key, label, key_prefix, is_builtin
       FROM user_provider_keys WHERE user_id=$1 ORDER BY provider`,
      [req.user.id]
    );
    const providers = {};
    rows.forEach(r => {
      providers[r.provider] = {
        label: r.label || r.provider,
        key: r.api_key,
        prefix: r.key_prefix || '',
        builtin: r.is_builtin,
      };
    });
    res.json({ providers, exportedAt: new Date().toISOString() });
  } catch (err) {
    console.error('[user-keys/all-get]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/user-keys/import — bulk import all provider keys (overwrite/merge)
app.post('/api/user-keys/import', requireAuth, async (req, res) => {
  const { providers } = req.body;
  if (!providers || typeof providers !== 'object') {
    return res.status(400).json({ error: 'providers object required' });
  }
  try {
    let count = 0;
    for (const provider of Object.keys(providers)) {
      const entry = providers[provider];
      const keyVal  = typeof entry === 'string' ? entry : entry.key;
      const label   = typeof entry === 'object' ? (entry.label || provider) : provider;
      const prefix  = typeof entry === 'object' ? (entry.prefix || '') : '';
      const builtin = typeof entry === 'object' ? !!entry.builtin : ['deepseek','claude','gemini'].includes(provider);
      if (!keyVal) continue;
      await pool.query(
        `INSERT INTO user_provider_keys (user_id, provider, api_key, label, key_prefix, is_builtin, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,now())
         ON CONFLICT (user_id, provider) DO UPDATE SET
           api_key=$3, label=$4, key_prefix=$5, is_builtin=$6, updated_at=now()`,
        [req.user.id, provider, keyVal, label, prefix, builtin]
      );
      count++;
    }
    res.json({ ok: true, imported: count });
  } catch (err) {
    console.error('[user-keys/import]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/user-keys/:provider — remove a single provider key
app.delete('/api/user-keys/:provider', requireAuth, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM user_provider_keys WHERE user_id=$1 AND provider=$2`,
      [req.user.id, req.params.provider]
    );
    res.status(204).end();
  } catch (err) {
    console.error('[user-keys/delete]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});


// GET /api/custom-providers — list user's custom AI provider definitions
app.get('/api/custom-providers', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `SELECT provider_key, label, prefix FROM user_custom_providers WHERE user_id=$1 ORDER BY created_at`,
      [req.user.id]
    );
    res.json({ providers: rows });
  } catch (err) {
    console.error('[custom-providers/get]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/custom-providers — create a new custom AI provider definition
app.post('/api/custom-providers', requireAuth, async (req, res) => {
  const { provider_key, label, prefix } = req.body;
  if (!provider_key || !label) return res.status(400).json({ error: 'provider_key and label required' });
  try {
    await pool.query(
      `INSERT INTO user_custom_providers (user_id, provider_key, label, prefix)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id, provider_key) DO UPDATE SET label=$3, prefix=$4`,
      [req.user.id, provider_key, label, prefix || '']
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error('[custom-providers/post]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/custom-providers/:key — remove a custom AI provider definition (and its key)
app.delete('/api/custom-providers/:key', requireAuth, async (req, res) => {
  try {
    await pool.query(`DELETE FROM user_custom_providers WHERE user_id=$1 AND provider_key=$2`, [req.user.id, req.params.key]);
    await pool.query(`DELETE FROM user_provider_keys WHERE user_id=$1 AND provider=$2`, [req.user.id, req.params.key]);
    res.status(204).end();
  } catch (err) {
    console.error('[custom-providers/delete]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// ══════════════════════════════════════════════════════════════
//  ADMIN — DATABASE BACKUP (create / list / download / delete)
// ══════════════════════════════════════════════════════════════

function backupTimestamp() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

// Remove DROP/CREATE/COMMENT EXTENSION statements (and their preceding
// "-- Name: x; Type: EXTENSION ..." header comment) from a plain-text pg_dump file.
// Extensions are owned by the PostgreSQL superuser, are installed once at
// provisioning time, and must never be touched by an app-role restore.
function stripExtensionStatements(sqlPath) {
  const lines = fs.readFileSync(sqlPath, 'utf8').split('\n');
  const out = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^(DROP|CREATE)\s+EXTENSION\b/i.test(line) || /^COMMENT ON EXTENSION\b/i.test(line)) {
      continue; // drop the statement itself
    }
    if (/^-- Name: .*; Type: EXTENSION;/i.test(line)) {
      // Also drop the 3-line "-- \n-- Name: ...\n--" header block that precedes it,
      // if it was just pushed onto `out`.
      while (out.length && out[out.length - 1].startsWith('--')) out.pop();
      continue;
    }
    out.push(line);
  }
  fs.writeFileSync(sqlPath, out.join('\n'));
}

// POST /api/admin/backup/create — run pg_dump and store a compressed backup on the server
app.post('/api/admin/backup/create', requireAuth, requireAdmin, async (req, res) => {
  const filename = `jsprompt_${backupTimestamp()}.sql.gz`;
  const filepath = path.join(BACKUP_DIR, filename);
  const dumpPath = filepath.replace(/\.gz$/, '');

  try {
    await execFileAsync('pg_dump', [
      '-h', PG_HOST,
      '-p', String(PG_PORT),
      '-U', PG_USER,
      '-d', PG_DB,
      '-F', 'p',
      '--no-owner',
      '--no-privileges',
      '--no-comments',
      '--clean',
      '--if-exists',
      '-f', dumpPath,
    ], {
      env: { ...process.env, PGPASSWORD: PG_PASSWORD },
      maxBuffer: 1024 * 1024 * 200,
    });

    // Strip extension-related statements (DROP/CREATE/COMMENT EXTENSION and their
    // preceding "-- Name: ... Type: EXTENSION" header comments). Extensions like
    // pg_trgm/pgcrypto are owned by the PostgreSQL superuser and must be installed
    // once at provisioning time — they should never be dropped/recreated by an
    // app-level restore, since the app DB role (PG_USER) doesn't own them.
    stripExtensionStatements(dumpPath);

    await execFileAsync('gzip', ['-f', dumpPath]);

    const stat = fs.statSync(filepath);
    res.status(201).json({
      ok: true,
      filename,
      size: stat.size,
      created_at: stat.mtime.toISOString(),
    });
  } catch (err) {
    console.error('[admin/backup/create]', err.message);
    // Clean up partial files
    try { if (fs.existsSync(dumpPath)) fs.unlinkSync(dumpPath); } catch {}
    try { if (fs.existsSync(filepath)) fs.unlinkSync(filepath); } catch {}
    res.status(500).json({ error: 'Backup failed: ' + err.message });
  }
});

// GET /api/admin/backup/list — list backups stored on the server
app.get('/api/admin/backup/list', requireAuth, requireAdmin, async (req, res) => {
  try {
    const files = fs.readdirSync(BACKUP_DIR)
      .filter(f => BACKUP_FILENAME_RE.test(f))
      .map(f => {
        const stat = fs.statSync(path.join(BACKUP_DIR, f));
        return { filename: f, size: stat.size, created_at: stat.mtime.toISOString() };
      })
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
    res.json(files);
  } catch (err) {
    console.error('[admin/backup/list]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/admin/backup/download/:filename — download a backup file
app.get('/api/admin/backup/download/:filename', requireAuth, requireAdmin, async (req, res) => {
  const { filename } = req.params;
  if (!BACKUP_FILENAME_RE.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(filepath)) return res.status(404).json({ error: 'Not found' });
  res.download(filepath, filename, (err) => {
    if (err) console.error('[admin/backup/download]', err.message);
  });
});

// DELETE /api/admin/backup/:filename — remove a backup file from the server
app.delete('/api/admin/backup/:filename', requireAuth, requireAdmin, async (req, res) => {
  const { filename } = req.params;
  if (!BACKUP_FILENAME_RE.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  const filepath = path.join(BACKUP_DIR, filename);
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
    res.status(204).end();
  } catch (err) {
    console.error('[admin/backup/delete]', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// Shared restore logic: gunzip a .sql.gz file into the database, then clean up the temp .sql
async function runRestore(gzPath) {
  const sqlPath = gzPath.replace(/\.gz$/, '');
  try {
    // Decompress to a temp .sql file (keep the original .gz intact with -k)
    await execFileAsync('gunzip', ['-k', '-f', gzPath]);

    // Restore inside a single transaction: if ANY statement fails, PostgreSQL
    // rolls back the entire restore, leaving the database exactly as it was
    // before — never half-dropped / half-created.
    await execFileAsync('psql', [
      '-h', PG_HOST,
      '-p', String(PG_PORT),
      '-U', PG_USER,
      '-d', PG_DB,
      '-v', 'ON_ERROR_STOP=1',
      '--single-transaction',
      '-f', sqlPath,
    ], {
      env: { ...process.env, PGPASSWORD: PG_PASSWORD },
      maxBuffer: 1024 * 1024 * 200,
    });

    // Self-healing: make sure every object in `public` is owned by PG_USER.
    // Harmless no-op if everything already belongs to PG_USER (the normal case
    // since pg_dump --no-owner makes CREATE statements run as the connecting role).
    const reassignSql = `
      DO $$
      DECLARE r RECORD;
      BEGIN
        FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' LOOP
          EXECUTE 'ALTER TABLE public.' || quote_ident(r.tablename) || ' OWNER TO ${PG_USER}';
        END LOOP;
        FOR r IN SELECT viewname FROM pg_views WHERE schemaname = 'public' LOOP
          EXECUTE 'ALTER VIEW public.' || quote_ident(r.viewname) || ' OWNER TO ${PG_USER}';
        END LOOP;
        FOR r IN SELECT sequencename FROM pg_sequences WHERE schemaname = 'public' LOOP
          EXECUTE 'ALTER SEQUENCE public.' || quote_ident(r.sequencename) || ' OWNER TO ${PG_USER}';
        END LOOP;
        FOR r IN SELECT typname FROM pg_type t JOIN pg_namespace n ON n.oid = t.typnamespace
                 WHERE n.nspname = 'public' AND t.typtype = 'e' LOOP
          EXECUTE 'ALTER TYPE public.' || quote_ident(r.typname) || ' OWNER TO ${PG_USER}';
        END LOOP;
        FOR r IN SELECT p.oid::regprocedure AS sig FROM pg_proc p
                 JOIN pg_namespace n ON n.oid = p.pronamespace
                 WHERE n.nspname = 'public' LOOP
          EXECUTE 'ALTER FUNCTION ' || r.sig || ' OWNER TO ${PG_USER}';
        END LOOP;
      END
      $$;
    `;
    try {
      await execFileAsync('psql', [
        '-h', PG_HOST, '-p', String(PG_PORT), '-U', PG_USER, '-d', PG_DB,
        '-v', 'ON_ERROR_STOP=1', '-c', reassignSql,
      ], { env: { ...process.env, PGPASSWORD: PG_PASSWORD } });
    } catch (ownerErr) {
      // Non-fatal: restore itself already succeeded and committed.
      console.error('[runRestore] post-restore ownership reassignment failed:', ownerErr.message);
    }
  } finally {
    try { if (fs.existsSync(sqlPath)) fs.unlinkSync(sqlPath); } catch {}
  }
}

// POST /api/admin/backup/restore/:filename — restore the database from a backup already on the server
app.post('/api/admin/backup/restore/:filename', requireAuth, requireAdmin, async (req, res) => {
  const { filename } = req.params;
  const { confirm } = req.body || {};
  if (!BACKUP_FILENAME_RE.test(filename)) {
    return res.status(400).json({ error: 'Invalid filename' });
  }
  if (confirm !== 'RESTORE_DATABASE') {
    return res.status(400).json({ error: 'Must send { confirm: "RESTORE_DATABASE" } to proceed' });
  }
  const gzPath = path.join(BACKUP_DIR, filename);
  if (!fs.existsSync(gzPath)) return res.status(404).json({ error: 'Backup not found' });

  try {
    await runRestore(gzPath);
    res.json({ ok: true, message: `Database restored from ${filename}.` });
  } catch (err) {
    console.error('[admin/backup/restore]', err.message);
    res.status(500).json({ error: 'Restore failed: ' + err.message });
  }
});

// POST /api/admin/backup/upload-restore — upload a .sql.gz file and restore directly from it
// Body must be raw application/gzip bytes. The confirm code is sent as a query param
// since this is a raw-body route (no JSON parsing here).
app.post(
  '/api/admin/backup/upload-restore',
  requireAuth, requireAdmin,
  express.raw({ type: 'application/gzip', limit: '500mb' }),
  async (req, res) => {
    if (req.query.confirm !== 'RESTORE_DATABASE') {
      return res.status(400).json({ error: 'Must pass ?confirm=RESTORE_DATABASE to proceed' });
    }
    if (!Buffer.isBuffer(req.body) || !req.body.length) {
      return res.status(400).json({ error: 'No file data received (expected application/gzip body)' });
    }

    const tmpName = `uploaded_${backupTimestamp()}.sql.gz`;
    const tmpPath = path.join(BACKUP_DIR, tmpName);

    try {
      fs.writeFileSync(tmpPath, req.body);
      await runRestore(tmpPath);
      res.json({ ok: true, message: `Database restored from uploaded file (saved as ${tmpName}).`, filename: tmpName });
    } catch (err) {
      console.error('[admin/backup/upload-restore]', err.message);
      res.status(500).json({ error: 'Restore failed: ' + err.message });
    }
  }
);

// ── Health check ──────────────────────────────────────────────
app.get('/api/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', db: 'ok', ts: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', db: 'error' });
  }
});

// ── Start ─────────────────────────────────────────────────────
const PORT_NUM = parseInt(PORT);
app.listen(PORT_NUM, '127.0.0.1', () => {
  console.log(`[api] JS PROMPT v2 API running on 127.0.0.1:${PORT_NUM}`);
  console.log(`[api] DB: ${PG_USER}@${PG_HOST}:${PG_PORT}/${PG_DB}`);
  console.log(`[api] Mail: ${MAIL_HOST}:${MAIL_PORT} (from: ${MAIL_FROM})`);
});

process.on('SIGTERM', () => { pool.end(); process.exit(0); });