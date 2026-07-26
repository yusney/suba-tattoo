# Stack & architecture decisions

The goal: a **content-first portfolio** that the artist can update without touching code, ships as static HTML, loads fast, and costs ~$0/month to host. Every choice below follows from that.

---

## Confirmed

### Framework — Astro 7.1+

`astro@^7.1.3` — chosen because:

- **Zero JS by default.** Astro only ships JavaScript for the islands you explicitly opt into. For a portfolio with mostly static pages, this means near-instant loads.
- **Content collections.** Built-in typed Markdown/MDX loader — perfect for artist bios, tattoo entries, FAQs.
- **Multi-page routing.** `src/pages/` → URL. No SPA routing complexity for a 6-page site.
- **Vite under the hood.** Fast HMR, modern build, ESM-native.
- **Node ≥ 22.12** required (declared in `engines`).

### Styling — Tailwind CSS v4

`tailwindcss@^4.3.3` + `@tailwindcss/vite@^4.3.3`.

- **CSS-based config** (`@theme { ... }` in `src/styles/global.css`), not `tailwind.config.js`. Matches v4's new direction.
- **No JS plugin layer** — `darkMode` is a class strategy but everything else lives in CSS.
- Vite plugin for instant rebuilds.
- **No `var(--token)` inside className** — Tailwind v4 generates utilities directly from theme tokens (e.g. `bg-surface` maps to `#131313`).

> See [`design-system.md`](./design-system.md) for the full token list.

### Package manager — pnpm (always)

`pnpm-lock.yaml` is the source of truth. `package-lock.json` is gitignored-by-policy.

- Strict, non-flat `node_modules/` — prevents phantom-dependency bugs.
- Faster installs than npm on large trees.
- Required for `@tailwindcss/vite` and `astro@7` workspaces later.

### TypeScript — strict mode

`tsconfig.json` extends `astro/tsconfigs/strict`. Catch shape errors at build time, not in the browser.

### CMS — Decap CMS (CDN)

**Decap CMS** (Netlify CMS successor) — Git-based, free, runs in the browser. The artist writes Markdown / JSON through a polished admin UI; each save commits to Git. No vendor lock-in, no per-seat cost, no recurring subscription.

We use the **CDN installation** (no npm install of Decap itself) so the admin bundle is never part of the production build. Astro's static output stays small and Decap upgrades itself at runtime.

#### Where it lives

- `public/admin/index.html` — Decap loader (the UI). Served at `/admin/`.
- `public/admin/config.yml` — the schema: which collections, which fields, which widgets.
- `src/content.config.ts` — the Zod mirror of the schema, used by Astro at build time. **Keep this in sync with `config.yml`.**
- `src/content/` — the actual content files (markdown for tattoos, JSON for the rest).
- `src/lib/site.ts` — typed helper that reads `site_settings` and exposes it to components (with a `whatsappLink()` util).

#### Local development workflow

Two terminals, both running concurrently:

```bash
# Terminal 1 — Astro dev server (your normal workflow)
pnpm run dev

# Terminal 2 — local Git backend proxy for Decap CMS
pnpm run cms-dev
# equivalent to: npx decap-server
# listens on http://localhost:8081 by default
```

Then open <http://localhost:4321/admin/>. The `local_backend` block in `config.yml` automatically routes Decap's API calls to the local proxy so you can edit content without setting up GitHub OAuth. The first save will create a local Git commit; that commit will be lost unless you've actually pointed your local repo at a remote.

#### i18n in the CMS

The CMS stores one file per locale for every translatable collection:

- `tattoos` — one `.md` per (locale, slug), nested under `src/content/tattoos/<locale>/`. Editors pick `locale` from a select on create; the file is automatically placed in the right folder.
- `faq` / `sobre` / `site_settings` — three JSON files each, named `es.json`, `en.json`, `ca.json`. Decap surfaces them as three top-level entries (`FAQ & Cuidados · Español`, `… · English`, `… · Català`).

A field-level filter group in the `tattoos` collection lets the artist jump straight to "all English tattoos" or "all Catalán tattoos" in the list view. Always edit the new locale copy, never derive from the Spanish original — the build does no translation. See [`i18n.md`](./i18n.md) for the full architecture.

#### Collections

| Collection | Type | File(s) | What it stores |
|---|---|---|---|
| `tattoos` | Markdown (folder) | `src/content/tattoos/<locale>/<slug>.md` | Gallery portfolio pieces. One file per tattoo+locale; `locale` is duplicated in frontmatter so pages can filter. |
| `faq` | JSON (per locale) | `src/content/faq/{es,en,ca}.json` | FAQ & Cuidados page in each locale: accordion questions, care-step timeline, hygiene protocol cards. |
| `sobre` | JSON (per locale) | `src/content/sobre/{es,en,ca}.json` | Sobre el Artista page in each locale: artist bio, stats, philosophy, styles, press. |
| `site_settings` | JSON (per locale) | `src/content/settings/{es,en,ca}.json` | Global site config in each locale: brand name, tagline, contact, social, hero copy. |

#### Production deploy

The `backend.name: git-gateway` block in `config.yml` is what runs in production. Git Gateway needs a host that brokers OAuth — pick one:

- **Netlify Identity** — easiest. Add the Netlify Identity widget snippet to `public/admin/index.html` and enable Identity + Git Gateway in the Netlify dashboard.
- **Self-hosted Netlify-CMS-Auth** — for non-Netlify hosts, run [`netlify-cms-auth`](https://github.com/vencax/netlify-cms-oauth-provider) on a small Node service and point `backend.base_url` at it.
- **GitHub OAuth directly** — register a GitHub OAuth App and use the [`decap-cms-oauth-provider`](https://github.com/vencax/netlify-cms-github-oauth-provider) bridge. Required for static hosts without Netlify.

Without one of these wired up, the production admin will refuse to load.

---

## Confirmed

### Internationalization — `es` (default), `en`, `ca`

Astro's stable i18n config drives the URL scheme:

```js
// astro.config.mjs
i18n: {
  defaultLocale: "es",
  locales: ["es", "en", "ca"],
  routing: { prefixDefaultLocale: false }
}
```

URL scheme:

| Route | Locale |
|---|---|
| `/` | `es` (Spanish — default, no prefix) |
| `/en/` | `en` (English) |
| `/ca/` | `ca` (Catalan) |
| `/sobre` | `es` |
| `/en/sobre` | `en` |
| `/ca/reserva` | `ca` |
| `/detalle/<slug>` | `es` |
| `/en/detalle/<slug>` | `en` |

Pages live under three file trees:

- `src/pages/sobre.astro` (and friends) — ES, the default
- `src/pages/en/sobre.astro` — EN wrapper
- `src/pages/ca/sobre.astro` — CA wrapper

Each locale wrapper renders the same `<XxxPage locale="…" />` shared component from `src/components/pages/`, so the locale only changes the props, not the markup. The same pattern repeats for `detalle/[slug].astro` per locale.

The `<html lang>` attribute is set in `Layout.astro` from the locale. A compact "ES / EN / CA" dropdown sits in the top bar (`src/components/TopBar.astro`); switching locales preserves the current path (e.g. `/detalle/ouroboros-descent` → `/en/detalle/ouroboros-descent`).

UI strings that do not live in content collections live as dot-notation JSON in `src/i18n/{es,en,ca}.json` and are read through `useTranslations(locale)` from `src/lib/i18n.ts`. The same helper exports `getLocaleFromPath()`, `localizePath()`, and `stripLocale()` for URL plumbing.

Content collections are folder-per-locale (see CMS section above). All schema, paths, and route generation are documented in detail in [`i18n.md`](./i18n.md).

---

## Planned

### Forms — for booking submissions

Pick one (TBD):

- **Formspree** — POST endpoint, free tier 50 submissions/mo, no backend.
- **Web3Forms** — Access-key-based, free tier 250/mo, no signup friction.
- **Mailto:** — `mailto:artist@email.com?subject=Booking` fallback. No JS, no API.

Recommendation: start with **mailto:** for the MVP (zero setup). Move to Formspree if conversion tracking matters.

---

## Decisions we explicitly rejected

- **Next.js / Nuxt / SvelteKit** — overkill for a 6-page portfolio; SSR/RSC complexity adds zero value here.
- **shadcn/ui / Radix / Material UI** — wrong aesthetic. The whole point of "Obsidian & Ink" is editorial brutalism, not generic component-library chrome.
- **Astro React/Vue/Svelte islands** — only add when truly needed (e.g. image modal with shared element transition, lightbox gallery). Avoid by default.
- **CSS-in-JS (styled-components, emotion)** — anti-pattern with Tailwind v4. Use `@theme` in CSS.
- **Headless CMS in the MVP** — adds a vendor before the artist even has content to manage.

---

## Folder conventions

```
src/
├── components/        Astro components (Header, Footer, Section, ...)
├── content/           Content files (read by Astro content collections)
│   ├── tattoos/       One .md per tattoo entry (gallery items)
│   ├── faq.json       FAQ & Cuidados (single JSON)
│   ├── sobre.json     Sobre el Artista (single JSON)
│   └── settings.json  Global site settings (single JSON)
├── content.config.ts  Zod schemas — mirror of public/admin/config.yml
├── layouts/           BaseLayout.astro — wraps every page
├── lib/               Typed helpers (e.g. site.ts → getSiteSettings())
├── pages/             File-based routing → URL
│   ├── index.astro    /                (landing: hero + gallery + process + contact)
│   ├── sobre.astro    /sobre           (artist bio, stats, philosophy, styles, press)
│   ├── reserva.astro  /reserva         (3 session-type cards + booking form + policy)
│   ├── faq.astro      /faq             (FAQ accordion + care steps + hygiene protocol)
│   ├── detalle/       /detalle/<slug>  — one entry per tattoo (getStaticPaths)
│   └── admin/         /admin → 302 → /admin/index.html (Decap CMS UI)
└── styles/
    └── global.css     Tailwind v4 + @theme tokens (Obsidian & Ink)

public/
├── admin/             Decap CMS (CDN, no npm install)
│   ├── index.html     Decap loader + init
│   └── config.yml     Collections, fields, widgets
├── images/            Media uploads from Decap (tattoos/, etc.)
├── favicon.ico
└── favicon.svg
```

## Routes

All 5 main routes are wired and served as static HTML:

- `/` — landing (existing)
- `/sobre` — Sobre el Artista, sourced from `sobre.json`
- `/reserva` — Booking form, posts to `#` (Formspree TBD)
- `/faq` — FAQ + Cuidados, sourced from `faq.json`
- `/detalle/[slug]` — Per-tattoo detail, generated via `getStaticPaths` from the `tattoos` collection (5 pages total)

The TopBar (`src/components/TopBar.astro`) detects the current path via `Astro.url.pathname` and highlights the matching nav item. `Galería` and `Proceso` use anchor links on `/` and `/#...` elsewhere; `Filosofía` and `Contacto` are real routes (`/sobre`, `/reserva`).

---

## Environment

- **Node ≥ 22.12.0** (declared in `package.json` `engines`).
- **pnpm ≥ 10** (the lockfile format is v9+).
- No `.env` required for the MVP. Add one when wiring Formspree/Sanity.