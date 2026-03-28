# ── Build stage ─────────────────────────────────────────────────────────────
# Use a slim Node LTS image to keep the image small.
FROM node:20-alpine AS base

WORKDIR /app

# Copy dependency manifests first so Docker can cache the npm install layer.
COPY package*.json ./

# Install only production dependencies.
RUN npm ci --omit=dev

# ── Runtime stage ────────────────────────────────────────────────────────────
FROM node:20-alpine

WORKDIR /app

# Copy installed dependencies from the build stage.
COPY --from=base --chown=node:node /app/node_modules ./node_modules

# Copy application source with correct ownership.
COPY --chown=node:node . .

# The PORT env-var is read by server.js; default to 5000.
ENV PORT=5000
ENV NODE_ENV=production

EXPOSE 5000

# Run as non-root for security.
USER node

CMD ["node", "server.js"]
