# syntax=docker/dockerfile:1.7

# ============================================================
# Stage 1 — Build the Astro static site
# ============================================================
FROM node:24-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack (matches the project's package manager).
# Pinned to a specific version because pnpm@latest can resolve to a version
# whose build-script approval mechanism differs from what package.json's
# `pnpm.onlyBuiltDependencies` expects.
ENV COREPACK_ENABLE_DOWNLOAD_PROMPT=0
RUN corepack enable && corepack prepare pnpm@10.32.1 --activate

# Install dependencies first (better layer caching).
# pnpm 10+ blocks postinstall scripts by default; we whitelist the ones we
# actually need via the `pnpm.onlyBuiltDependencies` field in package.json:
#   - esbuild (Vite's bundler)
#   - @tailwindcss/oxide (Tailwind v4's Rust engine)
#   - sharp (image processing)
# Pnpm 10.32.1 respects this field at install time without extra flags.
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

# Copy source and build
COPY . .

# Public Astro env vars must be available at build time. We declare them
# as ARG (so they can be passed by `docker build --build-arg`) and then
# expose them as ENV so that `pnpm run build` (which spawns Astro/Vite)
# can read them via `import.meta.env.PUBLIC_*`.
#
# Without this two-step pattern, BuildKit accepts --build-arg but the
# value never reaches the Node process and Astro inlines `undefined`.
ARG PUBLIC_TURNSTILE_SITE_KEY
ENV PUBLIC_TURNSTILE_SITE_KEY=$PUBLIC_TURNSTILE_SITE_KEY

RUN pnpm run build

# ============================================================
# Stage 2 — Serve static files via nginx with the OAuth proxy
# ------------------------------------------------------------
# Stay on nginx:alpine (not node:alpine) to keep the image lean.
# Alpine's package ships nodejs v22 — enough for our OAuth server.
# Total image size: ~60 MB (vs ~320 MB with node:alpine + nginx).
# ============================================================
FROM nginx:1.27-alpine

# Node.js for the OAuth proxy. v18+ is required (built-in fetch); Alpine 3.20 ships v22.
RUN apk add --no-cache nodejs

# Custom nginx config (cache strategy + SPA routing + /auth proxy)
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Built static files
COPY --from=builder /app/dist /usr/share/nginx/html

# Decap CMS OAuth proxy and process entrypoint
COPY oauth/decap-oauth.mjs oauth/entrypoint.sh /usr/local/app/
RUN chmod +x /usr/local/app/entrypoint.sh

EXPOSE 80

# Healthcheck — verify both nginx and its OAuth upstream by going
# through nginx (which proxies /health -> 127.0.0.1:3000/health).
# NOTE: use `wget -O /dev/null` (GET), NOT `wget --spider` (HEAD).
# nginx does not forward HEAD requests to proxy_pass upstreams and
# would return 404 directly, so the container would be marked unhealthy
# even though nginx and the OAuth server are perfectly fine.
HEALTHCHECK --interval=30s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 -O /dev/null http://127.0.0.1/health || exit 1

ENTRYPOINT ["sh", "/usr/local/app/entrypoint.sh"]