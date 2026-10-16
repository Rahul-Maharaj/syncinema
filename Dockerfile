# One container = web UI + API + sockets + WebRTC signaling behind ONE port (Render, Railway, Fly, any Docker host)
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production
COPY server/package*.json server/
RUN npm --prefix server install --omit=dev
COPY web/package*.json web/
RUN npm --prefix web install --include=dev
COPY . .
RUN npm --prefix web run build
RUN mkdir -p /app/data/uploads /app/server/data/uploads && chown -R node:node /app/data /app/server /app/web/.next
ENV PORT=10000 TRUST_PROXY=1 DATA_FILE=/app/data/rooms.json UPLOADS_DIR=/app/data/uploads
USER node
EXPOSE 10000
HEALTHCHECK --interval=30s CMD node -e "fetch('http://localhost:'+process.env.PORT+'/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server/local.js"]
