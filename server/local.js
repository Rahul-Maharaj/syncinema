// Free one-command mode: API + web UI behind ONE port, so a free tunnel (cloudflared) can expose it over HTTPS.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const httpProxy = require('http-proxy');
const { isBotRequest } = require('./botShield');
const { API_PORT = 4000, WEB_PORT = 3000, GATEWAY_PORT = process.env.PORT || 8080 } = process.env;   // hosting platforms give us PORT
process.env.PORT = API_PORT;
require('./server');                                   // API + sockets + WebRTC signaling
const webDir = path.join(__dirname, '../web');
const web = spawn(process.execPath, [path.join(webDir, 'node_modules/next/dist/bin/next'), 'start', '-p', WEB_PORT], { cwd: webDir, stdio: 'inherit' });

// High-Concurrency Connection Pooling (Reuses sockets to prevent port exhaustion & latency spikes)
const keepAliveAgent = new http.Agent({
  keepAlive: true,
  keepAliveMsecs: 15000,
  maxSockets: 10000,
  maxFreeSockets: 512,
  timeout: 60000,
});

const api = httpProxy.createProxyServer({
  target: `http://localhost:${API_PORT}`,
  ws: true,
  agent: keepAliveAgent,
  xfwd: true,
});

const ui = httpProxy.createProxyServer({
  target: `http://localhost:${WEB_PORT}`,
  ws: true,
  agent: keepAliveAgent,
  xfwd: true,
});

api.on('error', (err, req, res) => {
  if (res?.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Service temporarily unavailable, retrying…');
  }
});

ui.on('error', (err, req, res) => {
  if (res?.writeHead && !res.headersSent) {
    res.writeHead(502, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Starting SyncCinema UI…');
  }
});
const isApi = (u = '') => /^\/(socket\.io|peerjs|api|health)(\/|\?|$)/.test(u);
// real client IP for the brute-force lockout (never trust a client-supplied header)
// TRUST_PROXY=1 (Render/Railway/Fly): the platform proxy appends the real client IP as the LAST x-forwarded-for entry
const stamp = (req) => {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',').map((v) => v.trim()).filter(Boolean);
  req.headers['x-forwarded-for'] = req.headers['cf-connecting-ip'] || (process.env.TRUST_PROXY && xf[xf.length - 1]) || req.socket.remoteAddress;
};

const gateway = http.createServer((req, res) => {
  stamp(req);

  // Allow internal healthcheck
  if (req.url === '/health' || req.url === '/api/health') {
    return (isApi(req.url) ? api : ui).web(req, res);
  }

  // 🛡️ Global Gateway Anti-Bot Shield: Block bots, scrapers, exploit probes before proxying
  const check = isBotRequest(req);
  if (check.blocked) {
    res.writeHead(403, {
      'Content-Type': 'text/plain; charset=utf-8',
      'X-Bot-Shield': 'Access-Denied',
      'Connection': 'close',
    });
    res.end('Access Denied: Automated bots, crawlers, and scrapers are strictly prohibited on SyncCinema.');
    return;
  }

  (isApi(req.url) ? api : ui).web(req, res);
})
  .on('upgrade', (req, sock, head) => {
    stamp(req);

    // 🛡️ WebSocket Gateway Anti-Bot Shield: Block bot websocket connections
    const check = isBotRequest(req);
    if (check.blocked) {
      sock.write('HTTP/1.1 403 Forbidden\r\nConnection: close\r\n\r\n');
      sock.destroy();
      return;
    }

    (isApi(req.url) ? api : ui).ws(req, sock, head);
  });

gateway.keepAliveTimeout = 65000;
gateway.headersTimeout = 66000;
gateway.listen(GATEWAY_PORT, () => console.log(`\nSyncCinema → http://localhost:${GATEWAY_PORT}\nShare free over HTTPS:  cloudflared tunnel --url http://localhost:${GATEWAY_PORT}\n`));
process.on('exit', () => web.kill());
