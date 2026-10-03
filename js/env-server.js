/**
 * env-server.js — JS PROMPT PWA
 * Lightweight Node.js server that reads DEEPSEEK_API_KEY from .env
 * and exposes it via a local-only HTTP endpoint at /env (port 3099).
 *
 * nginx proxies /env → http://127.0.0.1:3099/env (see promt.pp.ua.conf).
 * The browser fetches /env once on startup; the key never appears in
 * client-side source code or localStorage.
 *
 * Usage:
 *   node env-server.js           (reads .env from the same directory)
 *   NODE_ENV=production node env-server.js
 *
 * .env file format (place next to this file or at /var/www/promt.pp.ua/.env):
 *   DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
 *
 * Systemd unit (/etc/systemd/system/jspromt-env.service):
 *   [Unit]
 *   Description=JS PROMPT env endpoint
 *   After=network.target
 *
 *   [Service]
 *   Type=simple
 *   WorkingDirectory=/var/www/promt.pp.ua/js
 *   ExecStart=/usr/bin/node env-server.js
 *   Restart=always
 *   RestartSec=5
 *   User=www-data
 *
 *   [Install]
 *   WantedBy=multi-user.target
 */

'use strict';

const http = require('http');
const fs   = require('fs');
const path = require('path');

const PORT     = 3099;
const BIND     = '127.0.0.1';
const ENV_FILE = path.resolve(__dirname, '../.env');   // /var/www/promt.pp.ua/.env
const FALLBACK = path.resolve(__dirname, '.env');       // js/.env fallback

function loadEnv(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const env = {};
    raw.split('\n').forEach(line => {
      line = line.trim();
      if (!line || line.startsWith('#')) return;
      const eqIdx = line.indexOf('=');
      if (eqIdx === -1) return;
      const key = line.slice(0, eqIdx).trim();
      let val   = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) ||
          (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    });
    return env;
  } catch (_) { return {}; }
}

function getKey() {
  if (process.env.DEEPSEEK_API_KEY) return process.env.DEEPSEEK_API_KEY;
  let env = loadEnv(ENV_FILE);
  if (env.DEEPSEEK_API_KEY) return env.DEEPSEEK_API_KEY;
  env = loadEnv(FALLBACK);
  return env.DEEPSEEK_API_KEY || '';
}

const server = http.createServer((req, res) => {
  const remoteIP = req.socket.remoteAddress || '';
  const isLocal  = ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remoteIP);
  if (!isLocal) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    return res.end('Forbidden');
  }

  if (req.method === 'GET' && req.url === '/env') {
    const key  = getKey();
    const body = JSON.stringify({ DEEPSEEK_API_KEY: key });
    res.writeHead(200, {
      'Content-Type':          'application/json',
      'Cache-Control':         'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options':'nosniff',
      'Content-Length':        Buffer.byteLength(body),
    });
    return res.end(body);
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not found');
});

server.listen(PORT, BIND, () => {
  const envPath = fs.existsSync(ENV_FILE) ? ENV_FILE
                : fs.existsSync(FALLBACK)  ? FALLBACK : '(not found)';
  const key = getKey();
  console.log(`[env-server] Listening on ${BIND}:${PORT}`);
  console.log(`[env-server] .env: ${envPath}`);
  console.log(`[env-server] Key: ${key ? key.slice(0,6) + '...' + key.slice(-4) : '(not set)'}`);
});

server.on('error', err => { console.error('[env-server]', err.message); process.exit(1); });
