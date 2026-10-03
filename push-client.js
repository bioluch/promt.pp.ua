/**
 * push-client.js — JS PROMPT  (self-contained, no changes needed elsewhere)
 *
 * - Captures the JWT automatically from any authenticated API request.
 * - Auto-subscribes silently when notification permission is already granted.
 * - Shows a localized "Enable notifications" button when permission is needed
 *   (required on Android, where the prompt must follow a user tap).
 * - Sends the current UI language with the subscription, and re-sends it when
 *   the user switches language, so push notifications arrive in that language.
 * - Exposes window.enablePush() / window.disablePush() for a settings toggle.
 *
 * Requirements: HTTPS + a registered Service Worker (sw.js).
 * iOS: works only on iOS/iPadOS 16.4+ AND when installed to the Home Screen.
 */
(function () {
  'use strict';

  let authToken   = null;
  let subscribing = false;

  // ── Current UI language (from language.js / window.Lang, fallback to storage) ──
  function getLang() {
    try {
      if (window.Lang && typeof window.Lang.getLang === 'function') return window.Lang.getLang();
    } catch (e) { /* ignore */ }
    return localStorage.getItem('ui_lang') || 'en';
  }

  // ── Localized label for the opt-in button (fallback if Lang not ready) ──
  const BTN_FALLBACK = { en: '🔔 Enable notifications', uk: '🔔 Увімкнути сповіщення', es: '🔔 Activar notificaciones' };
  function btnLabel() {
    try {
      if (window.Lang && typeof window.Lang.t === 'function') return window.Lang.t('push.enable');
    } catch (e) { /* ignore */ }
    return BTN_FALLBACK[getLang()] || BTN_FALLBACK.en;
  }

  // ── 1. Capture the Bearer token from outgoing API requests ──
  const origFetch = window.fetch.bind(window);
  window.fetch = function (...args) {
    try {
      let auth = null;
      const input = args[0], init = args[1];
      if (input instanceof Request) auth = input.headers.get('Authorization');
      if (!auth && init && init.headers) auth = new Headers(init.headers).get('Authorization');
      if (auth && auth.indexOf('Bearer ') === 0) {
        const t = auth.slice(7);
        if (t && t !== authToken) { authToken = t; onToken(); }
      }
    } catch (e) { /* ignore */ }
    return origFetch.apply(this, args);
  };

  function onToken() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;
    if (Notification.permission === 'granted')      subscribe();        // silent
    else if (Notification.permission === 'default') showEnableButton(); // needs a tap
    // 'denied' → do nothing
  }

  // ── 2. Subscribe flow ──
  async function subscribe() {
    if (subscribing || !authToken) return false;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      showStatus('⚠ Push not supported in this browser');
      return false;
    }
    subscribing = true;
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') { showStatus('⚠ Permission: ' + perm); subscribing = false; return false; }

      const reg = await navigator.serviceWorker.ready;

      const resp = await origFetch('/api/push/vapid-public-key');
      if (!resp.ok) { showStatus('⚠ Server push not configured'); subscribing = false; return false; }
      const { key } = await resp.json();
      const appKey = urlBase64ToUint8Array(key);

      let sub = await reg.pushManager.getSubscription();

      // Existing subscription made with a DIFFERENT VAPID key → drop it and re-create
      if (sub && !sameKey(sub, appKey)) {
        try { await sub.unsubscribe(); } catch (e) { /* ignore */ }
        sub = null;
      }

      if (!sub) {
        try {
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
        } catch (err) {
          // Stale registration (InvalidStateError) — clear whatever exists and retry once
          const old = await reg.pushManager.getSubscription();
          if (old) { try { await old.unsubscribe(); } catch (e) { /* ignore */ } }
          sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: appKey });
        }
      }

      const post = await postSubscription(sub);
      if (!post.ok) {
        showStatus('⚠ Server returned ' + post.status);
        console.warn('[push] /api/push/subscribe returned', post.status);
        subscribing = false;
        return false; // keep the button so the user can retry
      }

      console.log('[push] subscribed (lang=' + getLang() + ')');
      hideStatus();
      hideEnableButton();
      subscribing = false;
      return true;
    } catch (e) {
      showStatus('⚠ ' + e.name + ': ' + (e.message || '').slice(0, 120));
      console.warn('[push] subscribe failed:', e.name, '—', e.message);
      subscribing = false;
      return false;
    }
  }

  // Compare a subscription's VAPID key with the current one
  function sameKey(sub, appKey) {
    try {
      const cur = sub.options && sub.options.applicationServerKey;
      if (!cur) return true; // can't tell → assume same
      const a = new Uint8Array(cur);
      if (a.length !== appKey.length) return false;
      for (let i = 0; i < a.length; i++) if (a[i] !== appKey[i]) return false;
      return true;
    } catch (e) { return true; }
  }

  // POST the subscription + current language (server upserts on endpoint)
  function postSubscription(sub) {
    const body = sub.toJSON ? sub.toJSON() : sub;
    body.lang = getLang();
    return origFetch('/api/push/subscribe', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
      body:    JSON.stringify(body),
    });
  }

  // ── 3. Keep push language in sync when the user switches UI language ──
  async function syncLang() {
    try {
      if (!authToken || Notification.permission !== 'granted') return;
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) { await postSubscription(sub); console.log('[push] language updated → ' + getLang()); }
    } catch (e) { /* ignore */ }
  }

  // Wrap window.Lang.setLang so changing language re-sends the subscription
  (function wrapSetLang() {
    if (window.Lang && typeof window.Lang.setLang === 'function' && !window.Lang.__pushWrapped) {
      const orig = window.Lang.setLang;
      window.Lang.setLang = function () {
        const r = orig.apply(this, arguments);
        syncLang();
        return r;
      };
      window.Lang.__pushWrapped = true;
    } else if (!window.Lang) {
      // language.js not parsed yet — retry shortly
      setTimeout(wrapSetLang, 500);
    }
  })();

  // ── 4. Opt-in button (Android needs a user gesture for the prompt) ──
  function showEnableButton() {
    if (document.getElementById('pushEnableBtn')) return;
    if (!document.body) { document.addEventListener('DOMContentLoaded', showEnableButton, { once: true }); return; }
    const btn = document.createElement('button');
    btn.id = 'pushEnableBtn';
    btn.type = 'button';
    btn.setAttribute('data-i18n', 'push.enable'); // lets language.js re-translate it live
    btn.textContent = btnLabel();
    btn.style.cssText =
      'position:fixed;right:16px;bottom:88px;z-index:99999;padding:10px 16px;' +
      'background:#4fc3f7;color:#04263a;border:none;border-radius:10px;' +
      'font:600 14px system-ui,-apple-system,sans-serif;cursor:pointer;' +
      'box-shadow:0 4px 14px rgba(0,0,0,.35)';
    btn.addEventListener('click', function () { subscribe(); });
    document.body.appendChild(btn);
  }
  function hideEnableButton() {
    const b = document.getElementById('pushEnableBtn');
    if (b) b.remove();
  }

  // ── Visible status toast (so errors are readable without a dev console) ──
  function showStatus(msg) {
    if (!document.body) return;
    let el = document.getElementById('pushStatus');
    if (!el) {
      el = document.createElement('div');
      el.id = 'pushStatus';
      el.style.cssText =
        'position:fixed;right:16px;bottom:140px;z-index:99999;max-width:300px;' +
        'padding:8px 12px;background:#2a2f3a;color:#ffcc66;border-radius:8px;' +
        'font:500 12px system-ui,-apple-system,sans-serif;box-shadow:0 4px 14px rgba(0,0,0,.35)';
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }
  function hideStatus() {
    const el = document.getElementById('pushStatus');
    if (el) el.remove();
  }

  function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const raw     = atob(base64);
    const out     = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
    return out;
  }

  // ── 5. Public API for a settings toggle (optional) ──
  window.enablePush  = subscribe;
  window.disablePush = async function () {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (!sub) return;
      if (authToken) {
        await origFetch('/api/push/unsubscribe', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + authToken },
          body:    JSON.stringify({ endpoint: sub.endpoint }),
        });
      }
      await sub.unsubscribe();
      console.log('[push] unsubscribed');
    } catch (e) { /* ignore */ }
  };
})();