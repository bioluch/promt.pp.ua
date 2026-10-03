/**
 * js/admin.js — JS PROMPT v2 Admin Panel
 * Standalone admin page. Requires js/api-client.js loaded first.
 */
'use strict';

(function () {

  // ── Auth guard ───────────────────────────────────────────────
  const AT = (key, vars) => (window.AdminLang ? AdminLang.t(key, vars) : key);

  function escHtml(s) {
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c]));
  }

  function toast(msg, type) {
    const el = document.getElementById('adminToast');
    el.textContent = msg;
    el.className = 'admin-toast show' + (type === 'error' ? ' error' : '');
    setTimeout(() => { el.classList.remove('show'); }, 3200);
  }

  // Attach a delegated click listener to `el`, automatically removing any
  // previous listener attached this way. Prevents handlers from stacking up
  // when a section is re-rendered (e.g. switching tabs, changing language)
  // without `el` itself being replaced — which was causing actions like
  // "Delete" to fire twice and require an extra click to actually complete.
  function onClickFresh(el, handler) {
    if (el._clickAbort) el._clickAbort.abort();
    const ctrl = new AbortController();
    el._clickAbort = ctrl;
    el.addEventListener('click', handler, { signal: ctrl.signal });
  }

  function confirmDialog(title, body, dangerLabel) {
    return new Promise(resolve => {
      const overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';
      overlay.innerHTML = `
        <div class="admin-modal-box" style="text-align:center;max-width:380px;">
          <div style="font-size:32px;margin-bottom:10px;">⚠️</div>
          <h3 style="margin-bottom:8px;">${escHtml(title)}</h3>
          <p style="font-size:13px;color:var(--text-secondary);margin-bottom:20px;">${escHtml(body)}</p>
          <div style="display:flex;gap:10px;">
            <button class="admin-btn" id="cdCancel" style="flex:1;">${AT('common.cancel')}</button>
            <button class="admin-btn admin-btn-danger" id="cdConfirm" style="flex:1;">${escHtml(dangerLabel || AT('common.confirm'))}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#cdConfirm').onclick = () => { overlay.remove(); resolve(true); };
      overlay.querySelector('#cdCancel').onclick  = () => { overlay.remove(); resolve(false); };
      overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); resolve(false); } });
    });
  }

  // ── Theme cycling (day → night → blue → green → day) ──────────
  const THEMES = ['day', 'night', 'blue', 'green'];
  const THEME_LABEL_KEYS = { day: 'theme.day', night: 'theme.night', blue: 'theme.blue', green: 'theme.green' };
  let themeIndex = parseInt(localStorage.getItem('admin_theme_idx') || '0');

  function applyTheme() {
    document.body.classList.remove('night-mode', 'blue-mode', 'green-mode');
    const t = THEMES[themeIndex];
    if (t === 'night') document.body.classList.add('night-mode');
    if (t === 'blue')  document.body.classList.add('blue-mode');
    if (t === 'green') document.body.classList.add('green-mode');
    const btn = document.getElementById('themeToggle');
    btn.dataset.i18n = THEME_LABEL_KEYS[t];
    btn.textContent = AT(THEME_LABEL_KEYS[t]);
  }
  document.getElementById('themeToggle').addEventListener('click', () => {
    themeIndex = (themeIndex + 1) % THEMES.length;
    localStorage.setItem('admin_theme_idx', themeIndex);
    applyTheme();
  });
  applyTheme();

  // Re-render dynamic (already-translated) text whenever the language changes,
  // since data-i18n auto-refresh only covers elements present in the DOM at switch time.
  window.onAdminLangChange = () => {
    applyTheme();
    const activeBtn = document.querySelector('.admin-nav-item.active');
    if (activeBtn) switchSection(activeBtn.dataset.section);
  };

  // ── Section navigation ──────────────────────────────────────
  const SECTIONS = {
    dashboard: { titleKey: 'section.dashboard.title', subKey: 'section.dashboard.sub', render: renderDashboard },
    users:     { titleKey: 'section.users.title',     subKey: 'section.users.sub',     render: renderUsers },
    prompts:   { titleKey: 'section.prompts.title',   subKey: 'section.prompts.sub',   render: renderPrompts },
    providers: { titleKey: 'section.providers.title', subKey: 'section.providers.sub', render: renderProviders },
    announce:  { titleKey: 'section.announce.title',  subKey: 'section.announce.sub',  render: renderAnnouncements },
    danger:    { titleKey: 'section.danger.title',    subKey: 'section.danger.sub',    render: renderDanger },
  };

  function switchSection(key) {
    document.querySelectorAll('.admin-nav-item').forEach(b => b.classList.toggle('active', b.dataset.section === key));
    document.getElementById('sectionTitle').textContent = AT(SECTIONS[key].titleKey);
    document.getElementById('sectionSub').textContent = AT(SECTIONS[key].subKey);
    const content = document.getElementById('adminContent');
    content.innerHTML = `<div class="admin-empty">${AT('common.loading')}</div>`;
    SECTIONS[key].render(content).catch(err => {
      content.innerHTML = `<div class="admin-empty"><div class="icon">⚠️</div>${escHtml(err.message)}</div>`;
    });
  }

  document.querySelectorAll('.admin-nav-item[data-section]').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });

  // ════════════════════════════════════════════════════════════
  //  1) DASHBOARD
  // ════════════════════════════════════════════════════════════
  async function renderDashboard(content) {
    const stats = await window.API.adminGetStats();
    const pendingJobs = stats.jobs?.find(j => j.status === 'pending')?.count || 0;
    const doneJobs = stats.jobs?.find(j => j.status === 'done')?.count || 0;

    content.innerHTML = `
      <div class="stat-grid">
        <div class="stat-box"><div class="num">${stats.users.total||0}</div><div class="label">${AT('dash.totalUsers')}</div></div>
        <div class="stat-box"><div class="num">${stats.users.active||0}</div><div class="label">${AT('dash.activeUsers')}</div></div>
        <div class="stat-box"><div class="num">${stats.prompts.active||0}</div><div class="label">${AT('dash.totalPrompts')}</div></div>
        <div class="stat-box"><div class="num">${pendingJobs}</div><div class="label">${AT('dash.pendingJobs')}</div></div>
        <div class="stat-box"><div class="num">${doneJobs}</div><div class="label">${AT('dash.completedJobs')}</div></div>
      </div>
      <div class="admin-card">
        <h2>${AT('dash.eventsByType')}</h2>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>${AT('dash.col.event')}</th><th>${AT('dash.col.count')}</th></tr></thead>
            <tbody>
              ${(stats.events||[]).map(e => `<tr><td>${escHtml(e.event_type)}</td><td>${e.count}</td></tr>`).join('') || `<tr><td colspan="2" style="text-align:center;color:var(--text-secondary);">${AT('dash.noEvents')}</td></tr>`}
            </tbody>
          </table>
        </div>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════
  //  2) USERS
  // ════════════════════════════════════════════════════════════
  async function renderUsers(content) {
    const users = await window.API.adminGetUsers();

    content.innerHTML = `
      <div class="admin-card">
        <div class="users-header">
          <h2 style="margin:0;">${AT('users.heading')} (${users.length})</h2>
          <div class="users-header-right">
            <input class="admin-input users-search-input" id="usersSearch"
              placeholder="${AT('users.searchPlaceholder')}">
            <button class="admin-btn admin-btn-primary admin-btn-sm" id="btnNewUser">${AT('users.addUser')}</button>
          </div>
        </div>
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr>
              <th>${AT('users.col.email')}</th>
              <th class="user-col-role">${AT('users.col.role')}</th>
              <th class="user-col-prompts" style="text-align:center;">${AT('users.col.prompts')}</th>
              <th class="user-col-logins"  style="text-align:center;">${AT('users.col.logins')}</th>
              <th class="user-col-lastlogin">${AT('users.col.lastLogin')}</th>
              <th colspan="2">${AT('users.col.actions')}</th>
            </tr></thead>
            <tbody id="usersTbody">
              ${users.map(u => userRow(u)).join('')}
            </tbody>
          </table>
          <div id="usersNoResults" style="display:none;text-align:center;padding:20px;color:var(--text-secondary);">${AT('users.noResults')}</div>
        </div>
      </div>`;

    // ── Search filter ───────────────────────────────────────────
    const searchInput = content.querySelector('#usersSearch');
    if (searchInput) {
      searchInput.addEventListener('input', () => {
        const q = searchInput.value.toLowerCase().trim();
        const rows = content.querySelectorAll('#usersTbody tr');
        let visible = 0;
        rows.forEach(row => {
          const match = !q || row.textContent.toLowerCase().includes(q);
          row.style.display = match ? '' : 'none';
          if (match) {
            visible++;
            if (q) row.style.background = 'rgba(var(--accent-rgb, 74,144,226), 0.08)';
            else   row.style.background = '';
          }
        });
        const noRes = content.querySelector('#usersNoResults');
        if (noRes) noRes.style.display = visible === 0 ? '' : 'none';
      });
    }

    onClickFresh(content, async (e) => {
      if (e.target.id === 'btnNewUser') { showNewUserModal(); return; }

      const toggleBtn = e.target.closest('[data-toggle-active]');
      if (toggleBtn) {
        const id = toggleBtn.dataset.toggleActive;
        const wasActive = toggleBtn.dataset.active === 'true';
        await window.API.adminUpdateUser(id, { is_active: !wasActive });
        toast(AT('users.updated'), 'ok');
        switchSection('users');
        return;
      }

      const roleBtn = e.target.closest('[data-toggle-role]');
      if (roleBtn) {
        const id = roleBtn.dataset.toggleRole;
        const wasAdmin = roleBtn.dataset.role === 'admin';
        await window.API.adminUpdateUser(id, { role: wasAdmin ? 'user' : 'admin' });
        toast(AT('users.roleUpdated'), 'ok');
        switchSection('users');
        return;
      }

      const delBtn = e.target.closest('[data-delete-user]');
      if (delBtn) {
        const id = delBtn.dataset.deleteUser;
        const email = delBtn.dataset.email;
        const ok = await confirmDialog(AT('users.deleteTitle'), AT('users.deleteBody', { email }), AT('common.delete'));
        if (!ok) return;
        try {
          await window.API.adminDeleteUser(id);
          toast(AT('users.deleted'), 'ok');
          switchSection('users');
        } catch (err) { toast('✗ ' + err.message, 'error'); }
        return;
      }

      const keysBtn = e.target.closest('[data-user-keys]');
      if (keysBtn) {
        const id    = keysBtn.dataset.userKeys;
        const email = keysBtn.dataset.email;
        showUserKeysModal(id, email);
      }
    });
  }

  function userRow(u) {
    const isActive = u.is_active;
    const isAdmin  = u.role === 'admin';
    return `<tr class="user-row">
      <td class="user-cell-email" title="${escHtml(u.email)}">${escHtml(u.email)}</td>
      <td class="user-cell-role user-col-role">
        <span class="badge ${isAdmin?'badge-warn':'badge-accent'}">${u.role}</span>
      </td>
      <td class="user-cell-num user-col-prompts">${u.prompt_count||0}</td>
      <td class="user-cell-num user-col-logins">${u.login_count||0}</td>
      <td class="user-cell-date user-col-lastlogin">${u.last_login_at?new Date(u.last_login_at).toLocaleDateString():'—'}</td>
      <td class="user-cell-actions">
        <div class="user-actions-wrap">
          <div class="user-actions-row1">
            <button class="admin-btn admin-btn-sm user-btn-active ${isActive?'':'admin-btn-danger'}"
              data-toggle-active="${u.id}" data-active="${isActive}">
              ${isActive ? AT('users.active') : AT('users.disabled')}
            </button>
            <button class="admin-btn admin-btn-sm user-btn-role"
              data-toggle-role="${u.id}" data-role="${u.role}">
              ${isAdmin ? AT('users.demote') : AT('users.promote')}
            </button>
            <button class="admin-btn admin-btn-sm admin-btn-danger user-btn-delete"
              data-delete-user="${u.id}" data-email="${escHtml(u.email)}">
              ${AT('common.delete')}
            </button>
          </div>
          <div class="user-actions-row2">
            <button class="admin-btn admin-btn-sm user-btn-keys"
              data-user-keys="${u.id}" data-email="${escHtml(u.email)}">
              ${AT('ukeys.btn')}
            </button>
          </div>
        </div>
      </td>
    </tr>`;
  }

  // ── User API Keys Modal ────────────────────────────────────
  async function showUserKeysModal(userId, email) {
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML = `<div class="admin-modal-box" style="max-width:580px;width:95%;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <h3 style="margin:0;font-size:16px;">${AT('ukeys.title', { email })}</h3>
        <button id="ukeysClose" class="admin-btn admin-btn-sm" style="padding:4px 10px;">✕</button>
      </div>
      <div id="ukeysBody" style="min-height:80px;">
        <div style="text-align:center;padding:20px;color:var(--text-secondary);">…</div>
      </div>
    </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#ukeysClose').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

    async function loadKeys() {
      const body = overlay.querySelector('#ukeysBody');
      try {
        const data = await _adminFetch('GET', `/admin/users/${userId}/keys`);
        const keys = data.keys || [];
        if (!keys.length) {
          body.innerHTML = `<p style="color:var(--text-secondary);text-align:center;padding:16px;">${AT('ukeys.noKeys')}</p>`;
        } else {
          body.innerHTML = `
            <table class="admin-table" style="margin-bottom:12px;">
              <thead><tr>
                <th>${AT('ukeys.provider')}</th>
                <th>${AT('ukeys.prefix')}</th>
                <th>${AT('ukeys.updated')}</th>
                <th>${AT('ukeys.actions')}</th>
              </tr></thead>
              <tbody>
                ${keys.map(k => `<tr>
                  <td><strong>${escHtml(k.provider)}</strong>${k.label && k.label !== k.provider ? '<br><span style="font-size:11px;color:var(--text-secondary);">'+escHtml(k.label)+'</span>' : ''}</td>
                  <td><code style="font-size:12px;background:rgba(0,0,0,0.15);padding:2px 6px;border-radius:4px;">${escHtml(k.key_prefix || '—')}…</code></td>
                  <td style="font-size:11px;color:var(--text-secondary);">${k.updated_at ? new Date(k.updated_at).toLocaleDateString() : '—'}</td>
                  <td style="display:flex;gap:5px;">
                    <button class="admin-btn admin-btn-sm" data-edit-key="${escHtml(k.provider)}">${AT('common.edit')}</button>
                    <button class="admin-btn admin-btn-sm admin-btn-danger" data-del-key="${escHtml(k.provider)}">${AT('common.delete')}</button>
                  </td>
                </tr>`).join('')}
              </tbody>
            </table>`;
        }
        // Add Key button always visible
        const addBtn = document.createElement('button');
        addBtn.className = 'admin-btn admin-btn-primary admin-btn-sm';
        addBtn.textContent = AT('ukeys.addKey');
        addBtn.onclick = () => showKeyEditForm(null, null);
        body.appendChild(addBtn);

        // Event handlers for edit/delete
        body.querySelectorAll('[data-edit-key]').forEach(btn => {
          btn.addEventListener('click', () => {
            const provider = btn.dataset.editKey;
            const key = keys.find(k => k.provider === provider);
            showKeyEditForm(provider, key?.label || provider);
          });
        });
        body.querySelectorAll('[data-del-key]').forEach(btn => {
          btn.addEventListener('click', async () => {
            const provider = btn.dataset.delKey;
            const ok = await confirmDialog(
              AT('ukeys.deleteTitle'),
              AT('ukeys.deleteBody', { provider, email }),
              AT('common.delete')
            );
            if (!ok) return;
            try {
              await _adminFetch('DELETE', `/admin/users/${userId}/keys/${encodeURIComponent(provider)}`);
              toast(AT('ukeys.deleted'), 'ok');
              loadKeys();
            } catch (err) { toast('✗ ' + err.message, 'error'); }
          });
        });
      } catch (err) {
        body.innerHTML = `<p style="color:var(--error);">✗ ${escHtml(err.message)}</p>`;
      }
    }

    function showKeyEditForm(provider, label) {
      const isNew = !provider;
      const body = overlay.querySelector('#ukeysBody');
      body.innerHTML = `
        <div style="display:flex;flex-direction:column;gap:12px;">
          <h4 style="margin:0;">${isNew ? AT('ukeys.addTitle') : AT('ukeys.editTitle', { provider })}</h4>
          ${isNew ? `<div class="admin-field">
            <label class="admin-label">${AT('ukeys.providerLabel')}</label>
            <input class="admin-input" id="ukeyProvider" placeholder="claude / gemini / perplexity…" value="">
          </div>` : `<p style="color:var(--text-secondary);font-size:13px;">${AT('ukeys.provider')}: <strong>${escHtml(provider)}</strong></p>`}
          <div class="admin-field">
            <label class="admin-label">${AT('ukeys.keyLabel')}</label>
            <input class="admin-input" id="ukeyValue" type="password" placeholder="${AT('ukeys.keyPlaceholder')}">
            <button style="margin-top:4px;background:none;border:none;color:var(--accent);cursor:pointer;font-size:12px;" onclick="const i=this.previousElementSibling;i.type=i.type==='password'?'text':'password';">👁 show/hide</button>
          </div>
          <div style="display:flex;gap:8px;">
            <button class="admin-btn" id="ukeyCancel" style="flex:1;">${AT('common.cancel')}</button>
            <button class="admin-btn admin-btn-primary" id="ukeySave" style="flex:1;">${AT('common.save')}</button>
          </div>
          <div id="ukeyMsg" style="font-size:12px;"></div>
        </div>`;

      body.querySelector('#ukeyCancel').onclick = () => loadKeys();
      body.querySelector('#ukeySave').onclick = async () => {
        const providerVal = isNew
          ? (body.querySelector('#ukeyProvider')?.value.trim().toLowerCase() || '')
          : provider;
        const keyVal = body.querySelector('#ukeyValue').value.trim();
        const msgEl  = body.querySelector('#ukeyMsg');
        if (isNew && !providerVal) { msgEl.textContent = AT('ukeys.providerRequired'); msgEl.style.color = 'var(--error)'; return; }
        if (!keyVal) { msgEl.textContent = AT('ukeys.keyRequired'); msgEl.style.color = 'var(--error)'; return; }
        try {
          await _adminFetch('PUT', `/admin/users/${userId}/keys/${encodeURIComponent(providerVal)}`, { api_key: keyVal, label: label || providerVal });
          toast(AT('ukeys.saved'), 'ok');
          loadKeys();
        } catch (err) { msgEl.textContent = '✗ ' + err.message; msgEl.style.color = 'var(--error)'; }
      };
    }

    loadKeys();
  }

  // Helper: admin fetch wrapper
  async function _adminFetch(method, path, body) {
    const token = sessionStorage.getItem('_jsat') || '';
    const opts = { method, headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token } };
    if (body) opts.body = JSON.stringify(body);
    const resp = await fetch('/api' + path, opts);
    if (resp.status === 204) return {};
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || 'Error ' + resp.status);
    return data;
  }

  function showNewUserModal() {
    const overlay = document.createElement('div');
    overlay.className = 'admin-modal-overlay';
    overlay.innerHTML = `
      <div class="admin-modal-box">
        <h3 style="margin-bottom:18px;">${AT('newuser.title')}</h3>
        <div class="admin-field"><label class="admin-label">${AT('newuser.email')}</label><input class="admin-input" id="nuEmail" type="email" placeholder="user@example.com"></div>
        <div class="admin-field"><label class="admin-label">${AT('newuser.password')}</label><input class="admin-input" id="nuPass" type="password" placeholder="${AT('newuser.passwordHint')}"></div>
        <div class="admin-field"><label class="admin-label">${AT('newuser.displayName')}</label><input class="admin-input" id="nuName" type="text" placeholder="${AT('common.optional')}"></div>
        <div class="admin-field">
          <label class="admin-label">${AT('newuser.role')}</label>
          <select class="admin-select" id="nuRole"><option value="user">${AT('newuser.roleUser')}</option><option value="admin">${AT('newuser.roleAdmin')}</option></select>
        </div>
        <div style="display:flex;gap:10px;margin-top:10px;">
          <button class="admin-btn" id="nuCancel" style="flex:1;">${AT('common.cancel')}</button>
          <button class="admin-btn admin-btn-primary" id="nuCreate" style="flex:1;">${AT('common.create')}</button>
        </div>
        <div id="nuMsg" style="margin-top:10px;font-size:12px;"></div>
      </div>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#nuCancel').onclick = () => overlay.remove();
    overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
    overlay.querySelector('#nuCreate').onclick = async () => {
      const email = overlay.querySelector('#nuEmail').value.trim();
      const password = overlay.querySelector('#nuPass').value;
      const display_name = overlay.querySelector('#nuName').value.trim();
      const role = overlay.querySelector('#nuRole').value;
      const msgEl = overlay.querySelector('#nuMsg');
      if (!email || !password) { msgEl.textContent = AT('newuser.required'); msgEl.style.color = 'var(--error)'; return; }
      try {
        await window.API.adminCreateUser({ email, password, display_name, role });
        toast(AT('newuser.created'), 'ok');
        overlay.remove();
        switchSection('users');
      } catch (err) {
        msgEl.textContent = '✗ ' + err.message;
        msgEl.style.color = 'var(--error)';
      }
    };
  }

  // ════════════════════════════════════════════════════════════
  //  3) ALL PROMPTS
  // ════════════════════════════════════════════════════════════
  async function renderPrompts(content) {
    content.innerHTML = `
      <div class="admin-card">
        <div style="display:flex;gap:10px;margin-bottom:16px;">
          <input class="admin-input" id="promptSearch" placeholder="${AT('prompts.searchPlaceholder')}" style="flex:1;">
        </div>
        <div id="promptsListWrap"></div>
      </div>`;

    const listWrap = content.querySelector('#promptsListWrap');
    let q = '';

    async function loadList() {
      listWrap.innerHTML = `<div class="admin-empty">${AT('common.loading')}</div>`;
      const prompts = await window.API.adminListPrompts({ q, limit: 100 });
      if (!prompts.length) {
        listWrap.innerHTML = `<div class="admin-empty"><div class="icon">📦</div>${AT('prompts.notFound')}</div>`;
        return;
      }
      listWrap.innerHTML = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>${AT('prompts.col.title')}</th><th>${AT('prompts.col.user')}</th><th>${AT('prompts.col.domain')}</th><th>${AT('prompts.col.tokens')}</th><th>${AT('prompts.col.created')}</th><th>${AT('prompts.col.actions')}</th></tr></thead>
            <tbody>
              ${prompts.map(p => `<tr>
                <td style="max-width:220px;overflow:hidden;text-overflow:ellipsis;" title="${escHtml(p.title)}">${escHtml(p.title)}</td>
                <td style="font-size:11px;">${escHtml(p.user_email)}</td>
                <td><span class="badge badge-accent">${escHtml(p.domain)}</span></td>
                <td style="text-align:center;">${p.token_count||'—'}</td>
                <td style="font-size:11px;">${new Date(p.created_at).toLocaleDateString()}</td>
                <td style="display:flex;gap:5px;flex-wrap:wrap;">
                  <button class="admin-btn admin-btn-sm" data-view-prompt="${p.id}">${AT('common.view')}</button>
                  <button class="admin-btn admin-btn-sm" data-copy-prompt="${p.id}">${AT('common.copy')}</button>
                  <button class="admin-btn admin-btn-sm admin-btn-danger" data-delete-prompt="${p.id}">${AT('common.delete')}</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    content.querySelector('#promptSearch').addEventListener('input', (e) => { q = e.target.value.trim(); loadList(); });

    onClickFresh(content, async (e) => {
      const viewBtn = e.target.closest('[data-view-prompt]');
      if (viewBtn) { showPromptModal(viewBtn.dataset.viewPrompt); return; }

      const copyBtn = e.target.closest('[data-copy-prompt]');
      if (copyBtn) {
        showCopyPromptModal(copyBtn.dataset.copyPrompt);
        return;
      }

      const delBtn = e.target.closest('[data-delete-prompt]');
      if (delBtn) {
        const ok = await confirmDialog(AT('prompts.deleteTitle'), AT('prompts.deleteBody'), AT('common.delete'));
        if (!ok) return;
        try { await window.API.adminDeletePrompt(delBtn.dataset.deletePrompt); toast(AT('prompts.deleted'), 'ok'); loadList(); }
        catch (err) { toast('✗ ' + err.message, 'error'); }
      }
    });

    async function copyToClipboard(text, label) {
      try {
        await navigator.clipboard.writeText(text || '');
        toast(`✓ ${label} ${AT('prompts.copiedSuffix')}`, 'ok');
      } catch {
        toast(AT('prompts.copyFailed'), 'error');
      }
    }

    async function showCopyPromptModal(id) {
      let p;
      try { p = await window.API.adminGetPrompt(id); }
      catch (err) { toast('✗ ' + err.message, 'error'); return; }

      const overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';
      overlay.innerHTML = `
        <div class="admin-modal-box">
          <h3 style="margin-bottom:14px;">${AT('copyPrompt.title')}</h3>
          <label class="admin-label">${AT('copyPrompt.title.label')}</label>
          <input class="admin-input" id="cpTitle" style="margin-bottom:12px;" value="${escHtml(p.title + ' (copy)')}">
          <label class="admin-label">${AT('copyPrompt.user.label')}</label>
          <input class="admin-input" id="cpUser" style="margin-bottom:12px;" value="${escHtml(p.user_email)}">
          <label class="admin-label">${AT('copyPrompt.domain.label')}</label>
          <input class="admin-input" id="cpDomain" style="margin-bottom:16px;" value="${escHtml(p.domain)}">
          <div style="display:flex;gap:10px;">
            <button class="admin-btn" id="cpCancel" style="flex:1;">${AT('common.cancel')}</button>
            <button class="admin-btn admin-btn-primary" id="cpConfirm" style="flex:1;">${AT('common.copy')}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#cpCancel').onclick = () => overlay.remove();
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelector('#cpConfirm').onclick = async () => {
        const title      = overlay.querySelector('#cpTitle').value.trim();
        const user_email = overlay.querySelector('#cpUser').value.trim();
        const domain     = overlay.querySelector('#cpDomain').value.trim();
        try {
          await window.API.adminCopyPrompt(id, { title, domain, user_email });
          toast(AT('copyPrompt.copied'), 'ok');
          overlay.remove();
          loadList();
        } catch (err) { toast('✗ ' + err.message, 'error'); }
      };
    }

    async function showPromptModal(id) {
      const p = await window.API.adminGetPrompt(id);
      const overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';
      overlay.innerHTML = `
        <div class="admin-modal-box wide">
          <h3 style="margin-bottom:14px;">${AT('editPrompt.title')}</h3>

          <label class="admin-label">${AT('copyPrompt.title.label')}</label>
          <input class="admin-input" id="pmTitle" style="margin-bottom:12px;" value="${escHtml(p.title)}">

          <div style="display:flex;gap:10px;margin-bottom:12px;">
            <div style="flex:1;">
              <label class="admin-label">${AT('copyPrompt.user.label')}</label>
              <input class="admin-input" id="pmUser" value="${escHtml(p.user_email)}">
            </div>
            <div style="flex:1;">
              <label class="admin-label">${AT('copyPrompt.domain.label')}</label>
              <input class="admin-input" id="pmDomain" value="${escHtml(p.domain)}">
            </div>
          </div>

          <p style="font-size:11px;color:var(--text-secondary);margin-bottom:14px;">
            ${AT('editPrompt.created')} ${new Date(p.created_at).toLocaleString()}
          </p>

          ${p.source_original_text ? `
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="admin-label" style="margin:0;">${AT('editPrompt.sourceText')}</label>
            <button class="admin-btn admin-btn-sm" id="pmCopySource">${AT('common.copy')}</button>
          </div>
          <div class="preview-box" id="pmSourceText" style="margin-bottom:14px;">${escHtml(p.source_original_text)}</div>` : ''}

          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
            <label class="admin-label" style="margin:0;">${AT('editPrompt.promptContent')}</label>
            <button class="admin-btn admin-btn-sm" id="pmCopyContent">${AT('common.copy')}</button>
          </div>
          <textarea class="admin-input" id="pmContent" style="min-height:240px;font-family:monospace;font-size:12px;">${escHtml(p.content)}</textarea>

          <div style="display:flex;gap:10px;margin-top:16px;">
            <button class="admin-btn" id="pmClose" style="flex:1;">${AT('common.close')}</button>
            <button class="admin-btn admin-btn-primary" id="pmSave" style="flex:1;">${AT('editPrompt.saveChanges')}</button>
          </div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#pmClose').onclick = () => overlay.remove();
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });

      if (p.source_original_text) {
        overlay.querySelector('#pmCopySource').onclick = () =>
          copyToClipboard(p.source_original_text, AT('editPrompt.sourceText'));
      }
      overlay.querySelector('#pmCopyContent').onclick = () =>
        copyToClipboard(overlay.querySelector('#pmContent').value, AT('editPrompt.promptContent'));

      overlay.querySelector('#pmSave').onclick = async () => {
        const title      = overlay.querySelector('#pmTitle').value.trim();
        const user_email = overlay.querySelector('#pmUser').value.trim();
        const domain     = overlay.querySelector('#pmDomain').value.trim();
        const content    = overlay.querySelector('#pmContent').value;
        try {
          await window.API.adminUpdatePrompt(id, { title, content, domain, user_email });
          toast(AT('editPrompt.updated'), 'ok');
          overlay.remove();
          loadList();
        } catch (err) { toast('✗ ' + err.message, 'error'); }
      };
    }

    await loadList();
  }

  // ════════════════════════════════════════════════════════════
  //  4) AI PROVIDERS
  // ════════════════════════════════════════════════════════════
  async function renderProviders(content) {
    content.innerHTML = `
      <div class="admin-card">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
          <h2 style="margin:0;">${AT('providers.heading')}</h2>
          <div style="display:flex;gap:8px;">
            <button class="admin-btn admin-btn-sm" id="btnExportProviders">${AT('common.export')}</button>
            <button class="admin-btn admin-btn-sm" id="btnImportProviders">${AT('common.import')}</button>
            <button class="admin-btn admin-btn-primary admin-btn-sm" id="btnNewProvider">${AT('providers.addProvider')}</button>
          </div>
        </div>
        <div id="providersListWrap"></div>
      </div>`;

    const listWrap = content.querySelector('#providersListWrap');

    async function loadList() {
      listWrap.innerHTML = `<div class="admin-empty">${AT('common.loading')}</div>`;
      const { providers } = await window.API.adminGetProviderEndpoints();
      listWrap.innerHTML = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>${AT('providers.col.provider')}</th><th>${AT('providers.col.endpoint')}</th><th>${AT('providers.col.model')}</th><th class="hide-md">${AT('providers.col.options')}</th><th>${AT('providers.col.status')}</th><th>${AT('providers.col.actions')}</th></tr></thead>
            <tbody>
              ${providers.map(p => `<tr>
                <td><strong>${escHtml(p.label)}</strong>${p.is_builtin ? ` <span class="badge badge-accent">${AT('common.builtin')}</span>` : ''}</td>
                <td class="admin-cell-truncate" style="max-width:240px;" title="${escHtml(p.endpoint_url)}">${escHtml(p.endpoint_url)}</td>
                <td style="font-size:11px;">${escHtml(p.model_name)}</td>
                <td class="hide-md" style="font-size:10px;max-width:160px;overflow:hidden;text-overflow:ellipsis;color:var(--text-secondary);">${p.provider_options && Object.keys(p.provider_options).length ? JSON.stringify(p.provider_options).slice(0,60)+'…' : '—'}</td>
                <td><span class="badge ${p.is_active?'badge-ok':'badge-error'}">${p.is_active?AT('common.active'):AT('common.inactive')}</span></td>
                <td class="action-cell">
                  <button class="admin-btn admin-btn-sm" data-edit-provider="${p.provider_key}">${AT('common.edit')}</button>
                  <button class="admin-btn admin-btn-sm admin-btn-danger" data-delete-provider="${p.provider_key}" data-builtin="${p.is_builtin}">${AT('common.delete')}</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    function showProviderForm(existing) {
      const optionsStr = existing?.provider_options
        ? JSON.stringify(existing.provider_options, null, 2) : '';
      const overlay = document.createElement('div');
      overlay.className = 'admin-modal-overlay';
      overlay.innerHTML = `
        <div class="admin-modal-box" style="max-width:560px;">
          <h3 style="margin-bottom:18px;">${existing ? AT('providerForm.editTitle') : AT('providerForm.addTitle')}</h3>
          <div class="admin-field"><label class="admin-label">${AT('providerForm.key')}</label>
            <input class="admin-input" id="pfKey" ${existing?'disabled':''} value="${escHtml(existing?.provider_key||'')}" placeholder="e.g. mistral"></div>
          <div class="admin-field"><label class="admin-label">${AT('providerForm.label')}</label>
            <input class="admin-input" id="pfLabel" value="${escHtml(existing?.label||'')}" placeholder="e.g. Mistral"></div>
          <div class="admin-field"><label class="admin-label">${AT('providerForm.url')}</label>
            <input class="admin-input" id="pfUrl" value="${escHtml(existing?.endpoint_url||'')}" placeholder="https://api.example.com/v1/chat/completions"></div>
          <div class="admin-field"><label class="admin-label">${AT('providerForm.model')}</label>
            <input class="admin-input" id="pfModel" value="${escHtml(existing?.model_name||'')}" placeholder="e.g. mistral-large-latest"></div>
          <div class="admin-field-row">
            <div class="admin-field"><label class="admin-label">${AT('providerForm.authHeader')}</label>
              <input class="admin-input" id="pfAuthHeader" value="${escHtml(existing?.auth_header||'Authorization')}"></div>
            <div class="admin-field"><label class="admin-label">${AT('providerForm.authPrefix')}</label>
              <input class="admin-input" id="pfAuthPrefix" value="${escHtml(existing?.auth_prefix??'Bearer ')}"></div>
          </div>
          <div class="admin-field">
            <label class="admin-label">${AT('providerForm.providerOptions')}</label>
            <textarea class="admin-input admin-textarea" id="pfOptions" rows="4"
              placeholder='{"tools":[{"google_search":{}}],"use_v1beta":true}'>${escHtml(optionsStr)}</textarea>
            <small style="color:var(--text-secondary);font-size:11px;margin-top:4px;display:block;">${AT('providerForm.providerOptionsHint')}</small>
          </div>
          <div class="admin-checkboxes">
            <label class="admin-checkbox-label">
              <input type="checkbox" id="pfActive" ${existing?.is_active!==false?'checked':''}> ${AT('providerForm.activeLabel')}
            </label>
            <label class="admin-checkbox-label">
              <input type="checkbox" id="pfBuiltin" ${existing?.is_builtin?'checked':''}> ${AT('providerForm.builtinLabel')}
            </label>
          </div>
          <div class="admin-form-actions">
            <button class="admin-btn" id="pfCancel">${AT('common.cancel')}</button>
            <button class="admin-btn admin-btn-primary" id="pfSave">${AT('common.save')}</button>
          </div>
          <div id="pfMsg" style="margin-top:10px;font-size:12px;"></div>
        </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#pfCancel').onclick = () => overlay.remove();
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      overlay.querySelector('#pfSave').onclick = async () => {
        const provider_key = overlay.querySelector('#pfKey').value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
        const label        = overlay.querySelector('#pfLabel').value.trim();
        const endpoint_url = overlay.querySelector('#pfUrl').value.trim();
        const model_name   = overlay.querySelector('#pfModel').value.trim();
        const auth_header  = overlay.querySelector('#pfAuthHeader').value.trim();
        const auth_prefix  = overlay.querySelector('#pfAuthPrefix').value;
        const is_active    = overlay.querySelector('#pfActive').checked;
        const is_builtin   = overlay.querySelector('#pfBuiltin').checked;
        const optRaw       = overlay.querySelector('#pfOptions').value.trim();
        const msgEl        = overlay.querySelector('#pfMsg');
        if (!provider_key || !label || !endpoint_url || !model_name) {
          msgEl.textContent = AT('providerForm.allRequired');
          msgEl.style.color = 'var(--error)';
          return;
        }
        let provider_options = null;
        if (optRaw) {
          try { provider_options = JSON.parse(optRaw); }
          catch {
            msgEl.textContent = AT('providerForm.invalidJson');
            msgEl.style.color = 'var(--error)';
            return;
          }
        }
        try {
          await window.API.adminSaveProviderEndpoint({
            provider_key, label, endpoint_url, model_name,
            auth_header, auth_prefix, is_active, is_builtin, provider_options,
          });
          toast(AT('providers.saved'), 'ok');
          overlay.remove();
          loadList();
        } catch (err) { msgEl.textContent = '✗ ' + err.message; msgEl.style.color = 'var(--error)'; }
      };
    }

    content.querySelector('#btnNewProvider').addEventListener('click', () => showProviderForm(null));

    content.querySelector('#btnExportProviders').addEventListener('click', async () => {
      const data = await window.API.adminExportProviderEndpoints();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `ai_providers_${new Date().toISOString().slice(0,10)}.json`;
      document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
      toast(AT('providers.exported'), 'ok');
    });

    content.querySelector('#btnImportProviders').addEventListener('click', () => {
      const input = document.createElement('input');
      input.type = 'file'; input.accept = '.json,application/json';
      input.addEventListener('change', () => {
        const file = input.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            const data = JSON.parse(reader.result);
            const providers = data.providers || data;
            const result = await window.API.adminImportProviderEndpoints(providers);
            toast(AT('providers.imported', { n: result.imported }), 'ok');
            loadList();
          } catch (err) { toast('✗ ' + err.message, 'error'); }
        };
        reader.readAsText(file);
      });
      input.click();
    });

    onClickFresh(content, async (e) => {
      const editBtn = e.target.closest('[data-edit-provider]');
      if (editBtn) {
        const { providers } = await window.API.adminGetProviderEndpoints();
        const p = providers.find(x => x.provider_key === editBtn.dataset.editProvider);
        showProviderForm(p);
        return;
      }
      const delBtn = e.target.closest('[data-delete-provider]');
      if (delBtn) {
        const isBuiltin = delBtn.dataset.builtin === 'true';
        const body = isBuiltin ? AT('providers.deleteBodyBuiltin') : AT('providers.deleteBodyCustom');
        const ok = await confirmDialog(AT('providers.deleteTitle'), body, isBuiltin ? AT('providers.deleteBuiltinLabel') : AT('common.delete'));
        if (!ok) return;
        try { await window.API.adminDeleteProviderEndpoint(delBtn.dataset.deleteProvider); toast(AT('providers.deleted'), 'ok'); loadList(); }
        catch (err) { toast('✗ ' + err.message, 'error'); }
      }
    });

    await loadList();
  }

  // ════════════════════════════════════════════════════════════
  //  5) DANGER ZONE
  // ════════════════════════════════════════════════════════════
  // ════════════════════════════════════════════════════════════
  //  RELEASE ANNOUNCEMENT E-MAIL
  // ════════════════════════════════════════════════════════════
  const APP_URL = 'https://promt.pp.ua/';
  const EMAIL_I18N = {
    uk: {
      subject: 'JS PROMPT {v}: що нового',
      heading: 'Вийшла нова версія JS PROMPT {v}',
      intro: 'Вітаємо! Ми оновили JS PROMPT. Нижче — головні зміни цієї версії.',
      whatsNew: 'Що нового',
      how: 'Оновлення вже доступне: просто відкрийте застосунок або перезавантажте сторінку. Встановлений застосунок (PWA) оновиться автоматично.',
      cta: 'Відкрити JS PROMPT',
      thanks: 'Дякуємо, що користуєтеся JS PROMPT!',
      footer: 'Ви отримали цей лист, бо маєте акаунт у JS PROMPT (promt.pp.ua). Це сервісне повідомлення про оновлення застосунку.',
      notes: [
        'Новий генератор промтів за сучасними рекомендаціями Anthropic: повний текст завдання, чітка структура, критерії успіху',
        'Для звітів у форматі .docx і .md — вимоги до стильного оформлення без емодзі',
        'Професійний конвертер DOCX → Markdown: списки, таблиці, посилання, виноски, формули',
        'Експорт результатів у .docx у професійному стилі',
        'Точніша перевірка тексту: менше хибних помилок, справжня перевірка англійської орфографії',
        'Кнопка «API-ключі» в меню та детальна довідка щодо ключів різних провайдерів',
        'Довгі звіти більше не обриваються: автоматичне продовження відповіді',
        'Адаптований інтерфейс для телефонів і планшетів, підвищена безпека',
      ],
    },
    en: {
      subject: 'JS PROMPT {v}: what’s new',
      heading: 'JS PROMPT {v} is here',
      intro: 'Hello! We have updated JS PROMPT. Here are the main changes in this version.',
      whatsNew: 'What’s new',
      how: 'The update is already live: just open the app or reload the page. The installed app (PWA) updates automatically.',
      cta: 'Open JS PROMPT',
      thanks: 'Thank you for using JS PROMPT!',
      footer: 'You are receiving this e-mail because you have a JS PROMPT account (promt.pp.ua). This is a service message about an application update.',
      notes: [
        'A new prompt generator built on Anthropic’s current guidance: full task text, clear structure, success criteria',
        'Polished, emoji-free design requirements for .docx and .md reports',
        'A professional DOCX → Markdown converter: lists, tables, links, footnotes, equations',
        'Export of results to professionally styled .docx files',
        'More accurate text checking: fewer false alarms and real English spell checking',
        'An “API Keys” menu button and detailed help for keys from different providers',
        'Long reports are no longer cut off: responses are continued automatically',
        'A layout adapted for phones and tablets, plus security improvements',
      ],
    },
    es: {
      subject: 'JS PROMPT {v}: novedades',
      heading: 'Ya está disponible JS PROMPT {v}',
      intro: '¡Hola! Hemos actualizado JS PROMPT. Estos son los cambios principales de esta versión.',
      whatsNew: 'Novedades',
      how: 'La actualización ya está disponible: abra la aplicación o recargue la página. La aplicación instalada (PWA) se actualiza automáticamente.',
      cta: 'Abrir JS PROMPT',
      thanks: '¡Gracias por usar JS PROMPT!',
      footer: 'Recibe este correo porque tiene una cuenta en JS PROMPT (promt.pp.ua). Es un mensaje de servicio sobre una actualización de la aplicación.',
      notes: [
        'Un nuevo generador de prompts basado en las recomendaciones actuales de Anthropic: texto completo de la tarea, estructura clara y criterios de éxito',
        'Requisitos de diseño cuidado y sin emojis para informes .docx y .md',
        'Un conversor profesional DOCX → Markdown: listas, tablas, enlaces, notas al pie y ecuaciones',
        'Exportación de resultados a .docx con estilo profesional',
        'Revisión de texto más precisa: menos falsos errores y corrección ortográfica real en inglés',
        'Botón «Claves API» en el menú y ayuda detallada sobre las claves de cada proveedor',
        'Los informes largos ya no se cortan: la respuesta continúa automáticamente',
        'Interfaz adaptada a teléfonos y tabletas, y mejoras de seguridad',
      ],
    },
  };

  /** Build { subject, html, text } for the chosen languages. */
  function buildAnnouncement(version, langs, notesByLang, subjectOverride) {
    const fmt = (s) => s.split('{v}').join(version);
    const blocks = langs.map(l => ({ l, t: EMAIL_I18N[l], notes: notesByLang[l] || [] }));
    const subject = subjectOverride ||
      (langs.length === 1 ? fmt(EMAIL_I18N[langs[0]].subject)
                          : `JS PROMPT ${version}: ` + ['оновлення', 'update', 'actualización'].join(' / '));
    const e = escHtml;
    const blockHtml = ({ t, notes }, i) => `
      ${i ? '<tr><td style="padding:8px 40px;"><hr style="border:none;border-top:1px solid #E3E8EF;margin:8px 0;"></td></tr>' : ''}
      <tr><td style="padding:28px 40px 4px;">
        <h1 style="margin:0 0 12px;font-size:22px;line-height:1.3;color:#1F3864;font-family:Segoe UI,Arial,sans-serif;">${e(fmt(t.heading))}</h1>
        <p style="margin:0 0 18px;font-size:15px;line-height:1.6;color:#333333;">${e(t.intro)}</p>
        <h2 style="margin:0 0 10px;font-size:16px;color:#1F3864;font-family:Segoe UI,Arial,sans-serif;">${e(t.whatsNew)}</h2>
        <ul style="margin:0 0 18px;padding-left:20px;font-size:14px;line-height:1.6;color:#333333;">
          ${notes.map(n => `<li style="margin:0 0 6px;">${e(n)}</li>`).join('')}
        </ul>
        <p style="margin:0 0 22px;font-size:14px;line-height:1.6;color:#555555;">${e(t.how)}</p>
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
          <td style="border-radius:6px;background:#1F3864;">
            <a href="${APP_URL}" style="display:inline-block;padding:12px 26px;font-size:15px;font-weight:bold;color:#FFFFFF;text-decoration:none;font-family:Segoe UI,Arial,sans-serif;">${e(t.cta)}</a>
          </td></tr></table>
        <p style="margin:22px 0 0;font-size:14px;color:#333333;">${e(t.thanks)}</p>
      </td></tr>`;

    const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${e(subject)}</title></head>
<body style="margin:0;padding:0;background:#F2F4F7;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:#F2F4F7;"><tr><td align="center" style="padding:24px 12px;">
  <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#FFFFFF;border-radius:10px;overflow:hidden;font-family:Segoe UI,Arial,sans-serif;">
    <tr><td style="background:#1F3864;padding:22px 40px;">
      <span style="font-size:20px;font-weight:bold;letter-spacing:1px;color:#FFFFFF;">JS PROMPT</span>
      <span style="float:right;font-size:13px;color:#C9D6EC;line-height:28px;">v${e(version)}</span>
    </td></tr>
    ${blocks.map(blockHtml).join('')}
    <tr><td style="padding:26px 40px 30px;">
      ${blocks.map(({ t }) => `<p style="margin:0 0 8px;font-size:12px;line-height:1.5;color:#8A94A6;">${e(t.footer)}</p>`).join('')}
      <p style="margin:8px 0 0;font-size:12px;color:#8A94A6;"><a href="${APP_URL}" style="color:#2E74B5;">promt.pp.ua</a></p>
    </td></tr>
  </table>
</td></tr></table>
</body></html>`;

    const text = blocks.map(({ t, notes }) => [
      fmt(t.heading), '', t.intro, '', t.whatsNew + ':', ...notes.map(n => '- ' + n), '', t.how, '',
      t.cta + ': ' + APP_URL, '', t.thanks,
    ].join('\n')).join('\n\n----------------------------------------\n\n') +
      '\n\n' + blocks.map(({ t }) => t.footer).join('\n');

    return { subject, html, text };
  }

  async function renderAnnouncements(content) {
    let recipients = null;            // null = lookup failed / not loaded (never treated as 0)
    const L = ['uk', 'en', 'es'];
    content.innerHTML = `
      <div class="admin-card" style="margin-bottom:20px;">
        <div class="ann-grid">
          <label class="ann-field"><span>${AT('ann.version')}</span>
            <input class="admin-input" id="annVersion" value="2.0.0" maxlength="20"></label>
          <label class="ann-field"><span>${AT('ann.lang')}</span>
            <select class="admin-select" id="annLang">
              <option value="uk">Українська</option><option value="en">English</option><option value="es">Español</option>
              <option value="multi">${AT('ann.lang.multi')}</option>
            </select></label>
        </div>
        ${L.map(l => `
          <label class="ann-field ann-notes" data-lang="${l}"><span>${AT('ann.notes')} — ${l.toUpperCase()}</span>
            <textarea class="admin-input" id="annNotes-${l}" rows="7">${escHtml(EMAIL_I18N[l].notes.join('\n'))}</textarea></label>`).join('')}
        <label class="ann-field"><span>${AT('ann.subject')}</span>
          <input class="admin-input" id="annSubject" maxlength="200"></label>
        <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:6px;">
          <button class="admin-btn admin-btn-primary" id="btnAnnGenerate">${AT('ann.generate')}</button>
        </div>
      </div>

      <div class="admin-card" id="annPreviewCard" style="margin-bottom:20px;display:none;">
        <h2 style="margin-bottom:10px;">${AT('ann.preview')}</h2>
        <iframe id="annPreview" title="${AT('ann.preview')}" sandbox="" style="width:100%;height:560px;border:1px solid var(--border-color,#ccd);border-radius:8px;background:#fff;"></iframe>
        <details style="margin-top:12px;"><summary style="cursor:pointer;">${AT('ann.plain')}</summary>
          <pre id="annText" style="white-space:pre-wrap;font-size:12px;margin-top:8px;"></pre></details>
      </div>

      <div class="admin-card">
        <label class="ann-check">
          <input type="checkbox" id="annSendAll">
          <span>${AT('ann.sendAll')}</span>
        </label>
        <p style="font-size:13px;color:var(--text-secondary);margin:6px 0 14px;" id="annRecipients">${AT('common.loading')}</p>
        <button class="admin-btn admin-btn-primary" id="btnAnnSend">${AT('ann.btnTest')}</button>
        <div id="annProgress" style="margin-top:14px;font-size:13px;"></div>
      </div>`;

    const $ = (sel) => content.querySelector(sel);
    let generated = null;

    // Any change to the source fields makes the generated e-mail stale: it must be
    // generated again before sending, so a bulk send never uses outdated content.
    function invalidate() {
      generated = null;
      $('#annPreviewCard').style.display = 'none';
    }
    function syncLang() {
      const v = $('#annLang').value;
      content.querySelectorAll('.ann-notes').forEach(el => {
        el.style.display = (v === 'multi' || el.dataset.lang === v) ? '' : 'none';
      });
      $('#annSubject').value = '';
      invalidate();
    }
    function syncSendButton() {
      const all = $('#annSendAll').checked;
      $('#btnAnnSend').textContent = all ? AT('ann.btnAll', { n: recipients ?? '?' }) : AT('ann.btnTest');
      $('#btnAnnSend').classList.toggle('admin-btn-danger', all);
      $('#btnAnnSend').classList.toggle('admin-btn-primary', !all);
    }
    async function loadRecipients() {
      const el = $('#annRecipients');
      try {
        recipients = (await window.API.adminAnnouncementRecipients()).count;
        el.textContent = AT('ann.recipients', { n: recipients });
      } catch (err) {
        recipients = null;
        el.innerHTML = '';
        const msg = document.createElement('span');
        msg.style.color = 'var(--error)';
        msg.textContent = '✗ ' + err.message + ' ';
        const retry = document.createElement('button');
        retry.className = 'admin-btn admin-btn-sm';
        retry.textContent = '↻';
        retry.addEventListener('click', loadRecipients);
        el.append(msg, retry);
      }
      syncSendButton();
    }
    function generate() {
      const v = $('#annLang').value;
      const langs = v === 'multi' ? L : [v];
      const notes = {};
      langs.forEach(l => {
        notes[l] = $('#annNotes-' + l).value.split('\n').map(x => x.trim()).filter(Boolean);
      });
      const version = $('#annVersion').value.trim() || '2.0.0';
      generated = buildAnnouncement(version, langs, notes, $('#annSubject').value.trim());
      $('#annSubject').value = generated.subject;
      $('#annPreviewCard').style.display = '';
      $('#annPreview').srcdoc = generated.html;
      $('#annText').textContent = generated.text;
    }
    function showProgress(st) {
      const key = st.running ? 'ann.progress' : 'ann.done';
      $('#annProgress').textContent = AT(key, { sent: st.sent, total: st.total, failed: st.failed });
    }
    async function pollStatus() {
      try {
        const st = await window.API.adminAnnouncementStatus();
        if (!st || st.total === undefined) return;
        showProgress(st);
        if (st.running) setTimeout(pollStatus, 2000);
      } catch {}
    }

    $('#annLang').addEventListener('change', syncLang);
    $('#annSendAll').addEventListener('change', syncSendButton);
    $('#annSubject').addEventListener('input', () => { if (generated) generated.subject = $('#annSubject').value.trim(); });
    $('#annVersion').addEventListener('input', invalidate);
    content.querySelectorAll('[id^="annNotes-"]').forEach(t => t.addEventListener('input', invalidate));
    $('#btnAnnGenerate').addEventListener('click', generate);
    $('#btnAnnSend').addEventListener('click', async () => {
      if (!generated) { toast(AT('ann.needGenerate'), 'error'); return; }
      const btn = $('#btnAnnSend');
      const all = $('#annSendAll').checked;
      try {
        if (!all) {
          btn.disabled = true;
          const r = await window.API.adminSendAnnouncement({ ...generated, mode: 'test' });
          toast(AT('ann.testSent', { email: r.sentTo }), 'ok');
          return;
        }
        if (recipients === null) { await loadRecipients(); if (recipients === null) return; }
        if (!recipients) { toast(AT('ann.noRecipients'), 'error'); return; }
        const ok = await confirmDialog(AT('ann.confirmTitle'),
          AT('ann.confirmBody', { subject: generated.subject, n: recipients }), AT('ann.confirmBtn'));
        if (!ok) return;
        btn.disabled = true;
        const st = await window.API.adminSendAnnouncement({ ...generated, mode: 'all', confirm: 'SEND_TO_ALL' });
        showProgress(st);
        setTimeout(pollStatus, 1500);
      } catch (err) {
        toast('✗ ' + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    });

    syncLang();
    syncSendButton();
    loadRecipients();
    pollStatus();   // show the last campaign's result, if any
  }

  async function renderDanger(content) {
    content.innerHTML = `
      <div class="admin-card" style="margin-bottom:20px;">
        <h2 style="margin-bottom:6px;">${AT('danger.backup.heading')}</h2>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
          ${AT('danger.backup.desc')}
        </p>
        <button class="admin-btn admin-btn-primary" id="btnCreateBackup" style="margin-bottom:18px;">${AT('danger.backup.createBtn')}</button>
        <div id="backupListWrap"></div>
      </div>

      <div class="admin-card" style="border:2px solid var(--error);margin-bottom:20px;">
        <h2 style="color:var(--error);margin-bottom:6px;">${AT('danger.restore.heading')}</h2>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">
          ${AT('danger.restore.desc1')} <code>.sql.gz</code> ${AT('danger.restore.desc2')}
          <strong>${AT('danger.restore.overwrites')}</strong> ${AT('danger.restore.desc3')}
        </p>
        <div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap;">
          <input type="file" id="restoreFileInput" accept=".gz,application/gzip" class="admin-input" style="flex:1;min-width:220px;">
          <button class="admin-btn admin-btn-danger" id="btnUploadRestore">${AT('danger.restore.uploadBtn')}</button>
        </div>
      </div>

      <div class="admin-card" style="border:2px solid var(--error);">
        <h2 style="color:var(--error);">${AT('danger.wipe.heading')}</h2>
        <p style="font-size:13px;color:var(--text-secondary);margin-bottom:18px;">
          ${AT('danger.wipe.desc1')} <strong>${AT('danger.wipe.everyAccount')}</strong>${AT('danger.wipe.desc2')}
        </p>
        <button class="admin-btn admin-btn-danger" id="btnWipeDb">${AT('danger.wipe.btn')}</button>
      </div>`;

    const backupListWrap = content.querySelector('#backupListWrap');

    function fmtSize(bytes) {
      if (bytes < 1024) return bytes + ' B';
      if (bytes < 1024*1024) return (bytes/1024).toFixed(1) + ' KB';
      return (bytes/1024/1024).toFixed(2) + ' MB';
    }

    // Stronger confirmation for destructive restore actions — requires typing a phrase, not just a click.
    function typedConfirmDialog(title, body, requiredText, dangerLabel) {
      return new Promise(resolve => {
        const overlay = document.createElement('div');
        overlay.className = 'admin-modal-overlay';
        overlay.innerHTML = `
          <div class="admin-modal-box" style="text-align:center;max-width:420px;">
            <div style="font-size:32px;margin-bottom:10px;">⚠️</div>
            <h3 style="margin-bottom:8px;">${escHtml(title)}</h3>
            <p style="font-size:13px;color:var(--text-secondary);margin-bottom:16px;">${escHtml(body)}</p>
            <p style="font-size:12px;color:var(--text-secondary);margin-bottom:8px;">
              ${AT('danger.typedConfirm.typeToConfirm')} <strong>${escHtml(requiredText)}</strong> ${AT('danger.typedConfirm.toConfirm')}
            </p>
            <input class="admin-input" id="tcInput" style="margin-bottom:16px;text-align:center;" autocomplete="off">
            <div style="display:flex;gap:10px;">
              <button class="admin-btn" id="tcCancel" style="flex:1;">${AT('common.cancel')}</button>
              <button class="admin-btn admin-btn-danger" id="tcConfirm" style="flex:1;" disabled>${escHtml(dangerLabel || AT('common.confirm'))}</button>
            </div>
          </div>`;
        document.body.appendChild(overlay);
        const input = overlay.querySelector('#tcInput');
        const confirmBtn = overlay.querySelector('#tcConfirm');
        input.addEventListener('input', () => {
          confirmBtn.disabled = input.value.trim() !== requiredText;
        });
        const cleanup = (result) => { overlay.remove(); resolve(result); };
        overlay.querySelector('#tcCancel').onclick = () => cleanup(false);
        overlay.addEventListener('click', e => { if (e.target === overlay) cleanup(false); });
        confirmBtn.onclick = () => { if (input.value.trim() === requiredText) cleanup(true); };
      });
    }

    async function loadBackups() {
      backupListWrap.innerHTML = `<div class="admin-empty">${AT('common.loading')}</div>`;
      let backups;
      try { backups = await window.API.adminListBackups(); }
      catch (err) { backupListWrap.innerHTML = `<div class="admin-empty">✗ ${escHtml(err.message)}</div>`; return; }

      if (!backups.length) {
        backupListWrap.innerHTML = `<div class="admin-empty"><div class="icon">🛠️</div>${AT('danger.backup.none')}</div>`;
        return;
      }

      backupListWrap.innerHTML = `
        <div class="admin-table-wrap">
          <table class="admin-table">
            <thead><tr><th>${AT('danger.backup.col.filename')}</th><th>${AT('danger.backup.col.size')}</th><th>${AT('danger.backup.col.created')}</th><th>${AT('danger.backup.col.actions')}</th></tr></thead>
            <tbody>
              ${backups.map(b => `<tr>
                <td style="font-size:11px;font-family:monospace;">${escHtml(b.filename)}</td>
                <td style="font-size:11px;">${fmtSize(b.size)}</td>
                <td style="font-size:11px;">${new Date(b.created_at).toLocaleString()}</td>
                <td style="display:flex;gap:5px;flex-wrap:wrap;">
                  <button class="admin-btn admin-btn-sm" data-dl-backup="${escHtml(b.filename)}">${AT('common.download')}</button>
                  <button class="admin-btn admin-btn-sm admin-btn-danger" data-restore-backup="${escHtml(b.filename)}">${AT('danger.backup.restoreBtn')}</button>
                  <button class="admin-btn admin-btn-sm admin-btn-danger" data-del-backup="${escHtml(b.filename)}">${AT('common.delete')}</button>
                </td>
              </tr>`).join('')}
            </tbody>
          </table>
        </div>`;
    }

    content.querySelector('#btnCreateBackup').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = AT('danger.backup.creating');
      try {
        const result = await window.API.adminCreateBackup();
        toast(AT('danger.backup.created', { size: fmtSize(result.size) }), 'ok');
        loadBackups();
      } catch (err) {
        toast('✗ ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });

    onClickFresh(backupListWrap, async (e) => {
      const dlBtn = e.target.closest('[data-dl-backup]');
      if (dlBtn) {
        try { await window.API.adminDownloadBackup(dlBtn.dataset.dlBackup); }
        catch (err) { toast('✗ ' + err.message, 'error'); }
        return;
      }

      const restoreBtn = e.target.closest('[data-restore-backup]');
      if (restoreBtn) {
        const filename = restoreBtn.dataset.restoreBackup;
        const ok = await typedConfirmDialog(
          AT('danger.typedConfirm.restoreBackupTitle'),
          AT('danger.typedConfirm.restoreBackupBody', { filename }),
          'RESTORE',
          AT('danger.typedConfirm.restoreLabel')
        );
        if (!ok) return;
        restoreBtn.disabled = true;
        const origText = restoreBtn.textContent;
        restoreBtn.textContent = AT('danger.backup.restoring');
        try {
          const result = await window.API.adminRestoreBackup(filename);
          toast('✓ ' + result.message, 'ok');
        } catch (err) {
          toast('✗ ' + err.message, 'error');
        } finally {
          restoreBtn.disabled = false;
          restoreBtn.textContent = origText;
        }
        return;
      }

      const delBtn = e.target.closest('[data-del-backup]');
      if (delBtn) {
        const ok = await confirmDialog(AT('danger.backup.deleteTitle'), delBtn.dataset.delBackup, AT('common.delete'));
        if (!ok) return;
        try {
          await window.API.adminDeleteBackup(delBtn.dataset.delBackup);
          toast(AT('danger.backup.deleted'), 'ok');
          loadBackups();
        } catch (err) { toast('✗ ' + err.message, 'error'); }
      }
    });

    content.querySelector('#btnUploadRestore').addEventListener('click', async (e) => {
      const btn = e.currentTarget;
      const fileInput = content.querySelector('#restoreFileInput');
      const file = fileInput.files && fileInput.files[0];
      if (!file) { toast(AT('danger.restore.chooseFirst'), 'error'); return; }
      if (!/\.gz$/i.test(file.name)) { toast(AT('danger.restore.mustBeGz'), 'error'); return; }

      const ok = await typedConfirmDialog(
        AT('danger.typedConfirm.restoreUploadTitle'),
        AT('danger.typedConfirm.restoreUploadBody', { filename: file.name }),
        'RESTORE',
        AT('danger.typedConfirm.restoreLabel')
      );
      if (!ok) return;

      btn.disabled = true;
      const origText = btn.textContent;
      btn.textContent = AT('danger.restore.uploading');
      try {
        const result = await window.API.adminUploadRestoreBackup(file);
        toast('✓ ' + result.message, 'ok');
        fileInput.value = '';
        loadBackups();
      } catch (err) {
        toast('✗ ' + err.message, 'error');
      } finally {
        btn.disabled = false;
        btn.textContent = origText;
      }
    });

    content.querySelector('#btnWipeDb').addEventListener('click', async () => {
      const ok1 = await confirmDialog(AT('danger.wipe.confirm1Title'), AT('danger.wipe.confirm1Body'), AT('danger.wipe.confirm1Label'));
      if (!ok1) return;
      const ok2 = await confirmDialog(AT('danger.wipe.confirm2Title'), AT('danger.wipe.confirm2Body'), AT('danger.wipe.confirm2Label'));
      if (!ok2) return;
      try {
        const result = await window.API.adminWipeDatabase();
        toast('✓ ' + result.message, 'ok');
      } catch (err) { toast('✗ ' + err.message, 'error'); }
    });

    await loadBackups();
  }

  // ── Bootstrap ───────────────────────────────────────────────
  function closeAnyAuthModal() {
    document.querySelectorAll('.auth-modal-overlay').forEach(el => el.remove());
  }

  async function tryEnter() {
    try { await window.API?.ensureSession?.(); } catch {}
    const user = window.API?.getCurrentUser();
    if (!user) {
      document.getElementById('adminContent').innerHTML =
        `<div class="admin-empty"><div class="icon">🔒</div>${AT('gate.signin')}</div>`;
      if (typeof window.showLoginModal === 'function') {
        closeAnyAuthModal();
        window.showLoginModal();
      }
      return;
    }
    closeAnyAuthModal();
    if (user.role !== 'admin') {
      document.getElementById('adminContent').innerHTML =
        `<div class="admin-empty"><div class="icon">⛔</div>${AT('gate.adminOnly')}</div>`;
      return;
    }
    switchSection('dashboard');
  }

  document.addEventListener('DOMContentLoaded', () => {
    tryEnter();
    window.addEventListener('jsprompt:login', tryEnter);
  });

})();