/**
 * dev-server.js — JS PROMPT PWA  
 * Local development server for testing without nginx.
 * Serves static files from the project root AND proxies /env to env-server.js.
 *
 * Usage (from project root /var/www/promt.pp.ua or local clone):
 *   node js/dev-server.js           → http://localhost:8000
 *   node js/dev-server.js 3000      → http://localhost:3000
 *
 * Requires env-server.js to be running on port 3099:
 *   node js/env-server.js &
 *   node js/dev-server.js
 *
 * Or start both together:
 *   node js/dev-server.js --with-env
 */

'use strict';

const http  = require('http');
const https = require('https');
const fs    = require('fs');
const path  = require('path');
const cp    = require('child_process');

/* ── Config ─────────────────────────────────────────────────── */
const PORT     = parseInt(process.argv[2]) || 8000;
// Detect project root: works whether you run from project root OR from js\ subfolder
const ROOT = (() => {
  const cwd  = process.cwd();
  const self = path.dirname(require.main ? require.main.filename : __filename);
  // If this file lives in a 'js' subfolder, project root is one level up
  if (path.basename(self).toLowerCase() === 'js') return path.resolve(self, '..');
  // If cwd ends with 'js', go up
  if (path.basename(cwd).toLowerCase() === 'js') return path.resolve(cwd, '..');
  return cwd;
})();
const ENV_PORT = 3099;
const WITH_ENV = process.argv.includes('--with-env');

/* ── MIME types ─────────────────────────────────────────────── */
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.json': 'application/json',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico':  'image/x-icon',
  '.svg':  'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2':'font/woff2',
  '.md':   'text/markdown',
  '.txt':  'text/plain',
  '.webmanifest': 'application/manifest+json',
};

/* ── Optional: start env-server.js as child process ─────────── */
if (WITH_ENV) {
  const envScript = (() => {
    // Try: sibling to this file (js/env-server.js when running from js/)
    const sibling = path.join(path.dirname(require.main.filename), 'env-server.js');
    if (fs.existsSync(sibling)) return sibling;
    // Try: js/ subfolder of project root
    return path.join(ROOT, 'js', 'env-server.js');
  })();
  if (fs.existsSync(envScript)) {
    const child = cp.spawn(process.execPath, [envScript], {
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    child.stdout.on('data', d => process.stdout.write('[env-server] ' + d));
    child.stderr.on('data', d => process.stderr.write('[env-server] ' + d));
    child.on('exit', code => console.warn('[env-server] exited with code', code));
    console.log('[dev-server] Started env-server.js as child process');
  } else {
    console.warn('[dev-server] --with-env: js/env-server.js not found at', envScript);
  }
}

/* ── Proxy /env → env-server.js:3099 ────────────────────────── */
function proxyEnv(res) {
  const opts = {
    hostname: '127.0.0.1',
    port:     ENV_PORT,
    path:     '/env',
    method:   'GET',
    headers:  { 'Accept': 'application/json' },
  };
  const proxy = http.request(opts, proxyRes => {
    res.writeHead(proxyRes.statusCode, {
      'Content-Type':          'application/json',
      'Cache-Control':         'no-store, no-cache, must-revalidate',
      'X-Content-Type-Options':'nosniff',
      'Access-Control-Allow-Origin': '*',    // allow localhost origins
    });
    proxyRes.pipe(res);
  });
  proxy.on('error', err => {
    // env-server not running → return empty key with clear message
    console.warn('[dev-server] /env proxy failed:', err.message);
    console.warn('[dev-server] → start env-server: node js/env-server.js');
    console.warn('[dev-server] → or use: node js/dev-server.js --with-env');
    const body = JSON.stringify({ DEEPSEEK_API_KEY: '', _error: 'env-server not running on port ' + ENV_PORT });
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(body);
  });
  proxy.end();
}

/* ── Static file server ─────────────────────────────────────── */
function serveFile(reqPath, res) {
  // Resolve to filesystem path
  let filePath = path.join(ROOT, reqPath === '/' ? 'index.html' : reqPath);

  // Security: prevent path traversal outside ROOT
  if (!filePath.startsWith(ROOT + path.sep) && filePath !== ROOT) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  // If directory → try index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found: ' + reqPath);
      } else {
        res.writeHead(500); res.end('Server error');
      }
      return;
    }
    const ext  = path.extname(filePath).toLowerCase();
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type':  mime,
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(data);
  });
}

/* ── Main server ─────────────────────────────────────────────── */
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];  // strip query string

  // Route /env to env-server proxy
  if (url === '/env' && req.method === 'GET') {
    return proxyEnv(res);
  }

  // Add CORS for local dev
  res.setHeader('Access-Control-Allow-Origin', '*');

  serveFile(url, res);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log('');
  console.log('┌─────────────────────────────────────────────────┐');
  console.log('│  JS PROMPT — Dev Server                         │');
  console.log('├─────────────────────────────────────────────────┤');
  console.log(`│  App:      http://localhost:${PORT}             │`);
  console.log(`│  /env:     proxied → env-server.js:${ENV_PORT}  │`);
  console.log(`│  Root:     ${ROOT.slice(-37).padEnd(37)}        │`);
  console.log('├─────────────────────────────────────────────────┤');
  console.log('│  Stop: Ctrl+C                                   │');
  console.log('└─────────────────────────────────────────────────┘');
  console.log('');
  if (!WITH_ENV) {
    console.log('  TIP: start both together (from project root):');
    console.log('       node js/dev-server.js --with-env');
    console.log('');
    console.log('  Or from the js\ folder:');
    console.log('       node dev-server.js --with-env');
    console.log('');
  }
});

server.on('error', err => {
  if (err.code === 'EADDRINUSE') {
    console.error(`[dev-server] Port ${PORT} is busy. Try: node js/dev-server.js 3000`);
  } else {
    console.error('[dev-server] Error:', err.message);
  }
  process.exit(1);
});