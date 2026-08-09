# Runs the Express/SQLite API in server/. Not tied to a specific host —
# works on Render, Fly.io, Railway, a plain VPS with Docker, etc. GitHub
# Pages (the frontend's host) cannot run this; it needs somewhere that
# keeps a Node process alive.
FROM node:22-slim

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY . .

# orders.sqlite lives here (see db.js) — mount a persistent volume at this
# path, or every redeploy on a host with an ephemeral filesystem wipes
# order history.
VOLUME ["/app/data"]

ENV PORT=3001
EXPOSE 3001

CMD ["node", "index.js"]
