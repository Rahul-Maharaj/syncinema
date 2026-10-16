# Deploying SyncCinema on Cloudflare

SyncCinema requires a persistent Node.js environment to support real-time **WebSockets (Socket.IO)**, **PeerJS (WebRTC video & voice calls)**, and **backend streaming proxy with Range header support**.

Because Cloudflare Pages / Workers are purely serverless edge workers that do not maintain long-running WebSocket connections or Node.js background sockets, Cloudflare officially recommends **Cloudflare Tunnels (`cloudflared`)** to host full-stack Node.js & WebSocket applications.

With Cloudflare Tunnel, you get:
- **100% Free** HTTPS & custom domain via Cloudflare
- **Automatic free SSL certificates**
- **Zero open ports** on your router (no port forwarding required)
- **Built-in DDoS protection & Cloudflare Edge CDN**
- **Full support for Socket.IO WebSockets and WebRTC calls**

---

## Option 1: Instant Quick Tunnel (Fastest & Free — 1 Minute)

Run SyncCinema on your computer or VPS and expose it to the internet immediately with a free HTTPS URL:

1. **Build and start SyncCinema**:
   ```bash
   npm run build
   npm start
   ```
   *(SyncCinema unified gateway runs on `http://localhost:8080`)*

2. **Download Cloudflare Tunnel CLI (`cloudflared`)**:
   - **Windows** (PowerShell):
     ```powershell
     winget install --id Cloudflare.cloudflared
     ```
     *(Or download `cloudflared-windows-amd64.exe` from [Cloudflare Releases](https://github.com/cloudflare/cloudflared/releases))*
   - **Linux / Ubuntu / Debian**:
     ```bash
     curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
     sudo dpkg -i cloudflared.deb
     ```
   - **macOS**:
     ```bash
     brew install cloudflared
     ```

3. **Start the tunnel**:
   ```bash
   cloudflared tunnel --url http://localhost:8080
   ```
4. **Done!** Cloudflare will print a secure public link like:
   ```text
   https://random-words-here.trycloudflare.com
   ```
   Share this HTTPS link with your partner. Audio/video calls, room sync, and movies will all work over Cloudflare's secure network.

---

## Option 2: Permanent Tunnel with Your Own Domain (Recommended for 24/7 Production)

If you own a domain registered or managed on Cloudflare (e.g. `yourdomain.com`), you can bind SyncCinema permanently to `watch.yourdomain.com`:

### Method A: Cloudflare Zero Trust Dashboard (No-Code UI)
1. Go to [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/).
2. Navigate to **Networks** → **Tunnels** → Click **Create a Tunnel**.
3. Choose **Cloudflared** and give it a name (e.g. `synccinema`).
4. Follow the on-screen command to install and run the connector on your server/PC.
5. In the **Public Hostname** tab:
   - **Subdomain**: `watch` (or leave blank for root domain)
   - **Domain**: select your domain (e.g. `yourdomain.com`)
   - **Service Type**: `HTTP`
   - **URL**: `localhost:8080`
6. Click **Save Tunnel**. SyncCinema is now live at `https://watch.yourdomain.com`!

### Method B: Cloudflare CLI (`cloudflared`)
1. Login to Cloudflare:
   ```bash
   cloudflared tunnel login
   ```
2. Create a tunnel:
   ```bash
   cloudflared tunnel create synccinema
   ```
   *(Note down the Tunnel ID)*
3. Route your domain/subdomain to the tunnel:
   ```bash
   cloudflared tunnel route dns synccinema watch.yourdomain.com
   ```
4. Create a `config.yml` file:
   ```yaml
   tunnel: <TUNNEL-ID>
   credentials-file: /path/to/<TUNNEL-ID>.json

   ingress:
     - hostname: watch.yourdomain.com
       service: http://localhost:8080
     - service: http_status:404
   ```
5. Run the tunnel as a service:
   ```bash
   cloudflared tunnel run synccinema
   ```

---

## Essential Cloudflare Dashboard Settings

If you route your domain through Cloudflare (Orange Cloud proxy enabled), verify these settings:

1. **WebSockets (Required)**:
   - Go to Cloudflare Dashboard → Your Domain → **Network**.
   - Make sure **WebSockets** is toggled **ON** (Enabled).
2. **SSL/TLS Encryption Mode**:
   - Go to **SSL/TLS** → **Overview**.
   - Set encryption mode to **Full** or **Full (Strict)**.
3. **Minimum TLS Version**:
   - Set to **TLS 1.2** or **TLS 1.3**.
4. **Buffering / Speed Optimization**:
   - Under **Speed** → **Optimization**, ensure Cloudflare Rocket Loader is **OFF** (Rocket Loader can interfere with real-time video syncing scripts).

---

## 24/7 Free Hosting Architecture

If you do not want your home PC running 24/7, deploy SyncCinema on a free or low-cost virtual server:

1. **Oracle Cloud Free Tier** (Always Free 4 ARM cores, 24GB RAM, or 2 AMD micro VMs):
   - Clone SyncCinema:
     ```bash
     git clone https://github.com/your-repo/synccinema.git
     cd synccinema
     npm install
     npm run build
     ```
   - Run under PM2:
     ```bash
     sudo npm install -g pm2
     pm2 start "npm start" --name synccinema
     pm2 startup
     pm2 save
     ```
   - Run `cloudflared` tunnel pointing to `http://localhost:8080`.
2. **Docker Compose**:
   - You can also run both SyncCinema and `cloudflared` together using Docker Compose.

---

## WebRTC Audio/Video Calls Across Restrictive Mobile Carriers

SyncCinema has built-in free STUN servers. If one partner is on strict cellular NAT / 4G / 5G or university Wi-Fi, add a free TURN relay to your environment:

```env
EXTRA_ICE=[{"urls":"turn:openrelay.metered.ca:443","username":"openrelayproject","credential":"openrelayproject"}]
```
