# syntax=docker/dockerfile:1.7

# ============================================================
# Stage 1 — Build the Astro static site
# ============================================================
FROM node:24-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (matches the project's package manager)
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@latest --activate

# Install dependencies first (better layer caching)
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .
RUN pnpm run build

# ============================================================
# Stage 2 — Serve the built static files via nginx
# ============================================================
FROM nginx:1.27-alpine

# Custom nginx config (cache strategy + SPA routing)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built static files
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

# Healthcheck — Dokploy / Uptime Kuma can hit this
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost/ || exit 1

CMD ["nginx", "-g", "daemon off;"]