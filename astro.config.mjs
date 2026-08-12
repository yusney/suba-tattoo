// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { loadEnv } from 'vite';

import tailwindcss from '@tailwindcss/vite';

const env = loadEnv(process.env.NODE_ENV ?? 'development', process.cwd(), '');
const siteUrl = env.PUBLIC_SITE_URL?.trim();

// https://astro.build/config
export default defineConfig({
  site: siteUrl && siteUrl.toLowerCase() !== 'false' ? siteUrl : undefined,
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
