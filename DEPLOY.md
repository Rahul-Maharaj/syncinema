# Deploy SyncCinema (pick one)
Cloudflare Workers/Pages CANNOT run this app (needs a long-running Node server). If your Cloudflare build runs `npx wrangler deploy`, clear that deploy command / disconnect it.

## A) Render (free, easiest)
1. Push this folder to GitHub (the folder that contains `Dockerfile`).
2. render.com → New → Blueprint → pick the repo. It reads `render.yaml`.
3. When asked, enter `ACCESS_KEY` = your secret word (10+ chars). Deploy.
4. Open the `https://….onrender.com` link, unlock, start a room.
Free plan sleeps when idle and forgets rooms on redeploy.

## B) Railway
New Project → Deploy from GitHub → it finds the `Dockerfile`. Variables: `ACCESS_KEY`, `TRUST_PROXY=1`. Settings → Networking → Generate Domain.

## C) Fly.io (keeps rooms on a volume)
`fly launch --no-deploy` → `fly volumes create rooms --size 1` → `fly secrets set ACCESS_KEY="your secret word"` → `fly deploy`.

## D) Your PC, free
`npm run build` then `ACCESS_KEY="your secret word" PORT=8080 npm start` and `cloudflared tunnel --url http://localhost:8080`.

## If video stays black on some networks
Add a free TURN relay (Open Relay / Metered) as env var:
`EXTRA_ICE=[{"urls":"turn:HOST:443","username":"USER","credential":"PASS"}]`

## Env vars
ACCESS_KEY (required, 10+ chars) · TRUST_PROXY=1 on hosting platforms · CLIENT_ORIGIN=https://your-domain (optional, blocks cross-site websockets) · DATA_FILE (where rooms are saved)
