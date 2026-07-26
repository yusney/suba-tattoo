# SEO

Static-site SEO setup for SUBA TATTOO. All routes ship with proper meta tags, Open Graph / Twitter cards, hreflang annotations, a generated sitemap, and a `robots.txt`. No runtime cost, no client JS.

---

## What's emitted on every page

`src/layouts/Layout.astro` is the single source of truth. It renders the following inside `<head>`:

- `<title>` and `<meta name="description">` — derived from the page props (with sensible `site_meta.default_*` fallback).
- `<link rel="canonical">` — points to the current page, with the locale prefix stripped so `es` is the canonical for all locales. Override with the `canonical` prop when needed.
- `<link rel="alternate" hreflang="es|en|ca">` — one per locale, computed via `localizePath()` from `src/lib/i18n.ts`. The `es` link is the un-prefixed URL (default locale).
- `<link rel="alternate" hreflang="x-default">` — points to the `es` version (the default locale).
- Open Graph: `og:title`, `og:description`, `og:image`, `og:url`, `og:type`, `og:locale`, `og:site_name`.
- Twitter Card: `twitter:card=summary_large_image`, `twitter:title`, `twitter:description`, `twitter:image`.
- `<meta name="robots">` — `index, follow` by default; set to `noindex, nofollow` via the `noindex` prop.

OG locale codes are mapped from the active i18n locale via `meta.og.locale_*` in `src/i18n/{es,en,ca}.json`:

| Locale | OG code |
|---|---|
| `es` | `es_ES` |
| `en` | `en_US` |
| `ca` | `ca_ES` |

---

## Per-page meta

Each page component (`HomePage`, `SobrePage`, `ReservaPage`, `FaqPage`, `DetallePage`) passes its own `title`, `description`, and `ogType` to `<Layout>`. Strings live under the `meta.*` namespace in `src/i18n/{es,en,ca}.json`.

| Route | `og:type` | Translation keys |
|---|---|---|
| `/` | `website` | `meta.home.title`, `meta.home.description` |
| `/sobre` | `website` | `meta.sobre.title`, `meta.sobre.description` |
| `/reserva` | `website` | `meta.reserva.title`, `meta.reserva.description` |
| `/faq` | `website` | `meta.faq.title`, `meta.faq.description` |
| `/detalle/[slug]` | `article` | `meta.detalle.title_suffix` appended to the tattoo title |

The detail page is dynamic: the title is `${data.title}${t("meta.detalle.title_suffix")}` and the description is the tattoo's `data.description` truncated to 160 chars. `og:type=article` is set automatically.

### Adding a new page

1. Pick or add `meta.<page>.title` and `meta.<page>.description` in **all three** `src/i18n/{es,en,ca}.json` files. Keep it short — title ~60 chars, description ~155 chars.
2. Pass them to `<Layout title={…} description={…} ogType="website">` (or `"article"` for blog/portfolio entries).
3. If the route should be excluded from search, pass `noindex={true}` (currently no page does).

---

## Open Graph image

Default: `public/images/og/og-default.jpg` (1200×630 placeholder, currently a copy of `public/images/hero/tattoo-session.jpg`).

Per-page override: pass `ogImage="/images/og/<your-file>.jpg"` to `<Layout>`. Path is relative to `public/`; the layout resolves it to an absolute URL using `Astro.site.origin`.

Replace the placeholder before launch with a properly designed OG image (brand name, tagline, dark background, 1200×630 px).

---

## Sitemap (`@astrojs/sitemap`)

Configured in `astro.config.mjs`:

```js
import sitemap from '@astrojs/sitemap';

integrations: [sitemap({
  i18n: {
    defaultLocale: 'es',
    locales: { es: 'es-ES', en: 'en-US', ca: 'ca-ES' },
  },
})],
```

The plugin reads the `i18n` config from Astro and emits one `<url>` per page per locale, each annotated with `xhtml:link rel="alternate" hreflang="…"` entries pointing at the other locales. Resulting files:

- `dist/sitemap-index.xml` — sitemap index.
- `dist/sitemap-0.xml` — actual `<urlset>` with all pages and hreflang links.

Requires `site: 'https://subatattoo.com'` in `astro.config.mjs` to build absolute URLs.

---

## `robots.txt`

Static file at `public/robots.txt`:

```
User-agent: *
Allow: /
Disallow: /admin/

Sitemap: https://subatattoo.com/sitemap-index.xml
```

The `/admin/` disallow keeps the Decap CMS UI out of search results. Served as-is at `/robots.txt` — no Astro involvement.

Update the `Sitemap:` line when the production domain is finalized.

---

## Local verification

```bash
pnpm run build
pnpm run preview -- --port 4321

# 200s
curl -sI http://127.0.0.1:4321/
curl -sI http://127.0.0.1:4321/robots.txt
curl -sI http://127.0.0.1:4321/sitemap-index.xml
curl -sI http://127.0.0.1:4321/sitemap-0.xml
curl -sI http://127.0.0.1:4321/images/og/og-default.jpg

# Meta tags rendered on /
curl -s http://127.0.0.1:4321/ | grep -oE 'og:title|og:description|og:image|twitter:card|hreflang'

# Hreflang for an English page
curl -s http://127.0.0.1:4321/en/ | grep -oE 'hreflang="[^"]+"'
```

---

## Notes & gotchas

- The `canonical` URL strips the locale prefix. This is intentional — we want the `es` URL to be the canonical source for the same content across locales. Use `og:locale` for language targeting.
- `x-default` always points at the `es` (default) version.
- `/admin/` is intentionally excluded from `robots.txt` and from the sitemap. It still returns `200 OK` in production preview because `public/admin/index.html` shadows the Astro redirect route (see `doc/stack.md`).
- For a proper SEO audit before launch, use the `seo-audit` skill on the deployed URL.
