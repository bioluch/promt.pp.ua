/**
 * voice_translate.js — JS PROMPT PWA
 * Client-side voice input (Whisper) and translation (Helsinki-NLP) via @xenova/transformers
 * Supports: English, Ukrainian, Spanish
 */
'use strict';

(function () {

  /* ── CDN import shim ─────────────────────────────────────────── */
  // @huggingface/transformers v3 — нова назва пакету (Xenova застарів)
  // Моделі завантажуються без авторизації через публічний CDN HuggingFace
  const TRANSFORMERS_URL = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.5.0/dist/transformers.min.js';

  let _transformers = null;
  let _transformersLoading = null;

  async function loadTransformers() {
    if (_transformers) return _transformers;
    if (_transformersLoading) return _transformersLoading;
    _transformersLoading = (async () => {
      try {
        const mod = await import(TRANSFORMERS_URL);
        _transformers = mod;
        // Налаштування для @huggingface/transformers v3
        if (mod.env) {
          mod.env.allowLocalModels = false;
          mod.env.useBrowserCache  = true;
        }

        // Пригнічуємо бібліотечні варнінги (MarianTokenizer, content-length тощо)
        _suppressLibraryWarnings();

        return mod;
      } catch (e) {
        _transformersLoading = null;
        throw new Error('Could not load @huggingface/transformers: ' + e.message);
      }
    })();
    return _transformersLoading;
  }

  /* ── Пригнічення бібліотечних варнінгів ────────────────────── */

  // Фільтруємо відомі нешкідливі попередження від transformers/ort/hub
  const _SUPPRESSED = [
    'MarianTokenizer',
    'Unable to determine content-length',
    'dtype not specified',
    'powerPreference option is currently ignored',
    'Removing initializer',
  ];

  function _suppressLibraryWarnings() {
    const _origWarn = console.warn.bind(console);
    console.warn = function(...args) {
      const msg = args.join(' ');
      if (_SUPPRESSED.some(s => msg.includes(s))) return;
      _origWarn(...args);
    };
  }

  // Запускаємо одразу — деякі варнінги з'являються ще до завантаження моделі
  _suppressLibraryWarnings();

  /* ── Pipeline cache ─────────────────────────────────────────── */
  const _pipelines = {};

  async function getPipeline(task, model, progressCb, extraOpts = {}) {
    const key = task + '|' + model;
    if (_pipelines[key]) return _pipelines[key];
    const { pipeline } = await loadTransformers();
    _pipelines[key] = await pipeline(task, model, {
      progress_callback: progressCb || null,
      ...extraOpts,
    });
    return _pipelines[key];
  }

  /* ═══════════════════════════════════════════════════════════════
     LANGUAGE DETECTION (heuristic — no model needed)
     ═══════════════════════════════════════════════════════════════ */

  /**
   * detectTextLanguage(text) → 'uk' | 'es' | 'en'
   * Heuristic: count characteristic characters / n-grams.
   */
  function detectTextLanguage(text) {
    if (!text || !text.trim()) return 'en';
    const s = text.toLowerCase();

    // Ukrainian: Cyrillic + specific letters (і ї є ґ)
    const ukSpecific = (s.match(/[іїєґ]/g) || []).length;
    const cyrillic   = (s.match(/[а-яёіїєґ]/g) || []).length;

    // Spanish: characteristic characters + common words
    const esChars    = (s.match(/[áéíóúüñ¿¡]/g) || []).length;
    const esWords    = (s.match(/\b(el|la|los|las|que|de|en|un|una|con|por|para|como|del|más|pero|este|esta|son|está|tengo|quiero|hacer|hola|gracias|cómo|qué|cuándo|dónde|sí|no)\b/gi) || []).length;

    // Latin alphabet (English proxy)
    const latin      = (s.match(/[a-z]/g) || []).length;

    // Scoring
    const ukScore = cyrillic * 2 + ukSpecific * 3;
    const esScore = esChars * 4 + esWords * 2;
    const enScore = latin;

    if (ukScore > esScore && ukScore > enScore * 0.4) return 'uk';
    if (esScore > 3 || (esChars > 0 && esWords > 0)) return 'es';
    if (cyrillic > latin) return 'uk';
    return 'en';
  }

  window.VT_detectLang = detectTextLanguage;

  /* ═══════════════════════════════════════════════════════════════
     TRANSLATION
     ═══════════════════════════════════════════════════════════════ */

  // У @huggingface/transformers v3 моделі Xenova перейменовані на onnx-community
  // або використовуються безпосередньо через Helsinki-NLP
  const TRANSLATE_MODELS = {
    uk: [
      'Xenova/opus-mt-uk-en',                    // основна — коротка назва
      'Helsinki-NLP/opus-mt-uk-en',              // резервна — оригінальна Helsinki
    ],
    es: [
      'Xenova/opus-mt-es-en',
      'Helsinki-NLP/opus-mt-es-en',
    ],
  };

  let _translateStatus = null; // callback(msg)

  function setTranslateStatusCb(cb) { _translateStatus = cb; }

  function _tStatus(msg) {
    if (_translateStatus) _translateStatus(msg);
    console.log('[VT translate]', msg);
  }

  /**
   * translateToEnglish(text) → Promise<string>
   * Translates Ukrainian or Spanish text to English.
   * Returns the original text unchanged if already English.
   */
  async function translateToEnglish(text, forceLang) {
    if (!text || !text.trim()) return text;

    const lang = forceLang || detectTextLanguage(text);
    if (lang === 'en') return text;  // already English

    const models = TRANSLATE_MODELS[lang];
    if (!models || !models.length) {
      console.warn('[VT] No translation model for lang:', lang);
      return text;
    }

    _tStatus(`Loading translation model (${lang.toUpperCase()}→EN)…`);

    // Спробувати кожну модель по черзі — перша успішна виграє
    let pipe = null;
    let lastErr = null;
    for (const modelName of models) {
      try {
        _tStatus(`Завантаження моделі: ${modelName}…`);
        let lastPct = 0;
        pipe = await getPipeline('translation', modelName, (p) => {
          if (p && p.progress !== undefined) {
            const pct = Math.round(p.progress);
            if (pct !== lastPct) {
              lastPct = pct;
              _tStatus(`Завантаження моделі перекладу… ${pct}%`);
            }
          }
        }, { dtype: 'q8' });
        console.log('[VT] Translation model loaded:', modelName);
        break; // успішно — виходимо з циклу
      } catch (e) {
        console.warn(`[VT] Model "${modelName}" failed:`, e.message);
        lastErr = e;
        // видалити з кешу щоб наступна спроба починалась чисто
        const key = 'translation|' + modelName;
        delete _pipelines[key];
        pipe = null;
      }
    }

    if (!pipe) {
      throw new Error('Всі моделі перекладу недоступні: ' + (lastErr ? lastErr.message : 'unknown'));
    }

    _tStatus('Перекладаю текст…');
    // Break long texts into ≤400-char chunks on sentence boundary
    const chunks = _splitIntoChunks(text, 400);
    const translated = [];
    for (const chunk of chunks) {
      const out = await pipe(chunk, { max_new_tokens: 512 });
      // v3 може повертати масив або об'єкт з .translation_text
      const translatedText = Array.isArray(out)
        ? (out[0].translation_text || out[0].generated_text || out[0])
        : (out.translation_text || out.generated_text || String(out));
      translated.push(translatedText);
    }
    _tStatus('Переклад завершено');
    return translated.join(' ');
  }

  function _splitIntoChunks(text, maxLen) {
    if (text.length <= maxLen) return [text];
    const sentences = text.match(/[^.!?]+[.!?]*/g) || [text];
    const chunks = [];
    let current = '';
    for (const s of sentences) {
      if ((current + s).length > maxLen && current) {
        chunks.push(current.trim());
        current = s;
      } else {
        current += s;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : [text];
  }

  window.VT_translateToEnglish = translateToEnglish;
  window.VT_setTranslateStatusCb = setTranslateStatusCb;

  /* ═══════════════════════════════════════════════════════════════
     VOICE RECORDING + WHISPER STT
     ═══════════════════════════════════════════════════════════════ */

  const WHISPER_MODEL = 'Xenova/whisper-small';  // залишається сумісним у v3

  let _mediaRecorder  = null;
  let _audioChunks    = [];
  let _isRecording    = false;
  let _voiceStatusCb  = null;
  let _voiceResultCb  = null;
  let _voiceErrorCb   = null;

  function setVoiceCallbacks(onStatus, onResult, onError) {
    _voiceStatusCb = onStatus;
    _voiceResultCb = onResult;
    _voiceErrorCb  = onError;
  }

  function _vStatus(msg) {
    if (_voiceStatusCb) _voiceStatusCb(msg);
    console.log('[VT voice]', msg);
  }
  function _vError(msg) {
    if (_voiceErrorCb) _voiceErrorCb(msg);
    console.error('[VT voice]', msg);
  }

  function isRecording() { return _isRecording; }

  async function startRecording() {
    if (_isRecording) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      _audioChunks = [];

      // Prefer webm/opus; fall back to whatever the browser supports
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
          ? 'audio/webm'
          : '';

      const opts = mimeType ? { mimeType } : {};
      _mediaRecorder = new MediaRecorder(stream, opts);

      _mediaRecorder.addEventListener('dataavailable', e => {
        if (e.data && e.data.size > 0) _audioChunks.push(e.data);
      });

      _mediaRecorder.addEventListener('stop', async () => {
        stream.getTracks().forEach(t => t.stop());
        await _processAudio();
      });

      _mediaRecorder.start(200); // collect every 200ms
      _isRecording = true;
      _vStatus('Recording…');
    } catch (e) {
      _vError('Microphone access denied: ' + e.message);
    }
  }

  function stopRecording() {
    if (!_isRecording || !_mediaRecorder) return;
    _mediaRecorder.stop();
    _isRecording = false;
    _vStatus('Processing…');
  }

  async function _processAudio() {
    try {
      _vStatus('Loading Whisper model…');

      let lastPct = 0;
      const pipe = await getPipeline('automatic-speech-recognition', WHISPER_MODEL, (p) => {
        if (p && p.progress !== undefined) {
          const pct = Math.round(p.progress);
          if (pct !== lastPct) {
            lastPct = pct;
            _vStatus(`Downloading Whisper… ${pct}%`);
          }
        }
      }, { dtype: 'q8' });

      _vStatus('Transcribing audio…');

      // Build AudioBuffer from raw chunks
      const blob = new Blob(_audioChunks);
      const arrayBuffer = await blob.arrayBuffer();

      // Decode audio to Float32Array at 16 kHz (required by Whisper)
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
      let audioBuffer;
      try {
        audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);
      } catch (decodeErr) {
        // Safari / Firefox may need the audio decoded differently
        throw new Error('Audio decode failed: ' + decodeErr.message);
      }
      await audioCtx.close();

      // Mix down to mono Float32Array
      const channelData = audioBuffer.getChannelData(0);
      const float32 = new Float32Array(channelData.length);
      float32.set(channelData);

      // Run Whisper with multilingual support
      const result = await pipe(float32, {
        task: 'transcribe',
        language: null, // auto-detect
        chunk_length_s: 30,
        stride_length_s: 5,
      });

      const text = (result.text || '').trim();
      _vStatus('Done');
      if (_voiceResultCb) _voiceResultCb(text);
    } catch (e) {
      _vError('Transcription error: ' + e.message);
    }
  }

  window.VT_startRecording  = startRecording;
  window.VT_stopRecording   = stopRecording;
  window.VT_isRecording     = isRecording;
  window.VT_setVoiceCallbacks = setVoiceCallbacks;

  /* ═══════════════════════════════════════════════════════════════
     MICROPHONE BUTTON — injects UI next to #promptInput
     ═══════════════════════════════════════════════════════════════ */

  function initMicButton() {
    const textarea = document.getElementById('promptInput');
    if (!textarea) return;

    // Wrap textarea in a relative container if not already
    const parent = textarea.parentNode;

    const wrapper = document.createElement('div');
    wrapper.className = 'voice-input-wrapper';
    parent.insertBefore(wrapper, textarea);
    wrapper.appendChild(textarea);

    // Mic button
    const micBtn = document.createElement('button');
    micBtn.id = 'btnMic';
    micBtn.className = 'btn-mic';
    micBtn.type = 'button';
    micBtn.setAttribute('aria-label', 'Start voice input');
    micBtn.title = 'Voice input (EN / UK / ES)';
    micBtn.innerHTML = '<img src="png/microphone.png" alt="Microphone" width="22" height="22">';
    wrapper.appendChild(micBtn);

    // Status label below textarea
    const statusEl = document.createElement('div');
    statusEl.id = 'voiceStatus';
    statusEl.className = 'voice-status';
    statusEl.style.display = 'none';
    wrapper.appendChild(statusEl);

    // Wire callbacks
    setVoiceCallbacks(
      /* onStatus */ (msg) => {
        statusEl.textContent = msg;
        statusEl.style.display = msg ? 'block' : 'none';
      },
      /* onResult */ (text) => {
        if (text) {
          const cur = textarea.value;
          textarea.value = cur ? cur + ' ' + text : text;
          textarea.dispatchEvent(new Event('input'));
        }
        statusEl.textContent = text ? '✓ Transcription added' : '⚠ Nothing transcribed';
        setTimeout(() => { statusEl.style.display = 'none'; }, 3000);
        micBtn.classList.remove('recording');
        micBtn.title = 'Voice input (EN / UK / ES)';
      },
      /* onError */ (msg) => {
        statusEl.textContent = '⚠ ' + msg;
        statusEl.style.display = 'block';
        setTimeout(() => { statusEl.style.display = 'none'; }, 4000);
        micBtn.classList.remove('recording');
      }
    );

    micBtn.addEventListener('click', async () => {
      if (!VT_isRecording()) {
        micBtn.classList.add('recording');
        micBtn.title = 'Click to stop recording';
        await VT_startRecording();
      } else {
        micBtn.classList.remove('recording');
        VT_stopRecording();
      }
    });
  }

  /* ── Init on DOM ready ────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMicButton);
  } else {
    initMicButton();
  }

})();
