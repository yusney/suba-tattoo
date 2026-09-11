// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';

const fileEnv = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
// NOTE: loadEnv() only reads .env *files*. Real environment variables (Docker
// ARG/ENV, Dokploy build args, CI secrets) live on process.env — and .env
// files are dockerignored, so in Docker builds fileEnv is always empty.
// process.env must win.
const rawSiteUrl = (process.env.PUBLIC_SITE_URL ?? fileEnv.PUBLIC_SITE_URL)?.trim();

const nodeEnv = process.env.NODE_ENV ?? '';
const isDevCommand = process.argv.includes('dev');
const isDev = nodeEnv === 'development' || isDevCommand;

/**
 * Validates and normalizes PUBLIC_SITE_URL into a bare origin.
 * Fails closed with a named error so a bad value never ships broken
 * canonicals/sitemap URLs to production.
 *
 * @param {string | undefined} raw
 * @returns {string | undefined}
 */
function resolveSiteUrl(raw) {
  if (!raw || raw.toLowerCase() === 'false') return undefined;

  /** @type {URL} */
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    throw new Error(
      `[astro.config] PUBLIC_SITE_URL is not a valid absolute URL: "${raw}". ` +
        'Expected an origin like https://tu-dominio.com.',
    );
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    throw new Error(
      `[astro.config] PUBLIC_SITE_URL must use http(s), got "${parsed.protocol}".`,
    );
  }
  if (parsed.pathname !== '/' || parsed.search || parsed.hash) {
    throw new Error(
      `[astro.config] PUBLIC_SITE_URL must be a bare origin (no path/query/hash), got "${raw}".`,
    );
  }
  if (nodeEnv === 'production' && parsed.protocol !== 'https:') {
    throw new Error(
      `[astro.config] PUBLIC_SITE_URL must be https in production, got "${raw}".`,
    );
  }
  return parsed.origin;
}

const normalizedSiteUrl = resolveSiteUrl(rawSiteUrl);

if (!normalizedSiteUrl && !isDev) {
  throw new Error(
    '[astro.config] Missing PUBLIC_SITE_URL — set it to the canonical origin ' +
      '(e.g. https://tu-dominio.com). ' +
      'Note: the legacy value `false` is no longer valid. ' +
      'Locally: copy .env.example to .env. ' +
      'Docker: pass --build-arg PUBLIC_SITE_URL=... (see Dockerfile).',
  );
}

// https://astro.build/config
export default defineConfig({
  site: normalizedSiteUrl,
  i18n: {
    defaultLocale: 'es',
    locales: ['es', 'en', 'ca'],
    routing: {
      prefixDefaultLocale: false,
    },
  },
  integrations: [
    sitemap({
      i18n: {
        defaultLocale: 'es',
        locales: {
          es: 'es-ES',
          en: 'en-US',
          ca: 'ca-ES',
        },
      },
      // Keep the Decap CMS admin out of the sitemap: robots.txt already
      // disallows /admin/, and submitting a URL Google is told not to crawl
      // risks a URL-only index entry. NOTE: filter receives the ABSOLUTE URL
      // (e.g. https://x.com/admin/), not a pathname — check the pathname.
      filter:
        /** @param {string} page */
        (page) => {
          try {
            return !new URL(page).pathname.startsWith('/admin');
          } catch {
            return true;
          }
        },
      serialize(item) {
        // Canonicals and hreflang alternates are emitted WITH a trailing slash
        // (see Layout.astro) to match the URL the edge actually serves
        // (e.g. /galeria/). @astrojs/sitemap already normalizes its entries
        // that way, so no URL rewriting is needed here — we only add the
        // x-default alias.
        if (item.links) {
          // x-default resolves to the default-locale (es) variant, mirroring
          // the hreflang cluster declared in the HTML head.
          const esVariant = item.links.find((link) => link.lang === 'es-ES');
          if (esVariant && !item.links.some((link) => link.lang === 'x-default')) {
            item.links = [...item.links, { ...esVariant, lang: 'x-default' }];
          }
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    // Dev-only: forward /api/contact to the Node sidecar (oauth/decap-oauth.mjs)
    // so the contact/booking forms can POST during `astro dev`. In production
    // this is handled by nginx (see nginx.conf), so vite.server.proxy is
    // never used in the build output.
    server: {
      proxy: {
        '/api/contact': 'http://127.0.0.1:3000'
      }
    }
  }
});
