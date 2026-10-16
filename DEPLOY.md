# Deploy SyncCinema (pick one)

## A) Cloudflare (Free, SSL, Zero Open Ports)
Follow the step-by-step guide in [CLOUDFLARE_DEPLOYMENT.md](CLOUDFLARE_DEPLOYMENT.md).
- Cloudflare Pages/Workers cannot run persistent Node WebSockets. Use **Cloudflare Tunnel (`cloudflared`)** pointing to `http://localhost:8080`.
- Quick tunnel in 1 command: `cloudflared tunnel --url http://localhost:8080`
- Or link your own domain (e.g. `watch.yourdomain.com`) in Cloudflare Zero Trust dashboard.

## B) Render (free, cloud)
1. Push this folder to GitHub (the folder that contains `Dockerfile`).
2. render.com → New → Blueprint → pick the repo. It reads `render.yaml`.
3. Deploy. Open the `https://….onrender.com` link and start a room.
*(Note: Free plan sleeps when idle and forgets rooms on redeploy).*

## C) Railway
New Project → Deploy from GitHub → it finds the `Dockerfile`. Variable: `TRUST_PROXY=1`. Settings → Networking → Generate Domain.

## D) Fly.io (keeps rooms on a volume)
`fly launch --no-deploy` → `fly volumes create rooms --size 1` → `fly deploy`.

## E) Your PC, free
`npm run build` then `PORT=8080 npm start` and `cloudflared tunnel --url http://localhost:8080`.

## If video stays black on some networks
Add a free TURN relay (Open Relay / Metered) as env var:
`EXTRA_ICE=[{"urls":"turn:openrelay.metered.ca:443","username":"openrelayproject","credential":"openrelayproject"}]`

## Env vars
`PORT=8080` · `TRUST_PROXY=1` on hosting platforms · `CLIENT_ORIGIN=https://your-domain` (optional, blocks cross-site websockets) · `DATA_FILE` (where rooms are saved)

