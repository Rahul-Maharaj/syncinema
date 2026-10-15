// Free one-command mode: API + web UI behind ONE port, so a free tunnel (cloudflared) can expose it over HTTPS.
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');
const httpProxy = require('http-proxy');
const { API_PORT = 4000, WEB_PORT = 3000, GATEWAY_PORT = process.env.PORT || 8080 } = process.env;   // hosting platforms give us PORT
process.env.PORT = API_PORT;
require('./server');                                   // API + sockets + WebRTC signaling
const webDir = path.join(__dirname, '../web');
const web = spawn(process.execPath, [path.join(webDir, 'node_modules/next/dist/bin/next'), 'start', '-p', WEB_PORT], { cwd: webDir, stdio: 'inherit' });
const api = httpProxy.createProxyServer({ target: `http://localhost:${API_PORT}`, ws: true });
const ui = httpProxy.createProxyServer({ target: `http://localhost:${WEB_PORT}`, ws: true });
for (const p of [api, ui]) p.on('error', (_, __, res) => res?.writeHead?.(502).end('starting…'));
const isApi = (u = '') => /^\/(socket\.io|peerjs|api|health)(\/|\?|$)/.test(u);
// real client IP for the brute-force lockout (never trust a client-supplied header)
// TRUST_PROXY=1 (Render/Railway/Fly): the platform proxy appends the real client IP as the LAST x-forwarded-for entry
const stamp = (req) => {
  const xf = String(req.headers['x-forwarded-for'] || '').split(',').map((v) => v.trim()).filter(Boolean);
  req.headers['x-forwarded-for'] = req.headers['cf-connecting-ip'] || (process.env.TRUST_PROXY && xf[xf.length - 1]) || req.socket.remoteAddress;
};
http.createServer((req, res) => { stamp(req); (isApi(req.url) ? api : ui).web(req, res); })
  .on('upgrade', (req, sock, head) => { stamp(req); (isApi(req.url) ? api : ui).ws(req, sock, head); })
  .listen(GATEWAY_PORT, () => console.log(`\nSyncCinema → http://localhost:${GATEWAY_PORT}\nShare free over HTTPS:  cloudflared tunnel --url http://localhost:${GATEWAY_PORT}\n`));
process.on('exit', () => web.kill());
