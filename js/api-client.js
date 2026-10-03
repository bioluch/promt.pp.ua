/**
 * js/api-client.js — JS PROMPT v2
 * Browser-side API client. Handles auth state, token refresh,
 * and typed wrappers for every backend endpoint.
 *
 * Usage: included after auth.js loads. All methods are async.
 * Access: window.API.*
 */
'use strict';

(function () {

  // ── Token storage (memory + sessionStorage for tab persistence) ──
  let _accessToken  = sessionStorage.getItem('_jsat') || '';
  let _refreshToken = localStorage.getItem('_jsr')   || '';

  function _setTokens(access, refresh) {
    _accessToken  = access  || '';
    _refreshToken = refresh || '';
    if (_accessToken)  sessionStorage.setItem('_jsat', _accessToken);
    else               sessionStorage.removeItem('_jsat');
    if (_refreshToken) localStorage.setItem('_jsr', _refreshToken);
    else               localStorage.removeItem('_jsr');
  }

  function _clearTokens() {
    _accessToken = _refreshToken = '';
    sessionStorage.removeItem('_jsat');
    localStorage.removeItem('_jsr');
  }

  function isLoggedIn() { return !!getCurrentUser(); }

  // Parse JWT payload (no verification — just for UI state)
  function _parseJwt(token) {
    try {
      const b64 = token.split('.')[1].replace(/-/g,'+').replace(/_/g,'/');
      return JSON.parse(atob(b64));
    } catch { return null; }
  }

  function getCurrentUser() {
    if (!_accessToken) return null;
    const p = _parseJwt(_accessToken);
    if (!p) return null;
    // Check expiry (with 60s buffer)
    if (p.exp && p.exp * 1000 < Date.now() + 60_000) return null;
    return { id: p.sub, email: p.email, role: p.role };
  }

  // Restore a usable access token on startup: the access token lives in
  // sessionStorage (lost with the tab), the refresh token in localStorage.
  async function ensureSession() {
    if (getCurrentUser()) return true;
    if (!_refreshToken) return false;
    return _refreshAccessToken();
  }

  // ── Core fetch with auto-refresh ─────────────────────────────
  async function _fetch(method, path, body, retry = true) {
    const headers = { 'Content-Type': 'application/json' };
    if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;

    const opts = { method, headers };
    if (body !== undefined) opts.body = JSON.stringify(body);

    let resp = await fetch('/api' + path, opts);

    // Auto-refresh on 401
    if (resp.status === 401 && retry && _refreshToken) {
      const refreshed = await _refreshAccessToken();
      if (refreshed) return _fetch(method, path, body, false);
      // Refresh failed — force logout
      _onSessionExpired();
      throw new Error('Session expired. Please sign in again.');
    }

    if (!resp.ok) {
      let errMsg = `HTTP ${resp.status}`;
      try { const d = await resp.json(); errMsg = d.error || errMsg; } catch {}
      throw new Error(errMsg);
    }

    // 204 No Content
    if (resp.status === 204) return null;
    return resp.json();
  }

  async function _refreshAccessToken() {
    if (!_refreshToken) return false;
    try {
      const resp = await fetch('/api/auth/refresh', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ refresh_token: _refreshToken }),
      });
      if (!resp.ok) return false;
      const data = await resp.json();
      _setTokens(data.access_token, _refreshToken);
      return true;
    } catch {
      return false;
    }
  }

  // Called when session is expired and unrecoverable
  function _onSessionExpired() {
    _clearTokens();
    window.dispatchEvent(new CustomEvent('jsprompt:logout'));
  }

  // ── Handle magic-link callback in URL fragment ────────────────
  function handleAuthCallback() {
    const hash = window.location.hash;
    if (!hash.includes('auth_success')) return false;

    const params = new URLSearchParams(hash.replace('#', '?').replace('auth_success&', ''));
    const access  = params.get('access');
    const refresh = params.get('refresh');

    if (access && refresh) {
      _setTokens(access, refresh);
      // Clean URL fragment
      history.replaceState(null, '', window.location.pathname + window.location.search);
      window.dispatchEvent(new CustomEvent('jsprompt:login', {
        detail: getCurrentUser()
      }));
      return true;
    }
    return false;
  }

  // ── Auth ──────────────────────────────────────────────────────

  async function register(email, password, display_name) {
    const data = await _fetch('POST', '/auth/register', { email, password, display_name });
    // No auto-login — user must verify email first
    return data;
  }

  async function login(email, password) {
    const data = await _fetch('POST', '/auth/login', { email, password });
    _setTokens(data.access_token, data.refresh_token);
    window.dispatchEvent(new CustomEvent('jsprompt:login', { detail: getCurrentUser() }));
    return data;
  }

  async function changePassword(current_password, new_password) {
    return _fetch('POST', '/auth/change-password', { current_password, new_password });
  }

  async function requestPasswordReset(email) {
    return _fetch('POST', '/auth/forgot-password', { email });
  }

  async function resetPassword(token, new_password) {
    return _fetch('POST', '/auth/reset-password', { token, new_password });
  }

  async function sendMagicLink(email) {
    return _fetch('POST', '/auth/send-link', { email });
  }

  async function getMe() {
    return _fetch('GET', '/auth/me');
  }

  async function logout() {
    try {
      await _fetch('POST', '/auth/logout', { refresh_token: _refreshToken });
    } finally {
      _clearTokens();
      window.dispatchEvent(new CustomEvent('jsprompt:logout'));
    }
  }

  // ── Source Texts ──────────────────────────────────────────────
  async function saveSourceText({ original_text, translated_text, detected_lang, domain }) {
    return _fetch('POST', '/sources', { original_text, translated_text, detected_lang, domain });
  }

  async function listSourceTexts({ domain, q, limit, offset } = {}) {
    const p = new URLSearchParams();
    if (domain) p.set('domain', domain);
    if (q)      p.set('q', q);
    if (limit)  p.set('limit', limit);
    if (offset) p.set('offset', offset);
    return _fetch('GET', `/sources?${p}`);
  }

  async function deleteSourceText(id) {
    return _fetch('DELETE', `/sources/${id}`);
  }

  // ── Prompts ───────────────────────────────────────────────────
  async function savePrompt({ source_text_id, title, content, domain,
                              style, output_lang, engine, token_count,
                              word_count, quality_score }) {
    return _fetch('POST', '/prompts', {
      source_text_id, title, content, domain,
      style, output_lang, engine, token_count, word_count, quality_score
    });
  }

  async function listPrompts({ domain, q, limit, offset } = {}) {
    const p = new URLSearchParams();
    if (domain) p.set('domain', domain);
    if (q)      p.set('q', q);
    if (limit)  p.set('limit', limit);
    if (offset) p.set('offset', offset);
    return _fetch('GET', `/prompts?${p}`);
  }

  async function getPrompt(id) {
    return _fetch('GET', `/prompts/${id}`);
  }

  async function updatePrompt(id, { title, content }) {
    return _fetch('PUT', `/prompts/${id}`, { title, content });
  }

  async function deletePrompt(id) {
    return _fetch('DELETE', `/prompts/${id}`);
  }

  // ── Statistics ────────────────────────────────────────────────
  async function getStats() {
    return _fetch('GET', '/stats');
  }

  // ── Scheduled Jobs ────────────────────────────────────────────
  async function createJob({ prompt_id, target_ai, schedule_type,
                             next_run_at, run_days, run_dates, run_time,
                             timezone, max_runs, max_tokens }) {
    return _fetch('POST', '/jobs', {
      prompt_id, target_ai, schedule_type, next_run_at,
      run_days, run_dates, run_time, timezone, max_runs, max_tokens
    });
  }

  async function listJobs() {
    return _fetch('GET', '/jobs');
  }

  async function getJobResults(jobId, { from, to } = {}) {
    const p = new URLSearchParams();
    if (from) p.set('from', from);
    if (to)   p.set('to', to);
    return _fetch('GET', `/jobs/${jobId}/results?${p}`);
  }

  async function cancelJob(id) {
    return _fetch('DELETE', `/jobs/${id}`);
  }

  async function deleteJobPermanently(id) {
    return _fetch('DELETE', `/jobs/${id}/permanent`);
  }

  // ── Admin ─────────────────────────────────────────────────────
  async function adminGetUsers() {
    return _fetch('GET', '/admin/users');
  }

  async function adminUpdateUser(id, patch) {
    return _fetch('PATCH', `/admin/users/${id}`, patch);
  }

  async function adminGetStats() {
    return _fetch('GET', '/admin/stats');
  }

  async function adminDeleteUser(id) {
    return _fetch('DELETE', `/admin/users/${id}`);
  }

  async function adminCreateUser({ email, password, display_name, role }) {
    return _fetch('POST', '/admin/users', { email, password, display_name, role });
  }

  async function adminWipeDatabase() {
    return _fetch('POST', '/admin/wipe-database', { confirm: 'WIPE_EVERYTHING' });
  }

  // ── Database Backup ──────────────────────────────────────────
  async function adminCreateBackup() {
    return _fetch('POST', '/admin/backup/create', {});
  }

  // ── Release announcement e-mails ──
  async function adminAnnouncementRecipients() {
    return _fetch('GET', '/admin/announcements/recipients');
  }
  async function adminAnnouncementStatus() {
    return _fetch('GET', '/admin/announcements/status');
  }
  async function adminSendAnnouncement({ subject, html, text, mode, confirm }) {
    return _fetch('POST', '/admin/announcements/send', { subject, html, text, mode, confirm });
  }

  async function adminListBackups() {
    return _fetch('GET', '/admin/backup/list');
  }

  async function adminDeleteBackup(filename) {
    return _fetch('DELETE', `/admin/backup/${encodeURIComponent(filename)}`);
  }

  async function adminRestoreBackup(filename) {
    return _fetch('POST', `/admin/backup/restore/${encodeURIComponent(filename)}`, { confirm: 'RESTORE_DATABASE' });
  }

  // file: a File/Blob object (the .sql.gz the user picked)
  async function adminUploadRestoreBackup(file) {
    const headers = { 'Content-Type': 'application/gzip' };
    if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
    const resp = await fetch('/api/admin/backup/upload-restore?confirm=RESTORE_DATABASE', {
      method: 'POST',
      headers,
      body: file,
    });
    if (!resp.ok) {
      let errMsg = `HTTP ${resp.status}`;
      try { const d = await resp.json(); errMsg = d.error || errMsg; } catch {}
      throw new Error(errMsg);
    }
    return resp.json();
  }

  async function adminDownloadBackup(filename) {
    const headers = {};
    if (_accessToken) headers['Authorization'] = `Bearer ${_accessToken}`;
    const resp = await fetch(`/api/admin/backup/download/${encodeURIComponent(filename)}`, { headers });
    if (!resp.ok) {
      let errMsg = `HTTP ${resp.status}`;
      try { const d = await resp.json(); errMsg = d.error || errMsg; } catch {}
      throw new Error(errMsg);
    }
    const blob = await resp.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  async function adminListPrompts({ q, user_id, limit, offset } = {}) {
    const p = new URLSearchParams();
    if (q)       p.set('q', q);
    if (user_id) p.set('user_id', user_id);
    if (limit)   p.set('limit', limit);
    if (offset)  p.set('offset', offset);
    return _fetch('GET', `/admin/prompts?${p}`);
  }

  async function adminGetPrompt(id) {
    return _fetch('GET', `/admin/prompts/${id}`);
  }

  async function adminUpdatePrompt(id, { title, content, domain, user_email }) {
    return _fetch('PUT', `/admin/prompts/${id}`, { title, content, domain, user_email });
  }

  async function adminDeletePrompt(id) {
    return _fetch('DELETE', `/admin/prompts/${id}`);
  }

  async function adminCopyPrompt(id, { title, domain, user_email } = {}) {
    return _fetch('POST', `/admin/prompts/${id}/copy`, { title, domain, user_email });
  }

  async function adminGetProviderEndpoints() {
    return _fetch('GET', '/admin/provider-endpoints');
  }

  async function adminSaveProviderEndpoint(data) {
    return _fetch('POST', '/admin/provider-endpoints', data);
  }

  async function adminDeleteProviderEndpoint(key) {
    return _fetch('DELETE', `/admin/provider-endpoints/${key}`);
  }

  async function adminExportProviderEndpoints() {
    return _fetch('GET', '/admin/provider-endpoints/export');
  }

  async function adminImportProviderEndpoints(providers) {
    return _fetch('POST', '/admin/provider-endpoints/import', { providers });
  }

  // ── DeepSeek key (server-side, auth-gated) ───────────────────
  async function getEnv() {
    return _fetch('GET', '/env');
  }

  // ── Expose as window.API ─────────────────────────────────────
  window.API = {
    // auth
    isLoggedIn,
    ensureSession,
    getCurrentUser,
    handleAuthCallback,
    login,
    register,
    changePassword,
    requestPasswordReset,
    resetPassword,
    sendMagicLink,
    getMe,
    logout,
    // source texts
    saveSourceText,
    listSourceTexts,
    deleteSourceText,
    // prompts
    savePrompt,
    listPrompts,
    getPrompt,
    updatePrompt,
    deletePrompt,
    // stats
    getStats,
    // jobs
    createJob,
    listJobs,
    getJobResults,
    cancelJob,
    deleteJobPermanently,
    // admin
    adminGetUsers,
    adminUpdateUser,
    adminGetStats,
    adminDeleteUser,
    adminCreateUser,
    adminWipeDatabase,
    adminCreateBackup,
    adminListBackups,
    adminAnnouncementRecipients,
    adminAnnouncementStatus,
    adminSendAnnouncement,
    adminDeleteBackup,
    adminDownloadBackup,
    adminRestoreBackup,
    adminUploadRestoreBackup,
    adminListPrompts,
    adminGetPrompt,
    adminUpdatePrompt,
    adminDeletePrompt,
    adminCopyPrompt,
    adminGetProviderEndpoints,
    adminSaveProviderEndpoint,
    adminDeleteProviderEndpoint,
    adminExportProviderEndpoints,
    adminImportProviderEndpoints,
    // env
    getEnv,
  };

  // ── Run callback handler on load ─────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    handleAuthCallback();
  });

})();