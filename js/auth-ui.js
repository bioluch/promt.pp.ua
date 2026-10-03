/**
 * js/auth-ui.js — JS PROMPT v2
 * Auth UI: login modal (magic link), user menu, logout, session display.
 * Integrates with api-client.js (window.API).
 * Injects auth elements into the existing v1 header — no HTML changes required.
 */
'use strict';

(function () {

  // Works on both index.html (window.Lang) and admin.html (window.AdminLang),
  // since this file is loaded by both pages.
  function T(key, vars) {
    if (window.Lang) return Lang.t(key, vars);
    if (window.AdminLang) return AdminLang.t(key, vars);
    return key;
  }

  // ── Domain label map ─────────────────────────────────────────
  const DOMAIN_KEYS = {
    intelligence_analysis: 'domain.intelligence_analysis',
    osint:                 'domain.osint',
    strategic_risk:        'domain.strategic_risk',
    medical_diagnostics:   'domain.medical_diagnostics',
    cybersecurity:         'domain.cybersecurity',
    financial_analysis:    'domain.financial_analysis',
    legal_analysis:        'domain.legal_analysis',
    programming:           'domain.programming',
    data_science:          'domain.data_science',
    business_strategy:     'domain.business_strategy',
    product_management:    'domain.product_management',
    scientific_research:   'domain.scientific_research',
    general:               'domain.general',
  };
  function domainLabel(key) {
    return DOMAIN_KEYS[key] ? T(DOMAIN_KEYS[key]) : key;
  }

  // ── Inject CSS ────────────────────────────────────────────────
  const style = document.createElement('style');
  style.textContent = `
  /* ── Auth button ── */
  #authBtn {
    background: rgba(79,195,247,0.12);
    border: 1px solid rgba(79,195,247,0.35);
    color: var(--accent, #4fc3f7);
    border-radius: 8px;
    padding: 7px 16px;
    font-family: var(--font-play, 'Play', sans-serif);
    font-size: 13px;
    cursor: pointer;
    transition: background 0.2s, border-color 0.2s;
    white-space: nowrap;
  }
  #authBtn:hover { background: rgba(79,195,247,0.22); }
  #authBtn.logged-in {
    background: rgba(102,187,106,0.12);
    border-color: rgba(102,187,106,0.4);
    color: var(--ok, #66bb6a);
  }

  /* ── Login modal ── */
  .auth-modal-overlay {
    position: fixed; inset: 0; z-index: 9000;
    background: rgba(6,17,31,0.82);
    backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    opacity: 0; transition: opacity 0.2s;
  }
  .auth-modal-overlay.visible { opacity: 1; }
  .auth-modal-box {
    background: linear-gradient(160deg, var(--bg-2,#132f4c), var(--bg-1,#0a1929));
    border: 1px solid rgba(79,195,247,0.3);
    border-radius: 16px;
    padding: 32px 28px;
    max-width: 420px; width: 92%;
    box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  }
  .auth-modal-title {
    font-size: 20px; font-weight: 700;
    color: var(--accent,#4fc3f7);
    margin: 0 0 6px;
  }
  .auth-modal-sub {
    font-size: 13px; color: var(--text-dim,#90a4ae);
    margin: 0 0 22px;
  }
  .auth-modal-input {
    width: 100%;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(79,195,247,0.25);
    border-radius: 8px;
    color: var(--text,#e3f2fd);
    font-family: var(--font-play,'Play',sans-serif);
    font-size: 15px;
    padding: 12px 14px;
    outline: none;
    transition: border-color 0.2s;
    box-sizing: border-box;
  }
  .auth-modal-input:focus { border-color: rgba(79,195,247,0.6); }
  .auth-modal-btn {
    width: 100%; margin-top: 14px;
    background: var(--accent,#4fc3f7);
    color: #0a1929; border: none;
    border-radius: 8px; padding: 12px;
    font-family: var(--font-play,'Play',sans-serif);
    font-size: 15px; font-weight: 700;
    cursor: pointer; transition: opacity 0.2s;
  }
  .auth-modal-btn:disabled { opacity: 0.5; cursor: default; }
  .auth-modal-btn:hover:not(:disabled) { opacity: 0.88; }
  .auth-modal-msg {
    margin-top: 14px; font-size: 13px; text-align: center;
    min-height: 18px;
  }
  .auth-modal-msg.ok  { color: var(--ok,#66bb6a); }
  .auth-modal-msg.err { color: var(--error,#ff6b6b); }
  .auth-modal-close {
    position: absolute; top: 12px; right: 14px;
    background: none; border: none; color: var(--text-dim,#90a4ae);
    font-size: 22px; cursor: pointer; line-height: 1;
  }
  .auth-modal-close:hover { color: var(--text,#e3f2fd); }

  /* ── User dropdown ── */
  .user-menu {
    position: relative; display: inline-block;
  }
  .user-dropdown {
    position: absolute; top: calc(100% + 8px); right: 0;
    background: var(--bg-2,#132f4c);
    border: 1px solid rgba(79,195,247,0.25);
    border-radius: 12px; min-width: 220px;
    box-shadow: 0 12px 40px rgba(0,0,0,0.4);
    display: none; z-index: 1000;
    overflow: hidden;
  }
  .user-dropdown.open { display: block; }
  .user-dropdown-header {
    padding: 14px 16px;
    border-bottom: 1px solid rgba(79,195,247,0.1);
  }
  .user-dropdown-email {
    font-size: 12px; color: var(--text-dim,#90a4ae);
    word-break: break-all;
  }
  .user-dropdown-role {
    font-size: 11px; color: var(--accent,#4fc3f7);
    margin-top: 2px; text-transform: uppercase; letter-spacing: 0.05em;
  }
  .user-dropdown-item {
    display: block; width: 100%;
    padding: 11px 16px; text-align: left;
    background: none; border: none;
    color: var(--text,#e3f2fd); font-size: 13px;
    cursor: pointer; transition: background 0.15s;
    font-family: var(--font-play,'Play',sans-serif);
  }
  .user-dropdown-item:hover { background: rgba(79,195,247,0.08); }
  .user-dropdown-item.danger { color: var(--error,#ff6b6b); }

  /* ── DB Panel tabs ── */
  .db-subtabs {
    display: flex; gap: 4px; margin-bottom: 18px;
    border-bottom: 1px solid rgba(79,195,247,0.15);
  }
  .db-subtab {
    background: none; border: none; border-bottom: 2px solid transparent;
    color: var(--text-dim,#90a4ae); font-family: var(--font-play,'Play',sans-serif);
    font-size: 13px; padding: 8px 16px; cursor: pointer;
    transition: color 0.2s, border-color 0.2s; margin-bottom: -1px;
  }
  .db-subtab.active { color: var(--accent,#4fc3f7); border-bottom-color: var(--accent,#4fc3f7); }

  /* ── Prompt library cards ── */
  .prompt-card {
    background: rgba(79,195,247,0.05);
    border: 1px solid rgba(79,195,247,0.15);
    border-radius: 10px; padding: 14px 16px;
    margin-bottom: 10px; transition: border-color 0.2s;
  }
  .prompt-card:hover { border-color: rgba(79,195,247,0.35); }
  .prompt-card-header {
    display: flex; align-items: flex-start;
    justify-content: space-between; gap: 10px; margin-bottom: 6px;
  }
  .prompt-card-title {
    font-size: 14px; font-weight: 600; color: var(--text,#e3f2fd);
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .prompt-card-domain {
    font-size: 10px; background: rgba(79,195,247,0.15);
    color: var(--accent,#4fc3f7); border-radius: 4px;
    padding: 2px 7px; white-space: nowrap; flex-shrink: 0;
  }
  .prompt-card-preview {
    font-size: 12px; color: var(--text-dim,#90a4ae);
    line-height: 1.4;
    display: -webkit-box; -webkit-line-clamp: 2;
    -webkit-box-orient: vertical; overflow: hidden;
    margin-bottom: 10px;
  }
  .prompt-card-actions {
    display: flex; gap: 8px; flex-wrap: wrap; align-items: center;
  }
  .prompt-card-meta {
    font-size: 11px; color: var(--text-dim,#607080);
    margin-left: auto;
  }
  .btn-xs {
    background: rgba(255,255,255,0.07); border: 1px solid rgba(79,195,247,0.2);
    color: var(--text,#e3f2fd); border-radius: 6px; padding: 4px 10px;
    font-size: 12px; cursor: pointer; font-family: var(--font-play,'Play',sans-serif);
    transition: background 0.15s;
  }
  .btn-xs:hover { background: rgba(79,195,247,0.15); }
  .btn-xs.danger:hover { background: rgba(255,107,107,0.2); border-color: rgba(255,107,107,0.4); color: #ff6b6b; }

  /* ── Stats chart bars ── */
  .stat-bar-row {
    display: flex; align-items: center; gap: 10px;
    margin-bottom: 8px; font-size: 13px;
  }
  .stat-bar-label { width: 160px; color: var(--text,#e3f2fd); flex-shrink: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .stat-bar-track { flex: 1; background: rgba(79,195,247,0.1); border-radius: 4px; height: 8px; overflow: hidden; }
  .stat-bar-fill  { height: 100%; background: var(--accent,#4fc3f7); border-radius: 4px; transition: width 0.6s ease; }
  .stat-bar-count { width: 40px; text-align: right; color: var(--accent,#4fc3f7); font-weight: 600; flex-shrink: 0; }

  /* ── Empty state ── */
  .empty-state {
    text-align: center; padding: 40px 20px;
    color: var(--text-dim,#90a4ae); font-size: 14px;
  }
  .empty-state-icon { font-size: 36px; margin-bottom: 12px; }

  /* ── Search box ── */
  .db-search-box {
    width: 100%; background: rgba(255,255,255,0.05);
    border: 1px solid rgba(79,195,247,0.2); border-radius: 8px;
    color: var(--text,#e3f2fd); font-family: var(--font-play,'Play',sans-serif);
    font-size: 14px; padding: 10px 14px; outline: none;
    transition: border-color 0.2s; box-sizing: border-box; margin-bottom: 14px;
  }
  .db-search-box:focus { border-color: rgba(79,195,247,0.5); }

  /* ── Schedule form ── */
  .schedule-field { margin-bottom: 14px; }
  .schedule-label { font-size: 12px; color: var(--text-dim,#90a4ae); margin-bottom: 5px; display: block; }
  .schedule-select, .schedule-input {
    width: 100%; background: rgba(255,255,255,0.05);
    border: 1px solid rgba(79,195,247,0.2); border-radius: 8px;
    color: var(--text,#e3f2fd); font-family: var(--font-play,'Play',sans-serif);
    font-size: 13px; padding: 9px 12px; outline: none; box-sizing: border-box;
  }
  .schedule-select option { background: #132f4c; }
  `;
  document.head.appendChild(style);

  // ── Inject auth button into header ───────────────────────────
  function injectAuthButton() {
    // authBtn is already in index.html — just add dropdown and wire events
    const btn = document.getElementById('authBtn');
    if (!btn) return;

    // Inject dropdown next to the button
    const wrapper = btn.parentElement;
    wrapper.style.cssText = 'display:inline-flex;align-items:center;position:relative;';

    const dropdown = document.createElement('div');
    dropdown.id = 'userDropdown';
    dropdown.className = 'user-dropdown';
    dropdown.innerHTML = `
        <div class="user-dropdown-header">
          <div class="user-dropdown-email" id="dropEmail">—</div>
          <div class="user-dropdown-role" id="dropRole">${T('auth.user')}</div>
        </div>
        <button class="user-dropdown-item" id="dropOpenDb" data-i18n="auth.myPrompts">${T('auth.myPrompts')}</button>
        <button class="user-dropdown-item" id="dropOpenStats" data-i18n="auth.statistics">${T('auth.statistics')}</button>
        <button class="user-dropdown-item" id="dropOpenSchedule" data-i18n="auth.scheduler">${T('auth.scheduler')}</button>
        <button class="user-dropdown-item" id="dropAdminLink" style="display:none;" data-i18n="auth.adminPanel">${T('auth.adminPanel')}</button>
        <button class="user-dropdown-item danger" id="dropLogout" data-i18n="auth.signOut">${T('auth.signOut')}</button>`;
    wrapper.appendChild(dropdown);

    btn.addEventListener('click', () => {
      if (window.API?.isLoggedIn()) {
        dropdown.classList.toggle('open');
      } else {
        showLoginModal();
      }
    });

    // Close dropdown on outside click
    document.addEventListener('click', (e) => {
      if (!wrapper.contains(e.target)) dropdown.classList.remove('open');
    });

    document.getElementById('dropLogout').addEventListener('click', () => {
      dropdown.classList.remove('open');
      window.API?.logout();
    });

    document.getElementById('dropOpenDb').addEventListener('click', () => {
      dropdown.classList.remove('open');
      openDbPanel('library');
    });

    document.getElementById('dropOpenStats').addEventListener('click', () => {
      dropdown.classList.remove('open');
      openDbPanel('stats');
    });

    document.getElementById('dropOpenSchedule').addEventListener('click', () => {
      dropdown.classList.remove('open');
      openDbPanel('schedule');
    });

    document.getElementById('dropAdminLink').addEventListener('click', () => {
      dropdown.classList.remove('open');
      openAdminPanel();
    });
  }

  // ── Auth state update ─────────────────────────────────────────
  function updateAuthUI() {
    const btn  = document.getElementById('authBtn');
    const drop = document.getElementById('userDropdown');
    if (!btn) return;

    const user = window.API?.getCurrentUser();
    if (user) {
      btn.textContent = user.email.split('@')[0];
      btn.classList.add('logged-in');
      const emailEl = document.getElementById('dropEmail');
      const roleEl  = document.getElementById('dropRole');
      if (emailEl) emailEl.textContent = user.email;
      if (roleEl)  roleEl.textContent  = user.role;
      const adminLink = document.getElementById('dropAdminLink');
      if (adminLink) adminLink.style.display = user.role === 'admin' ? 'block' : 'none';
    } else {
      btn.textContent = T('auth.signIn');
      btn.classList.remove('logged-in');
      if (drop) drop.classList.remove('open');
    }
  }

  // ── Login modal ───────────────────────────────────────────────
  function showResetPasswordModal(token) {
    const overlay = document.createElement('div');
    overlay.className = 'auth-modal-overlay';
    overlay.innerHTML = `
      <div class="auth-modal-box" role="dialog" aria-modal="true">
        <button class="auth-modal-close" aria-label="Close">&times;</button>
        <h2 class="auth-modal-title">${T('auth.reset.title')}</h2>
        <p style="font-size:13px;color:#90a4ae;margin-bottom:14px;">${T('auth.reset.hint')}</p>
        <input class="auth-modal-input" id="rpNewPass" type="password"
               placeholder="${T('auth.placeholder.passwordMin')}" autocomplete="new-password" style="margin-bottom:10px;">
        <input class="auth-modal-input" id="rpNewPass2" type="password"
               placeholder="${T('auth.placeholder.confirmPassword')}" autocomplete="new-password" style="margin-bottom:10px;">
        <button class="auth-modal-btn" id="rpSaveBtn">${T('auth.reset.btn')}</button>
        <div class="auth-modal-msg" id="rpMsg"></div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    overlay.querySelector('#rpNewPass').focus();

    function close() {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 200);
    }
    overlay.querySelector('.auth-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const msgEl = overlay.querySelector('#rpMsg');
    function showMsg(text, isOk) {
      msgEl.textContent = text;
      msgEl.className = 'auth-modal-msg ' + (isOk ? 'ok' : 'err');
    }

    async function doReset() {
      const p1 = overlay.querySelector('#rpNewPass').value;
      const p2 = overlay.querySelector('#rpNewPass2').value;
      if (!p1 || p1.length < 8) { showMsg(T('auth.err.passwordMin')); return; }
      if (p1 !== p2) { showMsg(T('auth.err.passwordMismatch')); return; }
      const btn = overlay.querySelector('#rpSaveBtn');
      btn.disabled = true; btn.textContent = T('auth.reset.saving');
      try {
        await window.API.resetPassword(token, p1);
        showMsg(T('auth.reset.success'), true);
        setTimeout(() => { close(); showLoginModal(); }, 1200);
      } catch (err) {
        showMsg('✗ ' + err.message);
        btn.disabled = false; btn.textContent = T('auth.reset.btn');
      }
    }
    overlay.querySelector('#rpSaveBtn').addEventListener('click', doReset);
    overlay.querySelector('#rpNewPass2').addEventListener('keydown', e => { if (e.key === 'Enter') doReset(); });
  }

  function showLoginModal() {
    const overlay = document.createElement('div');
    overlay.className = 'auth-modal-overlay';
    overlay.innerHTML = `
      <div class="auth-modal-box" role="dialog" aria-modal="true">
        <button class="auth-modal-close" aria-label="Close">&times;</button>
        <h2 class="auth-modal-title">${T('auth.modal.title')}</h2>

        <div class="auth-tabs">
          <button class="auth-tab active" data-tab="login">${T('auth.tab.login')}</button>
          <button class="auth-tab" data-tab="register">${T('auth.tab.register')}</button>
        </div>

        <!-- LOGIN -->
        <div class="auth-panel" id="authPanelLogin">
          <input class="auth-modal-input" id="authLoginEmail" type="email"
                 placeholder="${T('auth.placeholder.email')}" autocomplete="email">
          <input class="auth-modal-input" id="authLoginPass" type="password"
                 placeholder="${T('auth.placeholder.password')}" autocomplete="current-password">
          <button class="auth-modal-btn" id="authLoginBtn">${T('auth.btn.login')}</button>
          <div style="text-align:center;margin-top:10px;">
            <a href="#" id="authForgotLink" style="font-size:12px;color:var(--accent,#4fc3f7);text-decoration:none;">${T('auth.forgotPassword')}</a>
          </div>
        </div>

        <!-- FORGOT PASSWORD -->
        <div class="auth-panel" id="authPanelForgot" style="display:none">
          <p style="font-size:13px;color:#90a4ae;margin-bottom:14px;">${T('auth.forgot.hint')}</p>
          <input class="auth-modal-input" id="authForgotEmail" type="email"
                 placeholder="${T('auth.placeholder.email')}" autocomplete="email">
          <button class="auth-modal-btn" id="authForgotBtn">${T('auth.forgot.send')}</button>
          <div style="text-align:center;margin-top:10px;">
            <a href="#" id="authBackToLoginLink" style="font-size:12px;color:var(--accent,#4fc3f7);text-decoration:none;">${T('auth.backToLogin')}</a>
          </div>
        </div>

        <!-- REGISTER -->
        <div class="auth-panel" id="authPanelRegister" style="display:none">
          <input class="auth-modal-input" id="authRegName" type="text"
                 placeholder="${T('auth.placeholder.name')}" autocomplete="name">
          <input class="auth-modal-input" id="authRegEmail" type="email"
                 placeholder="${T('auth.placeholder.email')}" autocomplete="email">
          <input class="auth-modal-input" id="authRegPass" type="password"
                 placeholder="${T('auth.placeholder.passwordMin')}" autocomplete="new-password">
          <input class="auth-modal-input" id="authRegPass2" type="password"
                 placeholder="${T('auth.placeholder.confirmPassword')}" autocomplete="new-password">
          <button class="auth-modal-btn" id="authRegBtn">${T('auth.btn.register')}</button>
        </div>

        <div class="auth-modal-msg" id="authMsg"></div>
      </div>`;

    // Tab styles (injected once)
    if (!document.getElementById('authTabStyle')) {
      const s = document.createElement('style');
      s.id = 'authTabStyle';
      s.textContent = `
        .auth-tabs { display:flex; gap:8px; margin-bottom:18px; }
        .auth-tab {
          flex:1; padding:9px; border-radius:8px; border:1px solid rgba(79,195,247,0.25);
          background:transparent; color:var(--accent,#4fc3f7); cursor:pointer;
          font-size:14px; font-family:var(--font-play,'Play',sans-serif);
          transition:background 0.2s;
        }
        .auth-tab.active {
          background:rgba(79,195,247,0.18); border-color:rgba(79,195,247,0.6);
        }
        .auth-tab:hover:not(.active) { background:rgba(79,195,247,0.08); }
        .auth-panel .auth-modal-input { margin-bottom:10px; }
      `;
      document.head.appendChild(s);
    }

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    overlay.querySelector('#authLoginEmail').focus();

    function close() {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 200);
    }

    overlay.querySelector('.auth-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });

    const msgEl = overlay.querySelector('#authMsg');

    function showMsg(text, isOk) {
      msgEl.textContent = text;
      msgEl.className = 'auth-modal-msg ' + (isOk ? 'ok' : 'err');
    }

    // Tab switching
    overlay.querySelectorAll('.auth-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        overlay.querySelectorAll('.auth-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const which = tab.dataset.tab;
        overlay.querySelector('#authPanelLogin').style.display    = which === 'login'    ? '' : 'none';
        overlay.querySelector('#authPanelRegister').style.display = which === 'register' ? '' : 'none';
        msgEl.textContent = '';
        const first = overlay.querySelector(which === 'login' ? '#authLoginEmail' : '#authRegName');
        if (first) first.focus();
      });
    });

    // LOGIN
    async function doLogin() {
      const email = overlay.querySelector('#authLoginEmail').value.trim();
      const pass  = overlay.querySelector('#authLoginPass').value;
      if (!email || !pass) { showMsg(T('auth.err.emailPassRequired')); return; }
      const btn = overlay.querySelector('#authLoginBtn');
      btn.disabled = true; btn.textContent = T('auth.btn.loggingIn');
      try {
        await window.API.login(email, pass);
        showMsg(T('auth.ok.loginSuccess'), true);
        setTimeout(close, 800);
      } catch (err) {
        showMsg('✗ ' + err.message);
        btn.disabled = false; btn.textContent = T('auth.btn.login');
      }
    }

    overlay.querySelector('#authLoginBtn').addEventListener('click', doLogin);
    overlay.querySelector('#authLoginPass').addEventListener('keydown', e => { if (e.key === 'Enter') doLogin(); });
    overlay.querySelector('#authLoginEmail').addEventListener('keydown', e => { if (e.key === 'Enter') overlay.querySelector('#authLoginPass').focus(); });

    // FORGOT PASSWORD
    const panelLogin  = overlay.querySelector('#authPanelLogin');
    const panelForgot = overlay.querySelector('#authPanelForgot');
    overlay.querySelector('#authForgotLink').addEventListener('click', (e) => {
      e.preventDefault();
      panelLogin.style.display = 'none';
      panelForgot.style.display = '';
      overlay.querySelector('#authForgotEmail').value = overlay.querySelector('#authLoginEmail').value;
      overlay.querySelector('#authForgotEmail').focus();
      msgEl.textContent = '';
    });
    overlay.querySelector('#authBackToLoginLink').addEventListener('click', (e) => {
      e.preventDefault();
      panelForgot.style.display = 'none';
      panelLogin.style.display = '';
      msgEl.textContent = '';
    });
    async function doForgotPassword() {
      const email = overlay.querySelector('#authForgotEmail').value.trim();
      if (!email) { showMsg(T('auth.err.emailRequired')); return; }
      const btn = overlay.querySelector('#authForgotBtn');
      btn.disabled = true; btn.textContent = T('auth.forgot.sending');
      try {
        await window.API.requestPasswordReset(email);
        showMsg(T('auth.ok.resetLinkSent'), true);
        btn.textContent = T('auth.forgot.send');
      } catch (err) {
        // Always show generic success message to avoid leaking which emails exist
        showMsg(T('auth.ok.resetLinkSent'), true);
        btn.textContent = T('auth.forgot.send');
      } finally {
        btn.disabled = false;
      }
    }
    overlay.querySelector('#authForgotBtn').addEventListener('click', doForgotPassword);
    overlay.querySelector('#authForgotEmail').addEventListener('keydown', e => { if (e.key === 'Enter') doForgotPassword(); });

    // REGISTER
    async function doRegister() {
      const name  = overlay.querySelector('#authRegName').value.trim();
      const email = overlay.querySelector('#authRegEmail').value.trim();
      const pass  = overlay.querySelector('#authRegPass').value;
      const pass2 = overlay.querySelector('#authRegPass2').value;
      if (!email || !pass) { showMsg(T('auth.err.emailPassRequired')); return; }
      if (pass.length < 8) { showMsg(T('auth.err.passwordMin')); return; }
      if (pass !== pass2)  { showMsg(T('auth.err.passwordMismatch')); return; }
      const btn = overlay.querySelector('#authRegBtn');
      btn.disabled = true; btn.textContent = T('auth.btn.registering');
      try {
        await window.API.register(email, pass, name || undefined);
        showMsg(T('auth.ok.registerSuccess', { email }), true);
        btn.disabled = false; btn.textContent = T('auth.btn.register');
      } catch (err) {
        showMsg('✗ ' + err.message);
        btn.disabled = false; btn.textContent = T('auth.btn.register');
      }
    }

    overlay.querySelector('#authRegBtn').addEventListener('click', doRegister);
    overlay.querySelector('#authRegPass2').addEventListener('keydown', e => { if (e.key === 'Enter') doRegister(); });
  }

  // ── Save-to-DB button on prompt panel ─────────────────────────
  function injectSaveToDbButton() {
    // Button is already in index.html (Error Checker panel)
    const saveDbBtn = document.getElementById('btnSaveToDb');
    if (!saveDbBtn || saveDbBtn._wired) return;
    saveDbBtn._wired = true;

    saveDbBtn.addEventListener('click', async () => {
      if (!window.API?.isLoggedIn()) { showLoginModal(); return; }
      const raw = document.getElementById('promptOutputRaw');
      const content = raw?.value?.trim();
      if (!content) { if (window.toast) toast(T('save.nothingToSave'), 'error'); return; }

      // Domain selection dialog
      const DOMAINS = Object.keys(DOMAIN_KEYS).map(k => [k, domainLabel(k)]);
      const autoTitle = content.split('\n').find(l => l.startsWith('#'))
                       ?.replace(/^#+\s*/, '').slice(0, 80) ||
                       content.slice(0, 50);
      const saveChoice = await new Promise(resolve => {
        const dlg = document.createElement('div');
        dlg.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,17,31,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
        dlg.innerHTML = `<div style="background:#132f4c;border:1px solid rgba(79,195,247,0.3);border-radius:16px;padding:28px;max-width:440px;width:92%;">
          <h3 style="color:#4fc3f7;margin:0 0 16px;">${T('save.title')}</h3>
          <label style="display:block;font-size:12px;color:#90a4ae;margin-bottom:4px;">${T('save.promptName')}</label>
          <input id="dlgTitle" type="text" value="${autoTitle.replace(/"/g,'&quot;')}" placeholder="${T('save.promptNamePlaceholder')}" style="width:100%;padding:10px;background:#0a1929;border:1px solid rgba(79,195,247,0.3);border-radius:8px;color:#e3f2fd;font-size:14px;margin-bottom:14px;box-sizing:border-box;">
          <label style="display:block;font-size:12px;color:#90a4ae;margin-bottom:4px;">${T('save.domain')}</label>
          <select id="dlgDomain" style="width:100%;padding:10px;background:#0a1929;border:1px solid rgba(79,195,247,0.3);border-radius:8px;color:#e3f2fd;font-size:14px;margin-bottom:16px;"></select>
          <div style="display:flex;gap:10px;">
            <button id="dlgSave" style="flex:1;padding:10px;background:#4fc3f7;color:#0a1929;border:none;border-radius:8px;font-weight:700;cursor:pointer;">${T('save.btn.save')}</button>
            <button id="dlgCancel" style="flex:1;padding:10px;background:transparent;border:1px solid rgba(79,195,247,0.3);color:#4fc3f7;border-radius:8px;cursor:pointer;">${T('save.btn.cancel')}</button>
          </div></div>`;
        document.body.appendChild(dlg);
        const sel = dlg.querySelector('#dlgDomain');
        DOMAINS.forEach(([v,l]) => { const o = document.createElement('option'); o.value=v; o.textContent=l; sel.appendChild(o); });
        const titleInput = dlg.querySelector('#dlgTitle');
        titleInput.focus();
        titleInput.select();
        dlg.querySelector('#dlgSave').onclick = () => {
          const t = titleInput.value.trim() || autoTitle;
          const d = sel.value;
          dlg.remove();
          resolve({ title: t, domain: d });
        };
        dlg.querySelector('#dlgCancel').onclick = () => { dlg.remove(); resolve(null); };
        titleInput.addEventListener('keydown', e => { if (e.key === 'Enter') dlg.querySelector('#dlgSave').click(); });
      });
      if (!saveChoice) return;
      const domainChoice = saveChoice.domain;
      const customTitle = saveChoice.title;

      saveDbBtn.disabled = true;
      saveDbBtn.textContent = T('save.btn.saving');

      try {
        // Collect metadata from current state
        const domain = domainChoice;
        const style       = document.getElementById('promptStyle')?.value || null;
        const output_lang = document.getElementById('promptLang')?.value || null;
        const engine      = (typeof DeepSeek !== 'undefined') ? DeepSeek.getActiveEngine?.() : 'local';
        const tokenEl     = document.getElementById('statTokens');
        const token_count = tokenEl ? parseInt(tokenEl.textContent.replace(/,/g,'')) || null : null;
        const wordEl      = document.getElementById('statWords');
        const word_count  = wordEl ? parseInt(wordEl.textContent.replace(/,/g,'')) || null : null;
        const qualEl      = document.getElementById('statQual');
        // Stable key set by the checker ('excellent', 'needsWork', …); null if not checked yet
        const quality_score = qualEl?.dataset.quality || null;

        const title = customTitle;

        // Save source text first
        const sourceEl = document.getElementById('promptInput');
        const original_text = sourceEl?.value?.trim() || '';
        let source_text_id = null;
        if (original_text) {
          try {
            const src = await window.API.saveSourceText({
              original_text,
              detected_lang: window._lastDetectedLang || 'en',
              domain,
            });
            source_text_id = src?.id || null;
          } catch {}
        }
        await window.API.savePrompt({
          source_text_id, title, content, domain, style, output_lang, engine, token_count, word_count, quality_score
        });

        if (window.toast) toast(T('save.ok'), 'success');
        // Refresh prompt list if panel is open
        window.dispatchEvent(new CustomEvent('jsprompt:prompt-saved'));
      } catch (err) {
        if (window.toast) toast(T('save.failed', { error: err.message }), 'error');
      } finally {
        saveDbBtn.disabled = false;
        saveDbBtn.innerHTML = T('save.btn.saveToAccount');
      }
    });
  }

  // ── DB Panel (Library / Stats / Schedule) ────────────────────
  let _dbOverlay = null;

  function openDbPanel(tab = 'library') {
    if (!window.API?.isLoggedIn()) { showLoginModal(); return; }

    if (_dbOverlay) { _dbOverlay.remove(); _dbOverlay = null; }

    const overlay = document.createElement('div');
    overlay.className = 'auth-modal-overlay';
    overlay.style.cssText = 'align-items:flex-start;padding:20px;overflow-y:auto;';
    overlay.innerHTML = `
      <div class="auth-modal-box" style="max-width:720px;width:100%;min-height:500px;position:relative;">
        <button class="auth-modal-close" aria-label="Close">&times;</button>
        <h2 class="auth-modal-title" style="margin-bottom:16px;">${T('db.title')}</h2>
        <div class="db-subtabs">
          <button class="db-subtab ${tab==='library'?'active':''}" data-tab="library">${T('db.tab.library')}</button>
          <button class="db-subtab ${tab==='stats'?'active':''}" data-tab="stats">${T('db.tab.stats')}</button>
          <button class="db-subtab ${tab==='schedule'?'active':''}" data-tab="schedule">${T('db.tab.schedule')}</button>
        </div>
        <div id="dbPanelContent"></div>
      </div>`;
    document.body.appendChild(overlay);
    _dbOverlay = overlay;

    requestAnimationFrame(() => overlay.classList.add('visible'));

    overlay.querySelector('.auth-modal-close').addEventListener('click', () => {
      overlay.classList.remove('visible');
      setTimeout(() => { overlay.remove(); _dbOverlay = null; }, 200);
    });
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('visible');
        setTimeout(() => { overlay.remove(); _dbOverlay = null; }, 200);
      }
    });

    // Tab switching
    overlay.querySelectorAll('.db-subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        overlay.querySelectorAll('.db-subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderDbTab(btn.dataset.tab, overlay.querySelector('#dbPanelContent'));
      });
    });

    renderDbTab(tab, overlay.querySelector('#dbPanelContent'));
  }

  async function renderDbTab(tab, container) {
    container.innerHTML = `<div style="text-align:center;padding:30px;color:var(--text-dim)">${T('lib.loading')}</div>`;
    try {
      if (tab === 'library') await renderLibrary(container);
      if (tab === 'stats')   await renderStats(container);
      if (tab === 'schedule') await renderSchedule(container);
    } catch (err) {
      container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⚠️</div>${err.message}</div>`;
    }
  }

  // ── Library tab ───────────────────────────────────────────────
  async function renderLibrary(container) {
    let searchQ = '';
    let filterDomain = '';

    // Filter options
    const domainOptions = ['', ...Object.keys(DOMAIN_KEYS)].map(d =>
      `<option value="${d}">${d ? domainLabel(d) : T('lib.allDomains')}</option>`
    ).join('');

    // Render HTML structure once
    container.innerHTML = `
      <div style="display:flex;gap:10px;margin-bottom:10px;">
        <input class="db-search-box" id="dbSearch" placeholder="${T('lib.search.placeholder')}" value="" style="margin:0;flex:1;">
        <button id="btnRefreshPrompts" title="${T('lib.refresh.title')}" style="padding:10px 14px;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.2);border-radius:10px;color:#4fc3f7;cursor:pointer;font-size:16px;white-space:nowrap;">↺</button>
        <select class="schedule-select" id="dbDomainFilter" style="width:auto;padding:10px 12px;">
          ${domainOptions}
        </select>
      </div>
      <div id="promptList"></div>`;

    const renderPrompts = async () => {
      const list = document.getElementById('promptList');
      if (!list) return;
      list.innerHTML = `<div style="text-align:center;padding:20px;color:#90a4ae;">${T('lib.loading')}</div>`;
      const prompts = await window.API.listPrompts({ q: searchQ, domain: filterDomain, limit: 50 });
      if (!list.isConnected) return; // panel was closed

      if (!prompts.length) {
        list.innerHTML = `<div class="empty-state"><div class="empty-state-icon">📋</div>${T('lib.empty', { q: searchQ ? ' for "' + escHtml(searchQ) + '"' : '' })}</div>`;
        return;
      }

      list.innerHTML = prompts.map(p => `
        <div class="prompt-card" data-id="${p.id}">
          <div class="prompt-card-header">
            <div class="prompt-card-title" title="${escHtml(p.title)}">${escHtml(p.title)}</div>
            <div class="prompt-card-domain">${domainLabel(p.domain)}</div>
          </div>
          ${p.source_original_text ? `<div class="prompt-card-source" style="font-size:12px;color:#607080;margin:4px 0 6px;border-left:2px solid rgba(79,195,247,0.3);padding-left:8px;font-style:italic;">📝 ${escHtml(p.source_original_text)}${p.source_original_text.length>=150?'…':''}</div>` : ''}
          <div class="prompt-card-preview">${escHtml(p.content_preview || '')}</div>
          <div class="prompt-card-actions">
            <button class="btn-xs" data-action="copy" data-id="${p.id}" title="${T('lib.copyPrompt')}">${T('lib.copyPrompt')}</button>
            ${p.source_original_text ? `<button class="btn-xs" data-action="copy-source" data-source="${escHtml(p.source_original_text)}" data-id="${p.id}" title="${T('lib.copySource')}">${T('lib.copySource')}</button>` : ''}
            <button class="btn-xs" data-action="load" data-id="${p.id}">${T('lib.load')}</button>
            <button class="btn-xs danger" data-action="delete" data-id="${p.id}">${T('lib.delete')}</button>
            <span class="prompt-card-meta">
              ${new Date(p.created_at).toLocaleDateString()}
              ${p.word_count ? ' · '+p.word_count+' '+T('lib.words') : ''}
              · ${p.token_count ? p.token_count.toLocaleString() : '?'} ${T('lib.tokens')}
              ${p.quality_score ? ' · '+escHtml(qualityLabel(p.quality_score)) : ''}
            </span>
          </div>
        </div>`).join('');
    };

    // Single event delegation — remove previous listener if any
    if (container._abortCtrl) container._abortCtrl.abort();
    container._abortCtrl = new AbortController();
    const sig = container._abortCtrl.signal;

    container.addEventListener('click', async (e) => {
      // Refresh button
      if (e.target.closest('#btnRefreshPrompts')) {
        await renderPrompts();
        if (window.toast) toast(T('lib.refreshed'), 'success');
        return;
      }
      // Card action buttons
      const btn = e.target.closest('[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'copy') {
        try {
          const full = await window.API.getPrompt(id);
          await navigator.clipboard.writeText(full.content);
          if (window.toast) toast(T('lib.copyPromptOk'), 'success');
        } catch { if (window.toast) toast(T('lib.copyFailed'), 'error'); }
      }
      if (action === 'copy-source') {
        try {
          await navigator.clipboard.writeText(btn.dataset.source);
          if (window.toast) toast(T('lib.copySourceOk'), 'success');
        } catch { if (window.toast) toast(T('lib.copyFailed'), 'error'); }
      }
      if (action === 'load') {
        try {
          const full = await window.API.getPrompt(id);
          if (!full.source_original_text) {
            if (window.toast) toast(T('lib.noSourceText'), 'error');
            return;
          }
          const inputEl = document.getElementById('promptInput');
          if (inputEl) {
            inputEl.value = full.source_original_text;
            inputEl.dispatchEvent(new Event('input'));
          }
          if (_dbOverlay) { _dbOverlay.classList.remove('visible'); setTimeout(() => { _dbOverlay?.remove(); _dbOverlay = null; }, 200); }
          if (window.toast) toast(T('lib.loadOk'), 'success');
        } catch {
          if (window.toast) toast(T('lib.loadFailed'), 'error');
        }
      }
      if (action === 'delete') {
        const confirmed = await new Promise(resolve => {
          const d = document.createElement('div');
          d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,17,31,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
          d.innerHTML = `<div style="background:#132f4c;border:1px solid rgba(255,107,107,0.4);border-radius:16px;padding:28px;max-width:360px;width:92%;text-align:center;"><div style="font-size:32px;margin-bottom:12px;">🗑️</div><h3 style="color:#ff6b6b;margin:0 0 8px;">${T('lib.deleteTitle')}</h3><p style="color:#90a4ae;margin:0 0 20px;font-size:14px;">${T('lib.deleteBody')}</p><div style="display:flex;gap:10px;"><button id="dNo" style="flex:1;padding:10px;background:transparent;border:1px solid rgba(79,195,247,0.3);color:#4fc3f7;border-radius:8px;cursor:pointer;">${T('lib.cancelBtn')}</button><button id="dYes" style="flex:1;padding:10px;background:#ff6b6b;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">${T('lib.deleteBtn')}</button></div></div>`;
          document.body.appendChild(d);
          d.querySelector('#dYes').onclick = () => { d.remove(); resolve(true); };
          d.querySelector('#dNo').onclick  = () => { d.remove(); resolve(false); };
        });
        if (!confirmed) return;
        await window.API.deletePrompt(id);
        if (window.toast) toast(T('lib.deletedOk'), 'success');
        await renderPrompts();
      }
    }, { signal: sig });

    container.addEventListener('input', (e) => {
      if (e.target.id === 'dbSearch') { searchQ = e.target.value.trim(); renderPrompts(); }
    }, { signal: sig });
    container.addEventListener('change', (e) => {
      if (e.target.id === 'dbDomainFilter') { filterDomain = e.target.value; renderPrompts(); }
    }, { signal: sig });

    await renderPrompts();
  }

  // ── Stats tab ─────────────────────────────────────────────────
  async function renderStats(container) {
    const stats = await window.API.getStats();
    const total = stats.totals;
    const byDomain = stats.by_domain || [];
    const maxCount = Math.max(...byDomain.map(d => parseInt(d.prompt_count)), 1);

    const barsHtml = byDomain.length
      ? byDomain.map(d => `
          <div class="stat-bar-row">
            <div class="stat-bar-label" title="${domainLabel(d.domain)}">${domainLabel(d.domain)}</div>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${Math.round((d.prompt_count/maxCount)*100)}%"></div>
            </div>
            <div class="stat-bar-count">${d.prompt_count}</div>
          </div>`)
          .join('')
      : `<div class="empty-state"><div class="empty-state-icon">📋 </div>${T('stats.noPrompts')}</div>`;

    // Activity sparkline (last 30 days)
    const activity = stats.activity || [];
    const actMax   = Math.max(...activity.map(a => parseInt(a.count)), 1);
    const sparkHtml = activity.map(a => {
      const h = Math.max(4, Math.round((a.count / actMax) * 40));
      return `<div title="${a.day}: ${a.count}" style="width:6px;height:${h}px;background:var(--accent,#4fc3f7);border-radius:2px;opacity:0.7;flex-shrink:0;"></div>`;
    }).join('');

    container.innerHTML = `
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:14px;margin-bottom:24px;">
        <div style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:var(--accent)">${total.total_prompts||0}</div>
          <div style="font-size:12px;color:var(--text-dim)">${T('stats.totalPrompts')}</div>
        </div>
        <div style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:var(--accent)">${Number(total.total_tokens||0).toLocaleString()}</div>
          <div style="font-size:12px;color:var(--text-dim)">${T('stats.totalTokens')}</div>
        </div>
        <div style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:var(--accent)">${Math.round(total.avg_tokens||0)}</div>
          <div style="font-size:12px;color:var(--text-dim)">${T('stats.avgTokens')}</div>
        </div>
        <div style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);border-radius:10px;padding:16px;text-align:center;">
          <div style="font-size:28px;font-weight:700;color:var(--accent)">${byDomain.length}</div>
          <div style="font-size:12px;color:var(--text-dim)">${T('stats.domainsUsed')}</div>
        </div>
      </div>

      <h3 style="font-size:14px;color:var(--accent);margin-bottom:12px;">${T('stats.byDomain')}</h3>
      ${barsHtml}

      ${activity.length ? `
      <h3 style="font-size:14px;color:var(--accent);margin:20px 0 12px;">${T('stats.activity30')}</h3>
      <div style="display:flex;align-items:flex-end;gap:2px;height:44px;padding:0 4px;">
        ${sparkHtml}
      </div>
      <div style="font-size:11px;color:var(--text-dim);margin-top:4px;">${activity[0]?.day||''} → ${activity[activity.length-1]?.day||''}</div>
      ` : ''}`;
  }

  // ── Schedule tab ──────────────────────────────────────────────
  async function renderSchedule(container) {

    // ── AbortController — removes previous listener on re-render ─────
    // Fixes the "multiple clicks needed" bug: without this, each call to
    // renderSchedule() added another click handler to container, so the
    // second job deletion required 2 clicks, the third — 3 clicks, etc.
    if (container._schedAbort) container._schedAbort.abort();
    container._schedAbort = new AbortController();
    const sig = container._schedAbort.signal;

    const jobs = await window.API.listJobs();

    // Jobs that can be bulk-deleted (already finished)
    const doneJobs = jobs.filter(j => ['done','failed','cancelled','canceled'].includes(j.status));

    const jobsHtml = jobs.length
      ? jobs.map(j => `
          <div class="prompt-card">
            <div class="prompt-card-header">
              <div class="prompt-card-title">${escHtml(j.prompt_title||T('sched.untitled'))}</div>
              <div class="prompt-card-domain">${j.target_ai}</div>
            </div>
            <div style="font-size:12px;color:var(--text-dim);margin-bottom:8px;">
              ${domainLabel(j.domain)} · ${T('sched.type.'+j.schedule_type)} · 
              ${T('sched.next')}: ${j.next_run_at ? new Date(j.next_run_at).toLocaleString() : '—'} · 
              ${T('sched.status')}: <span style="color:${j.status==='done'?'var(--ok)':j.status==='failed'?'var(--error)':'var(--accent)'}">${j.status}</span>
              · ${T('sched.runs')}: ${j.run_count}
            </div>
            <div class="prompt-card-actions">
              <button class="btn-xs" data-action="results" data-id="${j.id}">${T('sched.results')}</button>
              ${j.status === 'pending' ? `<button class="btn-xs danger" data-action="cancel" data-id="${j.id}">${T('sched.cancel')}</button>` : ''}
              <button class="btn-xs danger" data-action="delete-job" data-id="${j.id}">${T('sched.delete')}</button>
            </div>
          </div>`).join('')
      : `<div class="empty-state"><div class="empty-state-icon">⏱</div>${T('sched.noJobs')}</div>`;

    container.innerHTML = `
      <div style="margin-bottom:20px;">
        <h3 style="font-size:14px;color:var(--accent);margin-bottom:14px;">${T('sched.createTitle')}</h3>
        <div class="schedule-field">
          <label class="schedule-label">${T('sched.promptToExecute')}</label>
          <select class="schedule-select" id="schedPromptSel">
            <option value="">${T('sched.selectPrompt')}</option>
          </select>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="schedule-field">
            <label class="schedule-label">${T('sched.targetAi')}</label>
            <select class="schedule-select" id="schedAi">
              <option value="gemini">Gemini</option>
              <option value="deepseek">DeepSeek</option>
              <option value="claude">Claude</option>
            </select>
          </div>
          <div class="schedule-field">
            <label class="schedule-label">${T('sched.scheduleType')}</label>
            <select class="schedule-select" id="schedType">
              <option value="once">${T('sched.type.once')}</option>
              <option value="weekly">${T('sched.type.weekly')}</option>
              <option value="monthly">${T('sched.type.monthly')}</option>
            </select>
          </div>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="schedule-field">
            <label class="schedule-label">${T('sched.firstRun')}</label>
            <input class="schedule-input" type="datetime-local" id="schedDateTime">
          </div>
          <div class="schedule-field">
            <label class="schedule-label">${T('sched.maxTokens')} <span id="schedTokensDefault" style="color:var(--text-dim);font-weight:400;">${T('sched.default', { n: 8192 })}</span></label>
            <input class="schedule-input" type="number" id="schedMaxTokens" placeholder="8192" min="1" max="65536" step="1">
          </div>
        </div>
        <button class="auth-modal-btn" id="schedCreateBtn" style="margin-top:4px;">${T('sched.scheduleJobBtn')}</button>
        <div id="schedMsg" style="margin-top:8px;font-size:12px;"></div>
      </div>
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;gap:8px;flex-wrap:wrap;">
        <h3 style="font-size:14px;color:var(--accent);margin:0;">${T('sched.scheduledJobs')}</h3>
        <div style="display:flex;gap:8px;align-items:center;">
          ${doneJobs.length ? `<button id="btnDeleteCompleted" title="${T('sched.deleteCompleted.title')}"
            style="padding:6px 12px;background:rgba(255,107,107,0.12);border:1px solid rgba(255,107,107,0.3);
                   border-radius:8px;color:#ff6b6b;cursor:pointer;font-size:12px;font-weight:600;white-space:nowrap;">
            🗑 ${T('sched.deleteCompleted.btn')} (${doneJobs.length})
          </button>` : ''}
          <button id="btnRefreshJobs" title="${T('sched.refresh.title')}"
            style="padding:6px 12px;background:rgba(79,195,247,0.1);border:1px solid rgba(79,195,247,0.2);
                   border-radius:8px;color:#4fc3f7;cursor:pointer;font-size:16px;line-height:1;">↺</button>
        </div>
      </div>
      <div id="jobsList">${jobsHtml}</div>`;

    // Populate prompt selector
    try {
      const prompts = await window.API.listPrompts({ limit: 100 });
      const sel = container.querySelector('#schedPromptSel');
      prompts.forEach(p => {
        const opt = document.createElement('option');
        opt.value = p.id;
        opt.textContent = `${domainLabel(p.domain)} — ${p.title.slice(0,50)}`;
        sel.appendChild(opt);
      });
    } catch {}

    // Max tokens defaults per provider — updates placeholder/hint when Target AI changes
    const TOKEN_DEFAULTS = { gemini: 8192, deepseek: 8000, claude: 8000 };
    const aiSel       = container.querySelector('#schedAi');
    const tokensInput = container.querySelector('#schedMaxTokens');
    const tokensHint  = container.querySelector('#schedTokensDefault');
    function syncTokenDefault() {
      const def = TOKEN_DEFAULTS[aiSel.value] || 8192;
      tokensInput.placeholder = String(def);
      tokensHint.textContent  = T('sched.default', { n: def });
    }
    aiSel.addEventListener('change', syncTokenDefault);
    syncTokenDefault();

    // Prefill "First run date/time" with the current local time + 2 minutes.
    // datetime-local needs LOCAL time as "YYYY-MM-DDTHH:mm" (never toISOString,
    // which is UTC and would shift the field by the timezone offset).
    const dtInput = container.querySelector('#schedDateTime');
    if (dtInput && !dtInput.value) {
      const d   = new Date(Date.now() + 2 * 60 * 1000);
      const pad = n => String(n).padStart(2, '0');
      dtInput.value = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
                    + `T${pad(d.getHours())}:${pad(d.getMinutes())}`;
    }

    // Populate Target AI with ALL providers this user has keys for (built-in + custom)
    try {
      const jsToken = sessionStorage.getItem('_jsat') || '';
      const resp = await fetch('/api/user-keys/all', {
        headers: { Authorization: 'Bearer ' + jsToken },
      });
      if (resp.ok) {
        const data = await resp.json();
        const providers = data.providers || {};
        const existingValues = Array.from(aiSel.options).map(o => o.value);
        Object.keys(providers).forEach(key => {
          if (existingValues.includes(key)) return; // already in the static list
          const opt = document.createElement('option');
          opt.value = key;
          opt.textContent = providers[key].label || key;
          aiSel.appendChild(opt);
        });
      }
    } catch {}

    // Create job
    container.querySelector('#schedCreateBtn').addEventListener('click', async () => {
      const prompt_id    = container.querySelector('#schedPromptSel').value;
      const target_ai    = container.querySelector('#schedAi').value;
      const schedule_type = container.querySelector('#schedType').value;
      const dtVal        = container.querySelector('#schedDateTime').value;
      const tokensVal     = container.querySelector('#schedMaxTokens').value;
      const msgEl         = container.querySelector('#schedMsg');

      if (!prompt_id) { msgEl.textContent = T('sched.selectPromptFirst'); msgEl.style.color='var(--error)'; return; }
      if (!dtVal) { msgEl.textContent = T('sched.setDateTime'); msgEl.style.color='var(--error)'; return; }

      try {
        await window.API.createJob({
          prompt_id, target_ai, schedule_type,
          next_run_at: new Date(dtVal).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          max_tokens: tokensVal ? parseInt(tokensVal) : null,
        });
        if (window.toast) toast(T('sched.scheduledOk'), 'success');
        // Full re-render to restore all buttons and event handlers correctly
        await renderSchedule(container);
        return;
      } catch (err) {
        msgEl.textContent = '✗ ' + err.message;
        msgEl.style.color = 'var(--error)';
      }
    });

    // ── Refresh button ──────────────────────────────────────────
    const refreshBtn = container.querySelector('#btnRefreshJobs');
    if (refreshBtn) {
      refreshBtn.addEventListener('click', async () => {
        await renderSchedule(container);
        if (window.toast) toast(T('sched.refreshed'), 'success');
      }, { signal: sig });
    }

    // ── Delete Completed button ──────────────────────────────────
    const deleteCompletedBtn = container.querySelector('#btnDeleteCompleted');
    if (deleteCompletedBtn) {
      deleteCompletedBtn.addEventListener('click', async () => {
        const confirmed = await new Promise(resolve => {
          const d = document.createElement('div');
          d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,17,31,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
          d.innerHTML = `<div style="background:#132f4c;border:1px solid rgba(255,107,107,0.4);border-radius:16px;padding:28px;max-width:380px;width:92%;text-align:center;">
            <h3 style="color:#ff6b6b;margin:0 0 12px;">${T('sched.deleteCompleted.confirmTitle')}</h3>
            <p style="color:#90a4ae;font-size:13px;margin-bottom:18px;">${T('sched.deleteCompleted.confirmBody', { n: doneJobs.length })}</p>
            <div style="display:flex;gap:10px;">
              <button id="dcNo" style="flex:1;padding:10px;background:transparent;border:1px solid rgba(79,195,247,0.3);color:#4fc3f7;border-radius:8px;cursor:pointer;">${T('sched.deleteJobNo')}</button>
              <button id="dcYes" style="flex:1;padding:10px;background:#ff6b6b;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">${T('sched.deleteCompleted.confirmYes')}</button>
            </div>
          </div>`;
          document.body.appendChild(d);
          d.querySelector('#dcYes').onclick = () => { d.remove(); resolve(true); };
          d.querySelector('#dcNo').onclick  = () => { d.remove(); resolve(false); };
        });
        if (!confirmed) return;

        deleteCompletedBtn.disabled = true;
        deleteCompletedBtn.textContent = '…';
        let deleted = 0;
        for (const j of doneJobs) {
          try { await window.API.deleteJobPermanently(j.id); deleted++; } catch {}
        }
        if (window.toast) toast(T('sched.deleteCompleted.doneToast', { n: deleted }), 'success');
        await renderSchedule(container);
      }, { signal: sig });
    }

    // ── Job actions (Results / Delete / Cancel) ──────────────────
    container.addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) return;

      if (btn.dataset.action === 'results') {
        try {
          const results = await window.API.getJobResults(btn.dataset.id);
          if (!results.length) { if (window.toast) toast(T('sched.noResultsYet'), 'error'); return; }
          document.querySelectorAll('[data-overlay="job-results"]').forEach(el => el.remove());
          const d = document.createElement('div');
          d.dataset.overlay = 'job-results';
          d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,17,31,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
          d.innerHTML = `<div style="background:#132f4c;border:1px solid rgba(79,195,247,0.3);border-radius:16px;padding:28px;max-width:700px;width:92%;max-height:85vh;overflow-y:auto;">
            <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
              <h3 style="color:#4fc3f7;margin:0;">${T('sched.jobResults', { n: results.length })}</h3>
              <button id="closeRes" style="background:none;border:none;color:#90a4ae;font-size:20px;cursor:pointer;">×</button>
            </div>
            ${results.map((r,i) => `
              <div style="border:1px solid rgba(79,195,247,0.15);border-radius:8px;padding:12px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
                  <div style="font-size:11px;color:#90a4ae;">
                    ${new Date(r.ran_at).toLocaleString()} ·
                    <span style="color:${r.status==='done'?'#66bb6a':'#ff6b6b'}">${r.status}</span>
                    ${r.token_count ? ' · '+r.token_count+' '+T('lib.tokens') : ''}
                    ${r.duration_ms ? ' · '+(r.duration_ms/1000).toFixed(1)+'s' : ''}
                  </div>
                  <div style="display:flex;gap:6px;">
                    <button class="btn-xs" data-res-action="copy" data-idx="${i}">${T('sched.copy')}</button>
                    <button class="btn-xs" data-res-action="download-md" data-idx="${i}" title="${T('sched.downloadMd')}">⬇ .md</button>
                    <button class="btn-xs" data-res-action="download-txt" data-idx="${i}" title="${T('sched.downloadTxt')}">⬇ .txt</button>
                    <button class="btn-xs" data-res-action="download-docx" data-idx="${i}" title="${T('sched.downloadDocx')}">⬇ .docx</button>
                  </div>
                </div>
                <div style="font-size:12px;color:#e3f2fd;white-space:pre-wrap;max-height:250px;overflow-y:auto;background:rgba(0,0,0,0.2);padding:10px;border-radius:6px;">${escHtml((r.result_text && window.MdExport ? MdExport.normalize(r.result_text) : r.result_text) || (r.error_message && r.error_message.startsWith('job.err.') ? T(r.error_message) : r.error_message) || T('sched.noContent'))}</div>
              </div>`).join('')}
          </div>`;
          document.body.appendChild(d);
          d.querySelector('#closeRes').onclick = () => document.querySelectorAll('[data-overlay="job-results"]').forEach(el => el.remove());
          d.addEventListener('click', e => { if (e.target === d) document.querySelectorAll('[data-overlay="job-results"]').forEach(el => el.remove()); });
          d.querySelectorAll('[data-res-action]').forEach(rb => {
            rb.addEventListener('click', async () => {
              const idx = parseInt(rb.dataset.idx);
              const errMsg = results[idx].error_message || '';
              const raw  = results[idx].result_text || (errMsg.startsWith('job.err.') ? T(errMsg) : errMsg) || '';
              // Repair emphasis the model broke ("** text**") before copying / exporting
              const text = window.MdExport ? MdExport.normalize(raw) : raw;
              const dateStr = new Date(results[idx].ran_at).toISOString().slice(0,10);
              const act = rb.dataset.resAction;

              if (act === 'copy') {
                await navigator.clipboard.writeText(text);
                if (window.toast) toast(T('sched.resultCopiedOk'), 'success');
                return;
              }

              function downloadBlob(blob, filename) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url; a.download = filename;
                document.body.appendChild(a); a.click(); a.remove();
                URL.revokeObjectURL(url);
                if (window.toast) toast(T('sched.fileDownloadedOk'), 'success');
              }

              if (act === 'download-md') {
                downloadBlob(new Blob([text], { type: 'text/markdown' }), `result_${dateStr}.md`);
              }
              if (act === 'download-txt') {
                const plain = window.MdExport ? MdExport.toPlainText(text) : text;
                downloadBlob(new Blob([plain], { type: 'text/plain' }), `result_${dateStr}.txt`);
              }
              if (act === 'download-docx') {
                rb.disabled = true;
                rb.textContent = '…';
                try {
                  if (!window.MdExport) throw new Error('export module not loaded');
                  const blob = await MdExport.toDocx(text, { title: `Result ${dateStr}` });
                  downloadBlob(blob, `result_${dateStr}.docx`);
                } catch (err) {
                  if (window.toast) toast(T('sched.docxFailed', { error: err.message }), 'error');
                } finally {
                  rb.disabled = false;
                  rb.textContent = '⬇ .docx';
                }
              }
            });
          });
        } catch (err) {
          if (window.toast) toast('✗ ' + err.message, 'error');
        }
      }

      if (btn.dataset.action === 'delete-job') {
        const confirmed = await new Promise(resolve => {
          const d = document.createElement('div');
          d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,17,31,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
          d.innerHTML = `<div style="background:#132f4c;border:1px solid rgba(255,107,107,0.4);border-radius:16px;padding:28px;max-width:360px;width:92%;text-align:center;"><h3 style="color:#ff6b6b;margin:0 0 16px;">${T('sched.deleteJobTitle')}</h3><p style="color:#90a4ae;font-size:13px;margin-bottom:16px;">${T('sched.deleteJobBody')}</p><div style="display:flex;gap:10px;"><button id="dNo" style="flex:1;padding:10px;background:transparent;border:1px solid rgba(79,195,247,0.3);color:#4fc3f7;border-radius:8px;cursor:pointer;">${T('sched.deleteJobNo')}</button><button id="dYes" style="flex:1;padding:10px;background:#ff6b6b;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">${T('sched.deleteJobYes')}</button></div></div>`;
          document.body.appendChild(d);
          d.querySelector('#dYes').onclick = () => { d.remove(); resolve(true); };
          d.querySelector('#dNo').onclick  = () => { d.remove(); resolve(false); };
        });
        if (!confirmed) return;
        await window.API.deleteJobPermanently(btn.dataset.id);
        if (window.toast) toast(T('sched.deletedOk'), 'success');
        await renderSchedule(container);
      }

      if (btn.dataset.action === 'cancel') {
        const confirmed = await new Promise(resolve => {
          const d = document.createElement('div');
          d.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(6,17,31,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);';
          d.innerHTML = `<div style="background:#132f4c;border:1px solid rgba(255,107,107,0.4);border-radius:16px;padding:28px;max-width:360px;width:92%;text-align:center;"><h3 style="color:#ff6b6b;margin:0 0 16px;">${T('sched.cancelTitle')}</h3><div style="display:flex;gap:10px;"><button id="dNo" style="flex:1;padding:10px;background:transparent;border:1px solid rgba(79,195,247,0.3);color:#4fc3f7;border-radius:8px;cursor:pointer;">${T('sched.cancelNo')}</button><button id="dYes" style="flex:1;padding:10px;background:#ff6b6b;color:#fff;border:none;border-radius:8px;font-weight:700;cursor:pointer;">${T('sched.cancelYes')}</button></div></div>`;
          document.body.appendChild(d);
          d.querySelector('#dYes').onclick = () => { d.remove(); resolve(true); };
          d.querySelector('#dNo').onclick  = () => { d.remove(); resolve(false); };
        });
        if (!confirmed) return;
        await window.API.cancelJob(btn.dataset.id);
        if (window.toast) toast(T('sched.canceledOk'), 'success');
        await renderSchedule(container);
      }
    }, { signal: sig });
  }

  // ── Admin Panel ───────────────────────────────────────────────
  async function openAdminPanel() {
    const overlay = document.createElement('div');
    overlay.className = 'auth-modal-overlay';
    overlay.style.cssText = 'align-items:flex-start;padding:20px;overflow-y:auto;';
    overlay.innerHTML = `
      <div class="auth-modal-box" style="max-width:800px;width:100%;position:relative;">
        <button class="auth-modal-close">&times;</button>
        <h2 class="auth-modal-title">${T('miniAdmin.title')}</h2>
        <div id="adminContent"><div style="text-align:center;padding:30px;color:var(--text-dim)">${T('lib.loading')}</div></div>
      </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    overlay.querySelector('.auth-modal-close').addEventListener('click', () => {
      overlay.classList.remove('visible');
      setTimeout(() => overlay.remove(), 200);
    });

    try {
      const [users, stats] = await Promise.all([
        window.API.adminGetUsers(),
        window.API.adminGetStats(),
      ]);

      const content = overlay.querySelector('#adminContent');
      content.innerHTML = `
        <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px;">
          <div style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:var(--accent)">${stats.users.total||0}</div>
            <div style="font-size:11px;color:var(--text-dim)">${T('miniAdmin.totalUsers')}</div>
          </div>
          <div style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:var(--accent)">${stats.users.active||0}</div>
            <div style="font-size:11px;color:var(--text-dim)">${T('miniAdmin.activeUsers')}</div>
          </div>
          <div style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:var(--accent)">${stats.prompts.active||0}</div>
            <div style="font-size:11px;color:var(--text-dim)">${T('miniAdmin.totalPrompts')}</div>
          </div>
          <div style="background:rgba(79,195,247,0.08);border:1px solid rgba(79,195,247,0.2);border-radius:10px;padding:14px;text-align:center;">
            <div style="font-size:22px;font-weight:700;color:var(--accent)">${stats.jobs?.find(j=>j.status==='pending')?.count||0}</div>
            <div style="font-size:11px;color:var(--text-dim)">${T('miniAdmin.pendingJobs')}</div>
          </div>
        </div>
        <h3 style="font-size:14px;color:var(--accent);margin-bottom:12px;">${T('miniAdmin.users')}</h3>
        <div style="overflow-x:auto;">
          <table style="width:100%;border-collapse:collapse;font-size:13px;">
            <thead><tr style="border-bottom:1px solid rgba(79,195,247,0.2);color:var(--text-dim);">
              <th style="text-align:left;padding:8px 10px;">${T('miniAdmin.col.email')}</th>
              <th style="padding:8px 10px;">${T('miniAdmin.col.role')}</th>
              <th style="padding:8px 10px;">${T('miniAdmin.col.prompts')}</th>
              <th style="padding:8px 10px;">${T('miniAdmin.col.logins')}</th>
              <th style="padding:8px 10px;">${T('miniAdmin.col.lastLogin')}</th>
              <th style="padding:8px 10px;">${T('miniAdmin.col.active')}</th>
            </tr></thead>
            <tbody>
              ${users.map(u => `<tr style="border-bottom:1px solid rgba(79,195,247,0.08);">
                <td style="padding:8px 10px;max-width:200px;overflow:hidden;text-overflow:ellipsis;">${escHtml(u.email)}</td>
                <td style="text-align:center;padding:8px 10px;color:${u.role==='admin'?'var(--warn)':'var(--text-dim)'};">${u.role}</td>
                <td style="text-align:center;padding:8px 10px;">${u.prompt_count||0}</td>
                <td style="text-align:center;padding:8px 10px;">${u.login_count||0}</td>
                <td style="text-align:center;padding:8px 10px;font-size:11px;">${u.last_login_at?new Date(u.last_login_at).toLocaleDateString():'—'}</td>
                <td style="text-align:center;padding:8px 10px;">
                  <span style="color:${u.is_active?'var(--ok)':'var(--error)'}">${u.is_active?'✓':'✗'}</span>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    } catch (err) {
      overlay.querySelector('#adminContent').innerHTML = `<div class="empty-state">⚠️ ${err.message}</div>`;
    }
  }

  function escHtml(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  // quality_score holds a key like 'needsWork'; older rows may hold a translated label
  function qualityLabel(q) {
    const key = 'quality.' + q;
    const label = window.Lang ? Lang.t(key) : null;
    return label && label !== key ? label : q;
  }

  // ── Bootstrap ──────────────────────────────────────────────────
  function init() {
    injectAuthButton();
    updateAuthUI();

    // Add "Save to DB" button once prompt panel is ready
    setTimeout(injectSaveToDbButton, 1500);

    // ── Handle password-reset link (#reset_password&token=...) ──
    if (window.location.hash.includes('reset_password')) {
      const params = new URLSearchParams(window.location.hash.replace('#', '?').replace('reset_password&', ''));
      const token = params.get('token');
      if (token) {
        history.replaceState(null, '', window.location.pathname + window.location.search);
        setTimeout(() => showResetPasswordModal(token), 300);
        return; // skip the normal auto-login-modal flow below
      }
    }

    // ── Auto-show login modal if not logged in ──────────────────
    // Always verify token with server on startup
    (async () => {
      let loggedIn = false;
      // Refresh an expired/missing access token from the stored refresh token first
      try { await window.API?.ensureSession?.(); } catch {}
      if (window.API?.isLoggedIn()) {
        try {
          await window.API.getMe();
          loggedIn = true;
        } catch (err) {
          // Any error (401, 404, network) — treat as not logged in
          try { window.API.logout(); } catch {}
          loggedIn = false;
        }
      }
      if (!loggedIn) { setTimeout(() => showLoginModal(), 400); return; }
      updateAuthUI();
      // Load DeepSeek key status on startup now that the session is confirmed
      if (typeof DeepSeek !== 'undefined') {
        DeepSeek.fetchKeyFromEnv().then(() => DeepSeek.refreshBalance()).catch(() => {});
      }
    })();

    // Auth events
    window.addEventListener('jsprompt:login', () => {
      updateAuthUI();
      setTimeout(injectSaveToDbButton, 500);
      // Load DeepSeek key and refresh balance after login
      if (typeof DeepSeek !== 'undefined') {
        DeepSeek.fetchKeyFromEnv().then(() => {
          DeepSeek.refreshBalance();
        }).catch(() => {});
      }
    });
    window.addEventListener('jsprompt:logout', () => {
      updateAuthUI();
      setTimeout(() => showLoginModal(), 300);
    });

  }

  // Expose for other pages (e.g. admin.html) that need to trigger the login modal directly
  window.showLoginModal = showLoginModal;
  window.showResetPasswordModal = showResetPasswordModal;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();