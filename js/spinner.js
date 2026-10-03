/**
 * spinner.js — JS PROMPT PWA
 *
 * Оригінальний API (Phase 3) + розширення: вбудований progress bar
 * з анімацією та великим % — інжектується динамічно в #hourglassIndicator.
 *
 * Публічний API (незмінний):
 *   initHourglassSpinner()
 *   showHourglassSpinner(text?)
 *   hideHourglassSpinner()
 *   updateHourglassText(message, percent?)
 */

(function () {
    'use strict';

    /* ── DOM refs ─────────────────────────────────────────────── */
    var _indicator = null;   // #hourglassIndicator
    var _textEl    = null;   // #hourglassText  (original)
    var _pctEl     = null;   // large % number  (injected)
    var _barWrap   = null;   // progress track  (injected)
    var _bar       = null;   // progress fill   (injected)
    var _ready     = false;

    /* ── Build once, on first use ─────────────────────────────── */
    function _init() {
        if (_ready) return;
        _ready = true;

        _indicator = document.getElementById('hourglassIndicator');
        _textEl    = document.getElementById('hourglassText');
        if (!_indicator || !_textEl) return;

        /* Large percentage number */
        _pctEl = document.createElement('div');
        _pctEl.id = 'sp-pct';
        Object.assign(_pctEl.style, {
            display:      'none',
            fontSize:     '36px',
            fontWeight:   '700',
            color:        '#4fc3f7',
            letterSpacing:'0.03em',
            marginTop:    '12px',
            fontFamily:   "'Play', system-ui, sans-serif",
            lineHeight:   '1',
        });

        /* Progress track */
        _barWrap = document.createElement('div');
        _barWrap.id = 'sp-track';
        Object.assign(_barWrap.style, {
            display:      'none',
            width:        '260px',
            maxWidth:     '78vw',
            height:       '6px',
            background:   'rgba(79,195,247,0.18)',
            borderRadius: '9999px',
            overflow:     'hidden',
            margin:       '10px 0 2px',
        });

        /* Progress fill */
        _bar = document.createElement('div');
        _bar.id = 'sp-fill';
        Object.assign(_bar.style, {
            height:     '100%',
            width:      '0%',
            background: 'linear-gradient(90deg,#0288d1,#29b6f6,#81d4fa)',
            borderRadius:'9999px',
            transition: 'width 0.4s cubic-bezier(.4,0,.2,1)',
            boxShadow:  '0 0 10px rgba(79,195,247,0.6)',
        });
        _barWrap.appendChild(_bar);

        /* Inject BEFORE #hourglassText so layout is:
           [spinning rings]
               36%
           [=========>  ]
           Перевірка пунктуації…          */
        _indicator.insertBefore(_barWrap, _textEl);
        _indicator.insertBefore(_pctEl,   _barWrap);
    }

    /* ── Helpers ──────────────────────────────────────────────── */
    function _showProgress(pct) {
        var p = Math.min(100, Math.max(0, Math.round(pct)));
        if (_pctEl)   { _pctEl.textContent    = p + '%'; _pctEl.style.display   = 'block'; }
        if (_barWrap) { _barWrap.style.display = 'block'; }
        if (_bar)       _bar.style.width       = p + '%';
    }

    function _hideProgress() {
        if (_pctEl)   _pctEl.style.display   = 'none';
        if (_barWrap) _barWrap.style.display  = 'none';
        if (_bar)     _bar.style.width        = '0%';
    }

    /* ── Public API ───────────────────────────────────────────── */

    /** initHourglassSpinner() — no-op, kept for API compatibility */
    function initHourglassSpinner() {}

    /**
     * showHourglassSpinner(text?)
     * Shows overlay; hides progress bar (no % on initial show).
     */
    function showHourglassSpinner(text) {
        _init();
        if (_textEl)    _textEl.textContent   = text || 'Processing\u2026';
        _hideProgress();
        if (_indicator) _indicator.style.display = 'flex';
    }

    /**
     * hideHourglassSpinner()
     * Hides overlay and resets progress.
     */
    function hideHourglassSpinner() {
        _init();
        if (_indicator) _indicator.style.display = 'none';
        _hideProgress();
    }

    /**
     * updateHourglassText(message, percent?)
     * Updates label; if percent given → shows % + progress bar.
     * Compatible with original: without percent just updates text.
     */
    function updateHourglassText(message, percent) {
        _init();
        if (_textEl) _textEl.textContent = message;

        if (percent != null) {
            _showProgress(percent);
        } else {
            _hideProgress();
        }
    }

    /* ── Export ───────────────────────────────────────────────── */
    window.initHourglassSpinner  = initHourglassSpinner;
    window.showHourglassSpinner  = showHourglassSpinner;
    window.hideHourglassSpinner  = hideHourglassSpinner;
    window.updateHourglassText   = updateHourglassText;

})();
