/**
 * prompt.js — JS PROMPT PWA
 * Main application logic: Pyodide init, all panels, utils.
 */
'use strict';

const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);

function toast(msg, type = '') {
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => {
    t.style.opacity = '0';
    t.style.transform = 'translateX(120%)';
    t.style.transition = 'all 0.3s';
  }, 2800);
  setTimeout(() => t.remove(), 3200);
}

/**
 * appPrompt(message, defaultValue) → Promise<string|null>
 * Стильний аналог window.prompt() у дизайні застосунку.
 */
function appPrompt(message, defaultValue = '') {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay app-dialog-overlay';
    overlay.innerHTML = `
      <div class="modal-box app-dialog-box" role="dialog" aria-modal="true">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(message)}</span>
        </div>
        <div class="modal-body app-dialog-body">
          <form autocomplete="off" onsubmit="return false"
                style="margin:0;padding:0;display:contents;">
            <input id="appDialogInput" class="app-dialog-input"
                   type="search"
                   value="${escapeHtml(defaultValue)}"
                   autocomplete="off"
                   autocorrect="off"
                   autocapitalize="off"
                   spellcheck="false"
                   data-form-type="other">
          </form>
        </div>
        <div class="app-dialog-footer">
          <button class="btn btn-ghost app-dialog-cancel">${escapeHtml(window.Lang ? Lang.t('dialog.cancel') : 'Cancel')}</button>
          <button class="btn btn-primary app-dialog-ok">OK</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const input  = overlay.querySelector('#appDialogInput');
    const btnOk  = overlay.querySelector('.app-dialog-ok');
    const btnCnl = overlay.querySelector('.app-dialog-cancel');

    // Показ діалогу, фокус і виділення тексту
    requestAnimationFrame(() => {
      overlay.classList.add('app-dialog-visible');
      input.focus();
      input.select();
    });

    function finish(value) {
      overlay.classList.add('app-dialog-closing');
      setTimeout(() => overlay.remove(), 180);
      resolve(value);
    }

    btnOk.addEventListener('click',  () => finish(input.value.trim() || null));
    btnCnl.addEventListener('click', () => finish(null));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); finish(input.value.trim() || null); }
      if (e.key === 'Escape') { e.preventDefault(); finish(null); }
    });
    // Клік поза діалогом — скасування
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(null); });
  });
}

/**
 * appConfirm(message) → Promise<boolean>
 * Стильний аналог window.confirm() у дизайні застосунку.
 */
function appConfirm(message) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay app-dialog-overlay';
    const _confirmOkLabel  = window.Lang ? Lang.t('dialog.delete')    : 'Delete';
    const _confirmCnlLabel = window.Lang ? Lang.t('dialog.cancelBtn') : 'Cancel';
    const _confirmTitle    = window.Lang ? Lang.t('dialog.confirm')   : 'Confirmation';
    overlay.innerHTML = `
      <div class="modal-box app-dialog-box" role="dialog" aria-modal="true">
        <div class="modal-header">
          <span class="modal-title">${_confirmTitle}</span>
        </div>
        <div class="modal-body app-dialog-body">
          <p class="app-dialog-msg">${escapeHtml(message)}</p>
        </div>
        <div class="app-dialog-footer">
          <button class="btn btn-ghost app-dialog-cancel">${_confirmCnlLabel}</button>
          <button class="btn app-dialog-ok app-dialog-danger">${_confirmOkLabel}</button>
        </div>
      </div>`;
    document.body.appendChild(overlay);

    const btnOk  = overlay.querySelector('.app-dialog-ok');
    const btnCnl = overlay.querySelector('.app-dialog-cancel');


    // Animate in — without this the overlay stays opacity:0
    // and clicks fall through to the backdrop, always returning false
    requestAnimationFrame(() => {
      overlay.classList.add('app-dialog-visible');
      if (btnOk) btnOk.focus();
    });

    function finish(value) {
      overlay.classList.add('app-dialog-closing');
      setTimeout(() => overlay.remove(), 200);
      resolve(value);
    }

    if (btnOk)  btnOk.addEventListener('click',  () => finish(true));
    if (btnCnl) btnCnl.addEventListener('click', () => finish(false));
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(false); });
    overlay.addEventListener('keydown', e => { if (e.key === 'Escape') finish(false); });
  });
}

/**
 * appSaveFile(defaultName, content, mimeType) → Promise<void>
 * Styled save-file dialog — replaces the native browser "Save password" popup.
 * Shows a custom modal where the user can edit the filename, then downloads.
 *
 * @param {string} defaultName  - Suggested filename (with extension)
 * @param {string} content      - File content
 * @param {string} mimeType     - MIME type (e.g. 'text/markdown')
 */
function appSaveFile(defaultName, content, mimeType) {
  return new Promise(resolve => {
    const T = k => (window.Lang ? Lang.t(k) : null);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay app-dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', T('dialog.saveFile') || 'Save file');

    // Split name and extension for separate editing
    const dotIdx = defaultName.lastIndexOf('.');
    const baseName = dotIdx > 0 ? defaultName.slice(0, dotIdx) : defaultName;
    const ext      = dotIdx > 0 ? defaultName.slice(dotIdx)    : '';

    overlay.innerHTML = `
      <div class="modal-box app-dialog-box app-savefile-box" style="max-width:420px;">
        <div class="modal-header">
          <span class="modal-title">${T('dialog.saveFile') || 'Save file'}</span>
          <button class="modal-close app-savefile-close" aria-label="close">&times;</button>
        </div>
        <div class="modal-body app-dialog-body" style="padding:20px 24px;">

          <div class="app-savefile-icon-row">
            <div class="app-savefile-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                   stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <line x1="12" y1="12" x2="12" y2="18"/>
                <line x1="9" y1="15" x2="15" y2="15"/>
              </svg>
            </div>
            <div class="app-savefile-meta">
              <div class="app-savefile-type">${ext.replace('.','').toUpperCase()} • Markdown</div>
              <div class="app-savefile-size">${(new Blob([content]).size / 1024).toFixed(1)} KB</div>
            </div>
          </div>

          <label class="app-savefile-label" for="appSaveFileInput">
            ${T('dialog.fileName') || 'File name'}
          </label>
          <form autocomplete="off" onsubmit="return false"
                style="margin:0;padding:0;display:contents;">
          <div class="app-savefile-input-row">
            <input id="appSaveFileInput"
                   class="app-dialog-input app-savefile-input"
                   type="search"
                   value="${escapeHtml(baseName)}"
                   autocomplete="off"
                   autocorrect="off"
                   autocapitalize="off"
                   spellcheck="false"
                   data-form-type="other">
            <span class="app-savefile-ext">${escapeHtml(ext)}</span>
          </div>
          </form>

        </div>
        <div class="app-dialog-footer">
          <button class="btn btn-ghost app-savefile-cancel">
            ${T('dialog.cancelBtn') || 'Cancel'}
          </button>
          <button class="btn btn-primary app-savefile-save">
<span style="margin-right:6px;font-size:15px;">&#128190;</span>${T('dialog.saveBtn') || 'Save'}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('app-dialog-visible'));

    const input   = overlay.querySelector('#appSaveFileInput');
    const btnSave = overlay.querySelector('.app-savefile-save');
    const btnCnl  = overlay.querySelector('.app-savefile-cancel');
    const btnCls  = overlay.querySelector('.app-savefile-close');

    requestAnimationFrame(() => { input.focus(); input.select(); });

    function finish(doSave) {
      overlay.classList.add('app-dialog-closing');
      setTimeout(() => overlay.remove(), 200);
      if (doSave) {
        const finalName = (input.value.trim() || baseName) + ext;
        downloadFile(finalName, content, mimeType);
        toast((window.Lang ? Lang.t('toast.fileSaved') : 'File saved!') + ' ' + finalName, 'success');
      }
      resolve(doSave ? input.value.trim() : null);
    }

    btnSave.addEventListener('click', () => finish(true));
    btnCnl.addEventListener('click',  () => finish(false));
    btnCls.addEventListener('click',  () => finish(false));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); finish(true);  }
      if (e.key === 'Escape') { e.preventDefault(); finish(false); }
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(false); });
  });
}

function setStatus(text, ready = false) {
  const el = $('#statusText');
  if (el) el.textContent = text;
  const dot = $('#statusDot');
  if (dot) dot.classList.toggle('ready', ready);
}



var _origShow = window.showHourglassSpinner;
window.showHourglassSpinner = function(label) {
  setStatus(label || (window.Lang ? Lang.t('status.processing') : 'Processing…'));
  if (_origShow) _origShow(label);
};
var _origUpdate = window.updateHourglassText;
window.updateHourglassText = function(label, pct) {
  setStatus(label || (window.Lang ? Lang.t('status.processing') : 'Processing…'));
  if (_origUpdate) _origUpdate(label, pct);
};
var _origHide = window.hideHourglassSpinner;
window.hideHourglassSpinner = function() {
  if (_origHide) _origHide();
};
var showHourglassSpinner  = window.showHourglassSpinner;
var updateHourglassText   = window.updateHourglassText;
var hideHourglassSpinner  = window.hideHourglassSpinner;

function initTabs() {
  $$('.tab').forEach(btn => {
    btn.addEventListener('click', () => {
      $$('.tab').forEach(b => b.classList.remove('active'));
      $$('.panel').forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      $('#panel-' + btn.dataset.panel).classList.add('active');
    });
  });
}


// ── Pyodide: 3-phase lazy initialisation ──────────────────────────
// Phase 1 (startup):   load Pyodide runtime + micropip + PYTHON_CORE
//                      → prompt generator is ready immediately (~5-8s)
// Phase 2 (on demand): install PDF/DOCX packages when Converter is first used
// Phase 3 (on demand): install pyspellchecker when Error Checker is first used
//
// Time complexity: O(1) for startup (fixed set of lightweight ops).
// Heavy packages (pdfminer.six ~3 MB, python-docx ~1 MB, Pillow ~8 MB)
// are deferred until actually needed.

let pyodide = null;

// Flags to avoid double-installing on repeated use
let _pkgConverterReady = false;
let _pkgCheckerReady   = false;
let _initPromise       = null;  // deduplicate concurrent calls

/** T(key, fb) — short i18n helper */
const _T = (k, fb) => (window.Lang ? Lang.t(k) : null) || fb;

/**
 * Phase 1 — called once at DOMContentLoaded.
 * Loads Pyodide runtime + micropip + PYTHON_CORE (~160 KB).
 * After this resolves, the Prompt Generator works fully.
 * Returns a promise; subsequent calls return the same promise.
 */
async function initPyodide() {
  if (_initPromise) return _initPromise;
  _initPromise = _doInitPyodide();
  return _initPromise;
}

async function _doInitPyodide() {
  const T = _T;
  try {
    setStatus(T('status.loadingPyodide', 'Loading Pyodide…'));
    updateHourglassText(T('status.loadingPyodide', 'Loading Pyodide…'), 10);
    showHourglassSpinner(T('status.loadingPyodide', 'Loading Pyodide…'));

    // Load Pyodide WASM runtime
    pyodide = await loadPyodide({
      indexURL: 'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/',
    });

    updateHourglassText(T('status.installingPkgs', 'Installing packages…'), 45);
    setStatus(T('status.installingPkgs', 'Installing packages…'));

    // Load micropip (built-in, fast — no network)
    await pyodide.loadPackage(['micropip']);

    updateHourglassText(T('status.initCore', 'Initialising Python core…'), 80);
    setStatus(T('status.initCore', 'Initialising Python core…'));

    // Run PYTHON_CORE (prompt engine — pure Python, no heavy deps)
    await pyodide.runPythonAsync(PYTHON_CORE);

    hideHourglassSpinner();
    setStatus(T('status.ready', 'Ready'), true);
    console.info('[Pyodide] Phase 1 complete — prompt engine ready');

  } catch (e) {
    hideHourglassSpinner();
    console.error('[Pyodide] Phase 1 failed:', e);
    setStatus(T('status.initError', 'Initialisation error'), false);
    toast(T('toast.errorGeneric', 'Error:') + ' ' + e.message, 'error');
    _initPromise = null;  // allow retry
  }
}

/**
 * Phase 2 — install PDF/DOCX packages (lazy, first Converter use).
 * pypdf + pdfminer.six + python-docx + Pillow ≈ 12 MB total.
 * Cached by Service Worker after first download.
 */
async function ensureConverterPackages() {
  if (_pkgConverterReady) return;
  await initPyodide();          // guarantee Phase 1 is done
  if (!pyodide) throw new Error('Pyodide not available');

  const T = _T;
  const micropip = pyodide.pyimport('micropip');

  updateHourglassText(T('status.installingAdv', 'Installing PDF/DOCX packages…'), 20);
  setStatus(T('status.installingAdv', 'Installing PDF/DOCX packages…'));
  showHourglassSpinner(T('status.installingAdv', 'Installing PDF/DOCX packages…'));
  try {
    await micropip.install(['pypdf', 'pdfminer.six', 'python-docx', 'Pillow']);

    // Re-run the import block so Python flags (_PYPDF_OK, _DOCX_OK, etc.)
    // are set to True now that the packages are actually installed.
    await pyodide.runPythonAsync(`
try:
    from pypdf import PdfReader
    _PYPDF_OK = True
except ImportError:
    _PYPDF_OK = False

try:
    from pdfminer.high_level import extract_pages
    from pdfminer.layout import (
        LTPage, LTTextBox, LTTextLine, LTChar, LTAnon,
        LTFigure, LTImage, LTRect, LTLine, LAParams
    )
    _PDFMINER_OK = True
except ImportError:
    _PDFMINER_OK = False

try:
    from PIL import Image as PILImage
    _PILLOW_OK = True
except ImportError:
    _PILLOW_OK = False

try:
    from docx import Document
    from docx.oxml.ns import qn
    _DOCX_OK = True
except ImportError:
    _DOCX_OK = False
  `);

    _pkgConverterReady = true;
  } finally {
    hideHourglassSpinner();
  }
  console.info('[Pyodide] Phase 2 complete — converter packages ready');
  console.info('[Pyodide] Flags:', await pyodide.runPythonAsync(
    'str({"pypdf": _PYPDF_OK, "pdfminer": _PDFMINER_OK, "pillow": _PILLOW_OK, "docx": _DOCX_OK})'
  ));
}

/**
 * Phase 3 — install pyspellchecker (lazy, first Error Checker use).
 * ~0.5 MB. Also ensures Phase 2 packages are available.
 */
async function ensureCheckerPackages() {
  if (_pkgCheckerReady) return;
  await initPyodide();
  if (!pyodide) throw new Error('Pyodide not available');

  const T = _T;
  const micropip = pyodide.pyimport('micropip');

  updateHourglassText(T('status.installingPkgs', 'Installing spell checker…'), 30);
  setStatus(T('status.installingPkgs', 'Installing spell checker…'));
  showHourglassSpinner(T('status.installingPkgs', 'Installing spell checker…'));

  try {
    await micropip.install(['pyspellchecker']);
  } finally {
    hideHourglassSpinner();
  }
  // Встановлюємо безпосередньо з wheel-файлу на CDN
  /*
  await micropip.install(
    'https://cdn.jsdelivr.net/pyodide/v0.25.1/full/pyspellchecker-0.7.2-py3-none-any.whl',
    { keep_going: true }
  );
*/
  _pkgCheckerReady = true;
  console.info('[Pyodide] Phase 3 complete — checker packages ready');
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

function downloadFile(name, content, type) {
  const blob = new Blob([content], { type: type + ';charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function detectLang(text) {
  const uk = (text.match(/[а-яіїєґ]/gi) || []).length;
  const en = (text.match(/[a-z]/gi) || []).length;
  return uk >= en ? 'uk' : 'en';
}

/**
 * appSaveLocal(title, defaultName) → Promise<string|null>
 * Styled dialog to enter a name for saving to localStorage.
 * Uses type="search" + data-form-type="other" to prevent
 * browser password managers from intercepting the input.
 */
function appSaveLocal(title, defaultName) {
  return new Promise(resolve => {
    const T = k => (window.Lang ? Lang.t(k) : null);
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay app-dialog-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');

    const safeDefault = (defaultName || 'document').replace(/\.md$/, '');

    overlay.innerHTML = `
      <div class="modal-box app-dialog-box app-savefile-box" style="max-width:400px;">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(title)}</span>
          <button class="modal-close app-savefile-close" aria-label="close">&times;</button>
        </div>
        <div class="modal-body app-dialog-body" style="padding:20px 24px;">

          <div class="app-savefile-icon-row">
            <div class="app-savefile-icon">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none"
                   stroke="currentColor" stroke-width="1.8"
                   stroke-linecap="round" stroke-linejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div class="app-savefile-meta">
              <div class="app-savefile-type">localStorage</div>
              <div class="app-savefile-size">${T('dialog.saveLocalHint') || 'Saved in the browser, persists across sessions'}</div>
            </div>
          </div>

          <label class="app-savefile-label" for="appSaveLocalInput">
            ${T('dialog.fileName') || 'File name'}
          </label>
          <div class="app-savefile-input-row" style="margin-bottom:4px;">
            <input id="appSaveLocalInput"
                   class="app-dialog-input app-savefile-input"
                   type="search"
                   value="${escapeHtml(safeDefault)}"
                   autocomplete="off"
                   autocorrect="off"
                   autocapitalize="off"
                   spellcheck="false"
                   data-form-type="other"
                   data-lpignore="true"
                   data-1p-ignore="true">
            <span class="app-savefile-ext">.md</span>
          </div>

        </div>
        <div class="app-dialog-footer">
          <button class="btn btn-ghost app-savefile-cancel">
            ${T('dialog.cancelBtn') || 'Cancel'}
          </button>
          <button class="btn btn-primary app-savefile-save">
<span style="margin-right:6px;font-size:15px;">&#128190;</span>${T('dialog.saveBtn') || 'Save'}
          </button>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    requestAnimationFrame(() => {
      overlay.classList.add('app-dialog-visible');
      const inp = overlay.querySelector('#appSaveLocalInput');
      if (inp) { inp.focus(); inp.select(); }
    });

    const input   = overlay.querySelector('#appSaveLocalInput');
    const btnSave = overlay.querySelector('.app-savefile-save');
    const btnCnl  = overlay.querySelector('.app-savefile-cancel');
    const btnCls  = overlay.querySelector('.app-savefile-close');

    function finish(value) {
      overlay.classList.add('app-dialog-closing');
      setTimeout(() => overlay.remove(), 200);
      resolve(value);
    }

    btnSave.addEventListener('click', () => finish(input.value.trim() || safeDefault));
    btnCnl.addEventListener('click',  () => finish(null));
    btnCls.addEventListener('click',  () => finish(null));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter')  { e.preventDefault(); finish(input.value.trim() || safeDefault); }
      if (e.key === 'Escape') { e.preventDefault(); finish(null); }
    });
    overlay.addEventListener('click', e => { if (e.target === overlay) finish(null); });
  });
}

function initPromptPanel() {
  // Wire translation status callback
  if (window.VT_setTranslateStatusCb) {
    VT_setTranslateStatusCb(function(msg) {
      setStatus(msg || 'Translating…');
    });
  }

  $('#btnGenPrompt').addEventListener('click', async () => {
    if (!pyodide) { toast(window.Lang ? Lang.t('status.waitPyodide') : 'Wait for Pyodide to load', 'error'); return; }
    const rawText = $('#promptInput').value.trim();
    if (!rawText) { toast(Lang ? Lang.t('toast.noText') : 'Enter text first', 'error'); return; }
    const btn = $('#btnGenPrompt');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> …';

    try {
      // ── Step 1: Language detection and translation to English ──
      //
      // Priority chain (first success wins):
      //   1. DeepSeek API      — highest quality, requires API key
      //   2. Helsinki-NLP/Xenova (local WebAssembly model) — no key needed
      //   3. Original text     — last resort, user is warned
      //
      let textForPrompt = rawText;
      let detectedLang = 'en';

      // Detect language (VT_detectLang available after voice_translate.js loads)
      if (window.VT_detectLang) {
        detectedLang = VT_detectLang(rawText);
      }

      if (detectedLang === 'uk' || detectedLang === 'es') {
        const langLabel = detectedLang === 'uk' ? 'UK→EN' : 'ES→EN';
        const T = k => (window.Lang ? Lang.t(k) : null);

        showHourglassSpinner((T('status.translating') || 'Translating') + ' (' + langLabel + ')…');
        setStatus((T('status.translating') || 'Translating') + ' (' + langLabel + ')…');
        toast(T('toast.translInputEn') || 'Translating input to English…', '');

        let translated = false;

        // ── Priority 1: DeepSeek API ─────────────────────────────
        if (!translated && typeof DeepSeek !== 'undefined' && DeepSeek.hasKey()) {
          try {
            console.info('[translate] Using DeepSeek API…');
            textForPrompt = await DeepSeek.translateText(rawText, detectedLang, 'en');
            translated = true;
            toast(T('toast.translatedApi') || 'Text translated (DeepSeek)', 'success');
          } catch (dsErr) {
            // Key invalid or quota — fall through to local model
            console.warn('[translate] DeepSeek failed, falling back to local model:', dsErr.message);
          }
        }

        // ── Priority 2: Local Helsinki-NLP model (WebAssembly) ───
        if (!translated && window.VT_translateToEnglish) {
          try {
            console.info('[translate] Using local Helsinki-NLP model…');
            textForPrompt = await VT_translateToEnglish(rawText, detectedLang);
            translated = true;
            toast(T('toast.translated') || 'Text translated to English', 'success');
          } catch (localErr) {
            console.warn('[translate] Local model failed:', localErr.message);
          }
        }

        // ── Priority 3: Original text — user is warned ───────────
        // (No browser-side Claude fallback: it would need an API key in the page.)
        if (!translated) {
          console.warn('[translate] All translation methods failed — using original text');
          toast(T('toast.translateFailed') || 'Translation failed — using original text', 'error');
          textForPrompt = rawText;
        }

        if (translated) {
          // Show translated text in input field
          $('#promptInput').value = textForPrompt;
          $('#promptInput').dispatchEvent(new Event('input'));
          setStatus(T('status.transCompleteGen') || 'Translation complete. Generating prompt…');
          await new Promise(r => setTimeout(r, 400));
        }
      }

      // ── Крок 2: Генерація промту ──────────────────────────────────
      const engine = (typeof DeepSeek !== 'undefined') ? DeepSeek.getActiveEngine() : 'local';

      showHourglassSpinner(window.Lang ? Lang.t('status.generating') : 'Generating prompt…');
      setStatus(window.Lang ? Lang.t('status.generating') : 'Generating prompt…');
      btn.innerHTML = '<span class="loader"></span> ' + (window.Lang ? Lang.t('btn.generating') : 'Generating…');

      // ── Resolve output language ───────────────────────────────────
      // An explicit request in the user's ORIGINAL task text
      // (e.g. "українською мовою" / "in English") overrides the dropdown.
      const dropdownLang  = $('#promptLang').value;
      const requestedLang = (typeof DeepSeek !== 'undefined' && DeepSeek.detectOutputLang)
        ? DeepSeek.detectOutputLang(rawText) : null;
      const outLang = requestedLang || dropdownLang;
      if (requestedLang && requestedLang !== dropdownLang) {
        console.info(`[prompt] output language from task text: ${dropdownLang} → ${outLang}`);
      }

      let result;

      if (engine === 'deepseek') {
        // ── DeepSeek API ──
        if (!DeepSeek.hasKey()) {
          // Показуємо банер і зупиняємось
          const banner = document.getElementById('apiKeyBanner');
          if (banner) banner.classList.remove('hidden');
          throw new Error('NO_API_KEY');
        }
        try {
          const resp = await DeepSeek.generatePrompt({
            userText: textForPrompt,
            style:    $('#promptStyle').value,
            lang:     outLang,
            onStatus: (msg) => { setStatus(msg); showHourglassSpinner(msg); },
          });
          result = resp.result;
          // Показуємо інфо про використані токени
          if (resp.tokens) {
            const t = resp.tokens;
            console.info(`[DeepSeek] domain:${resp.domain} | in:${t.prompt_tokens} out:${t.completion_tokens} total:${t.total_tokens}`);
          }
        } catch (dsErr) {
          const friendly = DeepSeek.friendlyError(dsErr);
          throw new Error(friendly);
        }
      } else {
        // ── Локальний Python движок (Pyodide) ──
        if (!pyodide) throw new Error(window.Lang ? Lang.t('status.waitPyodide') : 'Pyodide not ready');
        pyodide.globals.set('_user_text', textForPrompt);
        pyodide.globals.set('_style', $('#promptStyle').value);
        pyodide.globals.set('_lang', outLang);
        result = await pyodide.runPythonAsync(`generate_prompt(_user_text, _style, _lang)`);

        // The local engine doesn't embed a target-AI language directive —
        // prepend one so the executing AI answers in the intended language.
        if (result) {
          const LN = { uk: 'Ukrainian', en: 'English', es: 'Spanish', de: 'German', fr: 'French', pl: 'Polish' };
          const name = LN[outLang] || 'English';
          result = `IMPORTANT: Write the entire final response in ${name}, regardless of the language of these instructions.\n\n` + result;
        }
      }

      renderPromptOutput(result);
      $('#checkInput').value = result;
      toast(window.Lang ? Lang.t('toast.promptGenerated') : 'Prompt generated!', 'success');

    } catch (e) {
      toast((window.Lang ? Lang.t('toast.errorGeneric') : 'Error:') + ' ' + e.message, 'error');
    } finally {
      hideHourglassSpinner();
      setStatus(Lang ? Lang.t('status.ready') : 'Ready', true);
      btn.disabled = false;
      btn.textContent = Lang ? Lang.t('p1.btn.generate') : 'Generate Prompt';
    }
  });

  $('#btnClearPrompt').addEventListener('click', () => {
    $('#promptInput').value = '';
    clearPromptOutput();
  });

  $('#btnCopyPrompt').addEventListener('click', async () => {
    const raw = $('#promptOutputRaw');
    const text = raw ? raw.value : '';
    if (!text.trim()) { toast(window.Lang ? Lang.t('toast.noCopy') : 'Nothing to copy', 'error'); return; }
    await navigator.clipboard.writeText(text);
    toast(window.Lang ? Lang.t('toast.copied') : 'Copied!', 'success');
  });

  $('#btnSavePrompt').addEventListener('click', () => {
    const raw = $('#promptOutputRaw');
    const text = raw ? raw.value : '';
    if (!text.trim()) { toast(window.Lang ? Lang.t('toast.noSave') : 'Nothing to save', 'error'); return; }
    appSaveFile('claude-prompt-' + Date.now() + '.md', text, 'text/markdown');
  });

  // ── View tabs: Rendered / Raw ──
  document.querySelectorAll('.output-view-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.output-view-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      const view = tab.dataset.view;
      if (view === 'raw') {
        $('#promptOutput').classList.add('hidden');
        $('#promptOutputRaw').classList.remove('hidden');
      } else {
        $('#promptOutputRaw').classList.add('hidden');
        $('#promptOutput').classList.remove('hidden');
      }
    });
  });
}

/** Рендерить markdown у #promptOutput та зберігає raw у #promptOutputRaw */
function renderPromptOutput(mdText) {
  const rendered = $('#promptOutput');
  const rawEl    = $('#promptOutputRaw');

  if (!mdText || !mdText.trim()) {
    clearPromptOutput();
    return;
  }

  // Raw завжди зберігаємо
  if (rawEl) rawEl.value = mdText;

  // Rendered через marked.js якщо доступний; HTML завжди санітизується DOMPurify
  // (текст промту може містити довільну розмітку від користувача або AI).
  if (rendered) {
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
      marked.setOptions({
        breaks: true,
        gfm:    true,
      });
      rendered.innerHTML = DOMPurify.sanitize(marked.parse(mdText));
      rendered.querySelectorAll('pre code').forEach(block => {
        block.style.display = 'block';
      });
    } else {
      // fallback: plain text з базовим форматуванням
      rendered.textContent = mdText;
    }
    // Прибрати placeholder
    const ph = rendered.querySelector('.output-placeholder');
    if (ph) ph.remove();
  }
}

function clearPromptOutput() {
  const rendered = $('#promptOutput');
  const rawEl    = $('#promptOutputRaw');
  if (rendered) rendered.innerHTML = '<span class="output-placeholder">' + (window.Lang ? Lang.t('p1.output.empty') : 'The generated prompt in Markdown format will appear here…') + '</span>';
  if (rawEl)    rawEl.value = '';
}

function initConverterPanel() {
  const dropZone = $('#dropZone');
  const fileInput = $('#fileInput');
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', e => handleFiles(e.target.files));
}

async function handleFiles(files) {
  // DOCX is converted by the pure-Python (stdlib) converter in PYTHON_CORE, so only
  // PDFs need the Phase 2 packages (pypdf, pdfminer.six, Pillow …).
  const needsPdfPkgs = Array.from(files).some(f => f.name.toLowerCase().endsWith('.pdf'));
  try {
    if (needsPdfPkgs) await ensureConverterPackages();
    else              await initPyodide();
  } catch (e) {
    toast((window.Lang ? Lang.t('toast.errorGeneric') : 'Error:') + ' ' + e.message, 'error');
    return;
  }
  if (!pyodide) { toast(window.Lang ? Lang.t('toast.pyodideNotReady') : 'Pyodide not ready', 'error'); return; }
  const result = $('#convertResult');
  result.innerHTML = '';

  for (const file of files) {
    const isPdf  = file.name.toLowerCase().endsWith('.pdf');
    const isDocx = file.name.toLowerCase().endsWith('.docx');
    if (!isPdf && !isDocx) {
      toast((window.Lang ? Lang.t('toast.unsupportedFmt') : 'Unsupported format') + ': ' + file.name, 'error');
      continue;
    }

    const card = document.createElement('div');
    card.className = 'card';
    card.style.marginBottom = '14px';
    card.innerHTML = `<h2>${escapeHtml(file.name)}</h2>
      <p class="subtitle">${window.Lang ? Lang.t('p2.processing') : 'Processing…'}</p>
      <div class="output-box" style="min-height:100px;">
        <span class="loader"></span> ${window.Lang ? Lang.t('p2.converting') : 'Converting…'}
      </div>`;
    result.appendChild(card);

    let md = '';
    try {
      if (isPdf)  md = await _convertPdf(file, card);
      else        md = await _convertDocx(file, card);
      if (!md)    throw new Error(window.Lang ? Lang.t('p2.emptyResult') : 'Empty result');

      card.querySelector('.output-box').textContent = md;
      const kb = (file.size / 1024).toFixed(1);
      card.querySelector('.subtitle').textContent = window.Lang
        ? Lang.t('p2.converted', { chars: md.length.toLocaleString(), kb })
        : `Converted • ${md.length.toLocaleString()} chars • ${kb} KB`;

      const btnRow = document.createElement('div');
      btnRow.className = 'btn-row';
      btnRow.innerHTML = `
        <button class="btn btn-secondary">${window.Lang ? Lang.t('p2.btn.copy') : 'Copy'}</button>
        <button class="btn btn-primary" data-i18n="p3.btn.save">Save .md</button>
        <button class="btn btn-secondary">${window.Lang ? Lang.t('p2.btn.openInEditor') : 'Open in Editor'}</button>`;
      btnRow.children[0].onclick = async () => {
        await navigator.clipboard.writeText(md);
        toast(window.Lang ? Lang.t('toast.copied') : 'Copied!', 'success');
      };
      btnRow.children[1].onclick = () => {
        // appSaveFile shows its own success toast once the file is actually saved
        appSaveFile(file.name.replace(/\.(pdf|docx)$/i, '.md'), md, 'text/markdown');
      };
      btnRow.children[2].onclick = () => {
        $('#mdEditor').value = md;
        if (window.updatePreview) updatePreview();
        $$('.tab')[2].click();
        toast(window.Lang ? Lang.t('toast.openedEditor') : 'Opened in editor', 'success');
      };
      card.appendChild(btnRow);
    } catch (e) {
      card.querySelector('.output-box').textContent = window.Lang ? Lang.t('p2.error', { msg: e.message }) : 'Error: ' + e.message;
      card.querySelector('.subtitle').textContent = window.Lang ? Lang.t('p2.conversionFailed') : 'Conversion failed';
      hideHourglassSpinner();
    }
  }
}

let _pdf2mdFn = null;

async function _loadPdf2md() {
  if (_pdf2mdFn) return _pdf2mdFn;
  try {
    const mod = await import('https://esm.sh/@opendocsg/pdf2md@0.2.7');
    _pdf2mdFn = mod.default || mod.pdf2md || Object.values(mod)[0];
    if (typeof _pdf2mdFn !== 'function') throw new Error('pdf2md not a function');
    return _pdf2mdFn;
  } catch (e) {
    console.warn('@opendocsg/pdf2md load failed:', e.message);
    return null;
  }
}

async function _convertPdf(file, card) {
  const TT = (k, fb) => (window.Lang ? Lang.t(k) : fb);
  const steps = [
    { pct:  5, label: TT('p2.stage.readingPdf', 'Reading PDF…') },
    { pct: 18, label: TT('p2.stage.loadingPdf2md', 'Loading @opendocsg/pdf2md…') },
    { pct: 35, label: TT('p2.stage.parsingStructure', 'pdf2md: parsing PDF structure…') },
    { pct: 55, label: TT('p2.stage.extractingLayout', 'pdf2md: extracting text & layout…') },
    { pct: 72, label: TT('p2.stage.buildingMd', 'pdf2md: building Markdown…') },
    { pct: 90, label: TT('p2.stage.postProcessing', 'Post-processing…') },
    { pct: 98, label: 'Done' },
  ];

  showHourglassSpinner(steps[0].label);
  updateHourglassText(steps[0].label, steps[0].pct);
  const arrayBuf = await file.arrayBuffer();

  updateHourglassText(steps[1].label, steps[1].pct);
  const pdf2mdFn = await _loadPdf2md();

  if (pdf2mdFn) {
    try {
      updateHourglassText(steps[2].label, steps[2].pct);
      await new Promise(r => setTimeout(r, 20));

      updateHourglassText(steps[3].label, steps[3].pct);
      const md = await pdf2mdFn(arrayBuf);

      updateHourglassText(steps[4].label, steps[4].pct);
      await new Promise(r => setTimeout(r, 20));

      updateHourglassText(steps[5].label, steps[5].pct);
      const result = _postProcessPdfMd(md, file.name);

      updateHourglassText(steps[6].label, steps[6].pct);
      hideHourglassSpinner();
      return result;
    } catch (e) {
      console.warn('pdf2md failed, falling back to pdfminer:', e.message);
      toast(window.Lang ? Lang.t('toast.pdf2mdError') : 'pdf2md error — switching to pdfminer fallback', 'error');
    }
  }

  return _convertPdfPdfminer(arrayBuf, file.name);
}

function _postProcessPdfMd(md, filename) {
  if (!md || !md.trim()) return md;
  const base = filename.replace(/\.pdf$/i, '');
  const header = [
    `# ${base}`,
    '',
    `> Converted via @opendocsg/pdf2md  •  ${new Date().toISOString().slice(0,16).replace('T',' ')}`,
    '',
  ].join('\n');

  let cleaned = md.replace(/\n{3,}/g, '\n\n').trim();
  return header + cleaned + '\n';
}

async function _convertPdfPdfminer(arrayBuf, filename) {
  const TT = (k, fb) => (window.Lang ? Lang.t(k) : fb);
  const steps = [
    { pct: 10, label: TT('p2.stage.preparingBytes', 'pdfminer: preparing bytes…') },
    { pct: 28, label: TT('p2.stage.pageAnalysis', 'pdfminer: page analysis…') },
    { pct: 48, label: TT('p2.stage.headingDetection', 'pdfminer: heading detection…') },
    { pct: 68, label: TT('p2.stage.tableDetection', 'pdfminer: table detection…') },
    { pct: 85, label: TT('p2.stage.buildingMdPdfminer', 'pdfminer: building Markdown…') },
    { pct: 97, label: TT('p2.stage.postProcessing', 'Post-processing…') },
  ];

  updateHourglassText(steps[0].label, steps[0].pct);

  // Pass the buffer straight to Pyodide (no serialization into Python source)
  pyodide.globals.set('_js_bytes', new Uint8Array(arrayBuf));
  pyodide.runPython('_bytes = _js_bytes.to_bytes()\ndel _js_bytes');
  pyodide.globals.set('_fname', filename);

  for (let s = 1; s < steps.length; s++) {
    updateHourglassText(steps[s].label, steps[s].pct);
    await new Promise(r => setTimeout(r, 35));
  }

  const md = await pyodide.runPythonAsync(`pdf_to_md(_bytes, _fname)`);
  hideHourglassSpinner();
  return md;
}

async function _convertDocx(file, card) {
  const TT = (k, fb) => (window.Lang ? Lang.t(k) : fb);
  const steps = [
    { pct:  5, label: TT('p2.stage.readingDocx', 'Reading DOCX…') },
    { pct: 22, label: TT('p2.stage.preparingBytesDocx', 'Preparing bytes…') },
    { pct: 42, label: TT('p2.stage.parsingParagraphs', 'Parsing paragraphs & styles…') },
    { pct: 62, label: TT('p2.stage.convertingTables', 'Converting tables…') },
    { pct: 80, label: TT('p2.stage.inlineFormatting', 'Inline formatting…') },
    { pct: 96, label: TT('p2.stage.postProcessing', 'Post-processing…') },
  ];

  showHourglassSpinner(steps[0].label);
  updateHourglassText(steps[1].label, steps[1].pct);

  // Pass the buffer straight to Pyodide (no serialization into Python source)
  pyodide.globals.set('_js_bytes', new Uint8Array(await file.arrayBuffer()));
  pyodide.runPython('_bytes = _js_bytes.to_bytes()\ndel _js_bytes');
  pyodide.globals.set('_fname', file.name);

  for (let s = 2; s < steps.length; s++) {
    updateHourglassText(steps[s].label, steps[s].pct);
    await new Promise(r => setTimeout(r, 35));
  }

  const md = await pyodide.runPythonAsync(`docx_to_md(_bytes, _fname)`);
  hideHourglassSpinner();
  return md;
}

function initEditorPanel() {
  const mdEditor = $('#mdEditor');

  function updatePreview() {
    const md = mdEditor.value;
    // Full GFM (tables, links, nested lists, <sup>/<sub>) via marked, sanitized by DOMPurify
    if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
      $('#mdPreview').innerHTML = DOMPurify.sanitize(marked.parse(md, { gfm: true, breaks: true }));
      return;
    }
    // Fallback: minimal Python renderer (escapes HTML except a safe inline-tag whitelist)
    if (!pyodide) { $('#mdPreview').textContent = window.Lang ? Lang.t('status.processing') : 'Processing…'; return; }
    pyodide.globals.set('_md', md);
    pyodide.runPythonAsync(`_html = md_to_html(_md)`).then(() => {
      $('#mdPreview').innerHTML = pyodide.globals.get('_html');
    });
  }

  window.updatePreview = updatePreview;

  mdEditor.addEventListener('input', updatePreview);

  $('#btnLoadMd').addEventListener('click', () => $('#mdFileInput').click());
  $('#mdFileInput').addEventListener('change', async e => {
    const file = e.target.files[0];
    if (!file) return;
    mdEditor.value = await file.text();
    updatePreview();
    toast((window.Lang ? Lang.t('toast.fileLoaded') : 'File loaded:') + ' ' + file.name, 'success');
  });

  $('#btnSaveMd').addEventListener('click', () => {
    const text = mdEditor.value;
    if (!text.trim()) { toast(window.Lang ? Lang.t('toast.emptyFile') : 'Empty file', 'error'); return; }
    appSaveFile('document-' + Date.now() + '.md', text, 'text/markdown');
  });

  $('#btnSaveLocal').addEventListener('click', async () => {
    const text = mdEditor.value;
    if (!text.trim()) { toast(window.Lang ? Lang.t('toast.emptyFile') : 'Empty file', 'error'); return; }
    const name = await appSaveLocal(
      window.Lang ? Lang.t('dialog.saveLocalTitle') : 'Save to local storage',
      'document-' + Date.now()
    );
    if (!name) return;
    const files = JSON.parse(localStorage.getItem('pf_files') || '{}');
    files[name + '.md'] = { content: text, saved: new Date().toISOString() };
    localStorage.setItem('pf_files', JSON.stringify(files));
    renderLocalFiles();
    toast(window.Lang ? Lang.t('toast.savedLocal') : 'Saved to local storage', 'success');
  });

  renderLocalFiles();
}

function renderLocalFiles() {
  const list = $('#localFiles');
  const files = JSON.parse(localStorage.getItem('pf_files') || '{}');
  const entries = Object.entries(files);

  if (!entries.length) {
    list.innerHTML = '<p style="color:var(--text-dim); font-size:13px; padding:10px;">' + (window.Lang ? Lang.t('checker.noSavedFiles') : 'No saved files') + '</p>';
    return;
  }

  list.innerHTML = entries.map(([name, data]) =>
    `<div class="file-item">
      <span class="name">${escapeHtml(name)}</span>
      <span class="meta">${new Date(data.saved).toLocaleString('uk')}</span>
      <button class="btn btn-ghost file-btn-load" data-load="${escapeHtml(name)}"
              title="${window.Lang ? Lang.t('p3.btn.load') : 'Load'}">&#128193;</button>
      <button class="btn btn-ghost file-btn-del" data-del="${escapeHtml(name)}"
              title="${window.Lang ? Lang.t('p3.btn.delete') : 'Delete'}">&#128465;</button>
    </div>`
  ).join('');

  list.querySelectorAll('[data-load]').forEach(b => b.onclick = () => {
    const key = b.dataset.load;
    if (!key || !files[key]) return;
    $('#mdEditor').value = files[key].content;
    if (window.updatePreview) window.updatePreview();
    toast((window.Lang ? Lang.t('toast.loaded') : 'Loaded:') + ' ' + key, 'success');
  });

  list.querySelectorAll('[data-del]').forEach(b => b.onclick = async () => {
    const fileName = b.dataset.del;
    if (!fileName) return;
    const ok = await appConfirm((window.Lang ? Lang.t('dialog.delete') : 'Delete') + ' ' + fileName + '?');
    if (!ok) return;
    const latest = JSON.parse(localStorage.getItem('pf_files') || '{}');
    delete latest[fileName];
    localStorage.setItem('pf_files', JSON.stringify(latest));
    renderLocalFiles();
    toast(window.Lang ? Lang.t('toast.deleted') : 'Deleted', 'success');
  });
}

let currentErrors = [];
let currentText   = '';
let fixedText     = '';

function _updateCheckActions() {
  const row = $('#checkActionRow');
  if (!row) return;
  if (fixedText) {
    row.style.display = 'flex';
  } else {
    row.style.display = 'none';
  }
}

function initCheckerPanel() {
  $('#btnCheck').addEventListener('click', async () => {
    // Phase 3: ensure spell-checker package is installed before first check
    try {
      await ensureCheckerPackages();
    } catch (e) {
      hideHourglassSpinner();
      toast((window.Lang ? Lang.t('toast.errorGeneric') : 'Error:') + ' ' + e.message, 'error');
      return;
    }
    if (!pyodide) { toast(window.Lang ? Lang.t('toast.pyodideNotReady') : 'Pyodide not ready', 'error'); return; }
    const text = $('#checkInput').value;
    if (!text.trim()) { toast(window.Lang ? Lang.t('toast.noText') : 'Enter text first', 'error'); return; }
    currentText = text;
    const btn = $('#btnCheck');
    btn.disabled = true;
    btn.innerHTML = '<span class="loader"></span> ' + (window.Lang ? Lang.t('checker.checking') : 'Checking…');

    const stages = [
      { label: window.Lang ? Lang.t('spinner.detecting') : 'Detecting repetitions…',    pct:  8 },
      { label: window.Lang ? Lang.t('spinner.spaces') : 'Spaces and indents…',          pct: 18 },
      { label: window.Lang ? Lang.t('spinner.punctuation') : 'Punctuation and quotes…', pct: 30 },
      { label: window.Lang ? Lang.t('spinner.vocabulary') : 'Vocabulary check…',        pct: 42 },
      { label: window.Lang ? Lang.t('spinner.spelling') : 'Spell check (EN)…',          pct: 55 },
      { label: window.Lang ? Lang.t('spinner.grammar') : 'Grammar check…',             pct: 67 },
      { label: window.Lang ? Lang.t('spinner.style') : 'Style and clichés…',           pct: 78 },
      { label: window.Lang ? Lang.t('spinner.passive') : 'Passive voice…',             pct: 87 },
      { label: window.Lang ? Lang.t('spinner.structure') : 'Prompt structure…',        pct: 94 },
    ];

    showHourglassSpinner(stages[0].label);

    try {
      pyodide.globals.set('_text', text);

      updateHourglassText(stages[0].label, stages[0].pct);
      const r1 = await pyodide.runPythonAsync(`import json; json.dumps(check_stage_repeats(_text))`);

      updateHourglassText(stages[1].label, stages[1].pct);
      const r2 = await pyodide.runPythonAsync(`json.dumps(check_stage_spaces(_text))`);

      updateHourglassText(stages[2].label, stages[2].pct);
      const r3 = await pyodide.runPythonAsync(`json.dumps(check_stage_punct(_text))`);

      const lang = await pyodide.runPythonAsync(`detect_language(_text)`);
      pyodide.globals.set('_lang_detected', lang);

      updateHourglassText(stages[3].label, stages[3].pct);
      const r4 = await pyodide.runPythonAsync(`json.dumps(check_stage_dict(_text, _lang_detected))`);

      updateHourglassText(stages[4].label, stages[4].pct);
      const prior = JSON.parse(r1).concat(JSON.parse(r2), JSON.parse(r3), JSON.parse(r4));
      pyodide.globals.set('_prior_errors', pyodide.toPy(prior));
      const r5 = await pyodide.runPythonAsync(`json.dumps(check_stage_spellcheck(_text, _lang_detected, _prior_errors))`);

      updateHourglassText(stages[5].label, stages[5].pct);
      const r6 = await pyodide.runPythonAsync(`json.dumps(check_stage_grammar(_text, _lang_detected))`);

      updateHourglassText(stages[6].label, stages[6].pct);
      const r7 = await pyodide.runPythonAsync(`json.dumps(check_stage_style(_text, _lang_detected))`);

      updateHourglassText(stages[7].label, stages[7].pct);
      const r8 = await pyodide.runPythonAsync(`json.dumps(check_stage_passive(_text, _lang_detected))`);

      updateHourglassText(stages[8].label, stages[8].pct);
      const r9 = await pyodide.runPythonAsync(`json.dumps(check_stage_structure(_text, _lang_detected))`);

      updateHourglassText(window.Lang ? Lang.t('status.buildingResults') : 'Building results…', 99);
      const allErrors = prior.concat(
        JSON.parse(r5), JSON.parse(r6), JSON.parse(r7), JSON.parse(r8), JSON.parse(r9)
      );
      pyodide.globals.set('_all_errors', pyodide.toPy(allErrors));
      const mergedJson = await pyodide.runPythonAsync(`json.dumps(check_merge(_all_errors))`);

      const result = { errors: JSON.parse(mergedJson), lang };
      currentErrors = result.errors;
      renderCheckResults(result);

    } catch (e) {
      toast((window.Lang ? Lang.t('toast.errorGeneric') : 'Error:') + ' ' + e.message, 'error');
    } finally {
      hideHourglassSpinner();
      btn.disabled = false;
      btn.textContent = window.Lang ? Lang.t('p4.btn.check') : 'Check';
    }
  });

  $('#btnApplyFixes').addEventListener('click', async () => {
    if (!currentErrors.length) { toast(window.Lang ? Lang.t('toast.noErrorsToFix') : 'No errors to fix', 'error'); return; }
    showHourglassSpinner(window.Lang ? Lang.t('status.applyingFixes') : 'Applying fixes…');
    try {
      pyodide.globals.set('_fix_text',   currentText);
      pyodide.globals.set('_fix_errors', pyodide.toPy(currentErrors));
      const fixed = await pyodide.runPythonAsync(`apply_all_fixes(_fix_text, _fix_errors)`);
      currentText   = fixed;
      currentErrors = [];
      fixedText     = fixed;
      $('#checkInput').value = fixed;
      renderCheckResults({ errors: [], lang: detectLang(fixed) });
      _updateCheckActions();
      toast(window.Lang ? Lang.t('toast.applied') : 'All fixes applied!', 'success');
    } catch (e) {
      toast((window.Lang ? Lang.t('toast.errorGeneric') : 'Error:') + ' ' + e.message, 'error');
    } finally {
      hideHourglassSpinner();
    }
  });

  $('#btnSaveFixed').addEventListener('click', () => {
    if (!fixedText) { toast(window.Lang ? Lang.t('toast.noFixedSave') : 'No corrected text to save', 'error'); return; }
    const filename = 'fixed-' + new Date().toISOString().slice(0,19).replace(/[:T]/g, '-') + '.md';
    appSaveFile(filename, fixedText, 'text/markdown');
  });

  $('#btnCopyFixed').addEventListener('click', async () => {
    if (!fixedText) { toast(window.Lang ? Lang.t('toast.noFixedCopy') : 'No corrected text to copy', 'error'); return; }
    try {
      await navigator.clipboard.writeText(fixedText);
      toast(window.Lang ? Lang.t('toast.fixedCopied') : 'Corrected text copied', 'success');
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = fixedText;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast(window.Lang ? Lang.t('toast.copiedFallback') : 'Copied (fallback)', 'success');
    }
  });

  $('#btnClearCheck').addEventListener('click', () => {
    $('#checkInput').value = '';
    $('#checkResult').innerHTML = '';
    ['statWords', 'statSent', 'statErr', 'statTokens'].forEach(id => $('#' + id).textContent = '0');
    $('#statQual').textContent = '—';
    delete $('#statQual').dataset.quality;
    currentErrors = [];
    currentText   = '';
    fixedText     = '';
    _updateCheckActions();
  });
}

function renderCheckResults(result) {
  const errors = result.errors;
  const text = currentText;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim()).length;

  $('#statWords').textContent = words;
  $('#statSent').textContent = sentences;
  $('#statErr').textContent = errors.length;

  pyodide.globals.set('_check_text', text);
  const tokens = pyodide.runPython(`count_claude_tokens(_check_text)`);
  $('#statTokens').textContent = tokens.toLocaleString();

  let quality = window.Lang ? Lang.t('quality.excellent') : 'Excellent', qColor = 'var(--ok)', qKey = 'excellent';
  const ratio = errors.length / Math.max(words, 1);
  if (ratio > 0.1) { quality = window.Lang ? Lang.t('quality.needsWork') : 'Needs improvement'; qColor = 'var(--error)'; qKey = 'needsWork'; }
  else if (ratio > 0.05) { quality = window.Lang ? Lang.t('quality.satisf') : 'Satisfactory'; qColor = 'var(--warn)'; qKey = 'satisf'; }
  else if (ratio > 0.02) { quality = window.Lang ? Lang.t('quality.good') : 'Good'; qColor = 'var(--accent-2)'; qKey = 'good'; }
  else if (errors.length === 0) { quality = window.Lang ? Lang.t('quality.flawless') : 'Flawless'; qKey = 'flawless'; }

  $('#statQual').textContent = quality;
  $('#statQual').style.color = qColor;
  // Language-neutral key saved as prompts.quality_score (VARCHAR(20))
  $('#statQual').dataset.quality = qKey;

  let highlighted = '';
  let last = 0;
  const sorted = [...errors].sort((a, b) => a.pos - b.pos);

  for (const e of sorted) {
    highlighted += escapeHtml(text.slice(last, e.pos));
    highlighted += `<span class="highlight-error" title="${escapeHtml(e.msg)}" data-idx="${errors.indexOf(e)}">${escapeHtml(text.slice(e.pos, e.end))}</span>`;
    last = e.end;
  }
  highlighted += escapeHtml(text.slice(last));

  const resultDiv = $('#checkResult');
  resultDiv.innerHTML = `
    <div class="card">
      <h2>${window.Lang ? Lang.t('p4.heading.highlighted') : 'Highlighted text'}</h2>
      <p class="subtitle">${window.Lang ? Lang.t('checker.lang') : 'Language:'} ${result.lang === 'uk' ? (window.Lang ? Lang.t('checker.langUk') : 'Ukrainian') : (window.Lang ? Lang.t('checker.langEn') : 'English')}</p>
      <div class="output-box" style="font-family:inherit; line-height:1.8;">${highlighted || '<span style="color:var(--text-dim)">' + (window.Lang ? Lang.t('checker.empty') : 'Empty') + '</span>'}</div>
    </div>
    <div class="card" style="margin-top:14px;">
      <h2>${window.Lang ? Lang.t('p4.heading.errors') : 'Errors found'} (${errors.length})</h2>
      <div id="errorList" style="margin-top:10px;"></div>
    </div>
  `;

  const errList = $('#errorList');
  if (!errors.length) {
    errList.innerHTML = (window.Lang ? '<p style="color:var(--ok); font-size:14px;">' + Lang.t('toast.noErrors') + '</p>' : '<p style="color:var(--ok); font-size:14px;">No errors found!</p>');
  } else {
    const TYPE_LABELS = {
      repeat: window.Lang ? Lang.t('err.repeat') : 'Repeat',
      space: window.Lang ? Lang.t('err.space') : 'Space',
      punct: window.Lang ? Lang.t('err.punct') : 'Punctuation',
      capital: window.Lang ? Lang.t('err.capital') : 'Case',
      spelling: window.Lang ? Lang.t('err.spelling') : 'Spelling',
      grammar: window.Lang ? Lang.t('err.grammar') : 'Grammar',
      style: window.Lang ? Lang.t('err.style') : 'Style',
      passive: window.Lang ? Lang.t('err.passive') : 'Passive voice',
      structure: window.Lang ? Lang.t('err.structure') : 'Structure',
    };
    const TYPE_COLORS = {
      repeat: 'var(--warn)', space: 'var(--text-dim)', punct: 'var(--warn)',
      capital: 'var(--accent-2)', spelling: 'var(--error)', grammar: 'var(--error)',
      style: '#ce93d8', passive: '#ffb74d', structure: 'var(--accent)',
    };

    // Static suggestion markers coming from python_core.js (language-agnostic
    // placeholders like "(remove)") get mapped to their translation key here,
    // since the Python layer cannot know the current UI language.
    const SUGG_STATIC_KEYS = {
      '(видалити)': 'err.suggRemove',
      '(спростити)': 'err.suggSimplify',
      '(активний стан)': 'err.suggActiveVoice',
    };
    function translateSugg(s) {
      const key = SUGG_STATIC_KEYS[s];
      return key && window.Lang ? Lang.t(key) : s;
    }

    errList.innerHTML = errors.map((e, i) => {
      const typeLabel = TYPE_LABELS[e.type] || e.type;
      const typeColor = TYPE_COLORS[e.type] || 'var(--text-dim)';
      const hasFix = e.suggestions.length && e.pos !== e.end;
      const msgText = (window.Lang && e.msg_key) ? Lang.t(e.msg_key, e.msg_args) : e.msg;
      const noFixText = (window.Lang && e.sugg_key)
        ? Lang.t(e.sugg_key, e.sugg_args)
        : translateSugg(e.suggestions[0] || '');
      return `<div class="error-item">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;">
          <span style="background:${typeColor};color:#000;padding:1px 7px;border-radius:5px;font-size:11px;font-weight:700;">${typeLabel}</span>
          <strong>${escapeHtml(msgText)}</strong>
          ${e.pos !== e.end ? `<span class="err-pos">• ${window.Lang ? Lang.t('checker.position', { n: e.pos }) : 'position ' + e.pos}</span>` : ''}
        </div>
        <div style="margin-top:6px;">
          ${e.pos !== e.end ? `${window.Lang ? Lang.t('checker.found') : 'Found:'} <span class="err-word">${escapeHtml(e.word)}</span> → ` : ''}
          ${hasFix
            ? e.suggestions.map(s => `<span class="err-sugg" data-idx="${i}" data-sugg="${escapeHtml(s)}">${escapeHtml(translateSugg(s))}</span>`).join(' ')
            : `<em style="color:var(--text-dim)">${escapeHtml(noFixText)}</em>`
          }
        </div>
      </div>`;
    }).join('');

    errList.querySelectorAll('.err-sugg').forEach(s => {
      s.onclick = () => applySuggestion(parseInt(s.dataset.idx), s.dataset.sugg);
    });
  }
}

function applySuggestion(idx, sugg) {
  const e = currentErrors[idx];
  if (!e) return;
  // Markers mirror apply_all_fixes() in python_core.js: advisory hints never
  // replace text, '(видалити)' removes the word plus one preceding space.
  if (sugg === '(спростити)' || sugg === '(активний стан)') {
    toast(window.Lang ? Lang.t('toast.adviceOnly') : 'This is a style hint — edit the text manually', '');
    return;
  }
  let start = e.pos;
  let replacement = sugg;
  if (sugg === '(видалити)') {
    replacement = '';
    if (start > 0 && currentText[start - 1] === ' ') start -= 1;
  }
  const before = currentText.slice(0, start);
  const after = currentText.slice(e.end);
  currentText = before + replacement + after;
  const diff = replacement.length - (e.end - start);
  for (let i = idx + 1; i < currentErrors.length; i++) {
    currentErrors[i].pos += diff;
    currentErrors[i].end += diff;
  }
  currentErrors.splice(idx, 1);
  fixedText = currentText;
  $('#checkInput').value = currentText;
  renderCheckResults({ errors: currentErrors, lang: detectLang(currentText) });
  _updateCheckActions();
  toast(window.Lang ? Lang.t('toast.fixApplied') : 'Fix applied', 'success');
}

function setupManifest() {}

let deferredInstallPrompt = null;

/* ── Custom Install Modal ────────────────────────────────────── */
function showInstallModal(onInstall, onCancel) {
  // Remove any existing modal
  const existing = document.getElementById('installModal');
  if (existing) existing.remove();

  const T = k => (window.Lang ? Lang.t(k) : null) || k;

  const overlay = document.createElement('div');
  overlay.id = 'installModal';
  overlay.className = 'modal-overlay install-modal-overlay';
  overlay.setAttribute('role', 'dialog');
  overlay.setAttribute('aria-modal', 'true');
  overlay.setAttribute('aria-labelledby', 'installModalTitle');

  overlay.innerHTML = `
    <div class="modal-box install-modal-box">

      <!-- Header -->
      <div class="install-modal-header">
        <div class="install-modal-icon-wrap">
          <img src="png/js-promt-152x152.png"
               alt="JS PROMPT"
               width="64" height="64"
               class="install-modal-icon">
          <div class="install-modal-icon-glow"></div>
        </div>
        <div class="install-modal-title-wrap">
          <h2 id="installModalTitle" class="install-modal-title">${T('install.title')}</h2>
          <div class="install-modal-domain">
            <span class="install-modal-domain-dot"></span>
            <span>promt.pp.ua</span>
          </div>
        </div>
      </div>

      <!-- Subtitle -->
      <p class="install-modal-subtitle">${T('install.subtitle')}</p>

      <!-- Features -->
      <ul class="install-modal-features">
        <li>
          <span class="install-feature-icon">&#10003;</span>
          <span>${T('install.feature1')}</span>
        </li>
        <li>
          <span class="install-feature-icon">&#10003;</span>
          <span>${T('install.feature2')}</span>
        </li>
        <li>
          <span class="install-feature-icon">&#10003;</span>
          <span>${T('install.feature3')}</span>
        </li>
      </ul>

      <!-- Actions -->
      <div class="install-modal-actions">
        <button class="btn install-btn-cancel" id="installBtnCancel">
          ${T('install.btn.cancel')}
        </button>
        <button class="btn btn-primary install-btn-install" id="installBtnInstall">
          <span class="install-btn-arrow">&#8659;</span>
          ${T('install.btn.install')}
        </button>
      </div>

    </div>`;

  document.body.appendChild(overlay);

  // Animate in
  requestAnimationFrame(() => overlay.classList.add('install-modal-visible'));

  function close() {
    overlay.classList.remove('install-modal-visible');
    setTimeout(() => overlay.remove(), 250);
  }

  document.getElementById('installBtnInstall').addEventListener('click', () => {
    close();
    onInstall();
  });

  document.getElementById('installBtnCancel').addEventListener('click', () => {
    close();
    onCancel();
  });

  overlay.addEventListener('click', e => {
    if (e.target === overlay) { close(); onCancel(); }
  });

  document.addEventListener('keydown', function escHandler(e) {
    if (e.key === 'Escape') {
      close(); onCancel();
      document.removeEventListener('keydown', escHandler);
    }
  });
}

function setupInstallButton() {
  const btn = $('#btnInstall');

  // preventDefault() suppresses the native mini-infobar — intentional PWA pattern.
  // Chrome DevTools: "Banner not shown: preventDefault() called" — expected, not an error.
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredInstallPrompt = e;
    if (btn) btn.classList.add('visible');
  });

  if (!btn) return;

  btn.addEventListener('click', () => {
    if (!deferredInstallPrompt) return;

    // Show our custom modal first; native prompt fires only on Install click
    showInstallModal(
      // onInstall
      async () => {
        if (!deferredInstallPrompt) return;
        btn.disabled = true;
        try {
          const promptEvent = deferredInstallPrompt;
          deferredInstallPrompt = null;
          btn.classList.remove('visible');
          await promptEvent.prompt();
          const { outcome } = await promptEvent.userChoice;
          if (outcome !== 'accepted') {
            deferredInstallPrompt = promptEvent;
            btn.classList.add('visible');
          }
        } catch (err) {
          console.warn('Install prompt error:', err);
        } finally {
          btn.disabled = false;
        }
      },
      // onCancel
      () => { /* user dismissed — keep deferredInstallPrompt for next time */ }
    );
  });

  window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    if (btn) btn.classList.remove('visible');
    toast(window.Lang ? Lang.t('toast.installedPwa') : 'JS PROMPT installed as PWA!', 'success');
  });
}

function setupServiceWorker() {
  if (!('serviceWorker' in navigator) || location.protocol === 'file:') return;
  navigator.serviceWorker.register('./sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.Lang) Lang.init();
  setupManifest();
  setupInstallButton();
  setupServiceWorker();
  initTabs();
  initPromptPanel();
  initConverterPanel();
  initEditorPanel();
  initCheckerPanel();
  initPyodide();
  // DeepSeek UI + fetch key from server .env on startup
  if (typeof DeepSeek !== 'undefined') {
    DeepSeek.initApiKeyBanner();
    DeepSeek.initEngineTabs();
    // Try to load key from server /env endpoint (env-server.js reads .env file).
    // Silently falls back to localStorage if endpoint is unavailable.
    DeepSeek.fetchKeyFromEnv().catch(() => {});
    DeepSeek.initBalanceWidget();
  }

  // ── Ctrl+Shift+K — reveal API Key button and open banner ───────
  // The button is visibility:hidden by default.
  // Shortcut: show button → open banner.
  // Banner close (×, Save, Esc): hide button again.
  document.addEventListener('keydown', e => {
    if (e.ctrlKey && e.shiftKey && e.key === 'K') {
      e.preventDefault();
      // Show the trigger button, then open the API Key modal directly
      if (typeof DeepSeek !== 'undefined') {
        if (DeepSeek.showApiKeyBtn) DeepSeek.showApiKeyBtn();
        if (DeepSeek.openApiKeyModal) DeepSeek.openApiKeyModal();
      }
    }
  });
});