# SUBA TATTOO

> **Technical Precision. Artistic Rawness.**

Underground tattoo studio portfolio & booking site for **Joshua Jiménez Buendía**, based in Montcada i Reixac (Barcelona). Realism, Blackwork, Color and Fine Line.

- **Pre-production / staging** (current): [https://suba.donduque.dev](https://suba.donduque.dev)
- **Admin panel**: [https://suba.donduque.dev/admin/](https://suba.donduque.dev/admin/)
- **Production**: TBD — when the client purchases their own domain, the same Dokploy pipeline serves it.
- **Repository**: [github.com/yusney/suba-tattoo](https://github.com/yusney/suba-tattoo)

> **Note on environments.** `suba.donduque.dev` is a subdomain of the developer's main domain (`donduque.dev`) used as a **pre-production preview** for the artist to review work in progress. The final production domain will be different (the artist's own domain, e.g. `subatattoo.com` or similar) and will be configured at the same Dokploy pipeline when available. All config files (`astro.config.mjs`, `public/robots.txt`, `public/admin/config.yml`) currently point to the staging URL — they are swapped to the production URL when ready, no code changes required.

---

## Roles

This project has three roles working on it. They are documented here so everyone knows what they own.

### 🛠️ Developer (yusney)

Owns the codebase, the infrastructure, and the deploy pipeline. Responsible for:

- Maintaining the Astro/Tailwind code in this repo.
- Designing the visual system (Obsidian & Ink tokens in `src/styles/global.css`).
- Wiring i18n (Spanish, English, Catalan) and Decap CMS.
- Deploying via Dokploy on the VPS, including Docker, nginx, and the auto-deploy webhook.
- Configuring DNS, SSL, GitHub OAuth App, and any production-only env vars.
- Reviewing and merging content changes that touch code or schema (e.g. new collections, new frontmatter fields).
- Responding to anything technical: build failures, broken CSS, CMS auth errors.

Does **not** edit tattoo content, copy, photos, or prices — that's the artist's domain.

### ✒️ Artist (Joshua)

Owns the brand, the visual identity of the work, and the customer relationship. Responsible for:

- Deciding what work is shown publicly and what stays private.
- Providing high-resolution photos of finished pieces (with consent) for the gallery.
- Writing artist notes, descriptions, testimonials, and any first-person copy.
- Approving any client testimonial that names them.
- Reviewing the live site periodically and flagging anything off-brand.

Does **not** touch code, configuration, or deploy — hands changes through the developer.

### 📝 Content manager (anyone Joshua authorizes)

The day-to-day editor of the site. Works entirely through `/admin/` — no code involved. Responsible for:

- Adding new tattoos as they're completed: photo, title, style, needles, duration, body part, size, year, testimonial.
- Translating entries to English and Catalan (or flagging when translations are needed).
- Updating the FAQ when new questions come up.
- Updating `site_settings` with new contact info, opening hours, or social handles.

Authorization: added as a GitHub collaborator with write access, or part of a GitHub Org with the project.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | Astro 7.1 (static output) | Fast, islands where needed, ships 28 pages in ~1s |
| Styling | Tailwind v4 (CSS-based `@theme` config) | Matches the Obsidian & Ink token system, no JS runtime cost |
| CMS | Decap CMS (Git-based, CDN-loaded) | No backend; the artist edits files directly via Git commits |
| Content storage | Astro Content Collections + folder-per-locale | Markdown for tattoos, JSON for FAQ/Sobre/Settings |
| Forms (planned) | Formspree | Form already has all `name` attrs; just wire the endpoint |
| i18n | Astro i18n + per-locale content folders | Default `es` (no prefix), `en` and `ca` prefixed |
| Package manager | **pnpm** exclusively | Lockfile committed; `npm` and `yarn` not supported |
| Deploy | Dokploy + Dockerfile + nginx + Traefik (SSL) | Self-hosted on user's VPS |
| Language (admin copy) | Spanish (Rioplatense), English, Catalan | All UI strings live in `src/i18n/{es,en,ca}.json` |

---

## Local development

```bash
# 1. Install deps (pnpm only — see package.json note)
pnpm install

# 2. Dev server
pnpm run dev                 # foreground
pnpm run dev --background    # detached, then: stop | status | logs

# 3. CMS local backend (separate terminal)
pnpm run cms-dev              # runs decap-server on :8081

# 4. Production build
pnpm run build                # outputs to dist/, ~1s
pnpm run preview              # serve dist/ locally
```

Visit:

- Site → http://localhost:4321
- Admin → http://localhost:4321/admin/

---

## Repository layout

```
suba-tattoo/
├── README.md                     (this file — project overview & roles)
├── DEPLOY.md                     (Dokploy + DNS + OAuth + webhook walkthrough)
├── AGENTS.md                     (AI agent instructions for this project)
├── astro.config.mjs              (Astro config: i18n, sitemap, Tailwind v4)
├── package.json                  (pnpm-only, "name": "suba-tattoo")
├── pnpm-lock.yaml                (committed)
├── tsconfig.json
├── Dockerfile                    (multi-stage Node 24 → nginx 1.27 alpine)
├── nginx.conf                    (cache strategy, security headers, SPA routing)
├── .dockerignore
├── public/                       (static assets, served as-is)
│   ├── admin/                    (Decap CMS — CDN-loaded, no npm install)
│   ├── favicon.svg
│   └── images/                   (tattoos, styles, hero, sobre, reserva, og/)
├── src/
│   ├── components/               (Astro components, see "Conventions" below)
│   ├── content/                  (per-locale content: tattoos/, faq.json, sobre.json, settings.json)
│   ├── content.config.ts         (Zod schemas for content collections)
│   ├── i18n/                     (es.json, en.json, ca.json — UI strings)
│   ├── layouts/                  (Layout.astro is the SEO head wrapper)
│   ├── lib/                      (site.ts, i18n.ts helpers)
│   ├── pages/                    (route entries per locale, + page wrappers)
│   └── styles/
│       └── global.css            (Obsidian & Ink tokens + animations + reduced-motion)
└── doc/                          (deeper docs — read these before touching the project)
    ├── design-system.md          (Obsidian & Ink spec, component patterns)
    ├── content-model.md          (Field-by-field schema for every collection)
    ├── stack.md                  (Architecture decisions and why)
    ├── screens.md                (Stitch-generated reference screens, IDs)
    ├── i18n.md                   (i18n URL structure and translation workflow)
    ├── seo.md                    (SEO meta, OG, sitemap, hreflang setup)
    └── templates/                (9 reference HTML files from Stitch)
```

---

## Conventions

- **pnpm only.** Never `npm install` or `yarn`. The Dockerfile uses corepack to enable pnpm inside the build stage.
- **No new dependencies without checking.** If you need a library, read `doc/stack.md` first — many things can be done with vanilla CSS or Astro primitives.
- **No mocks in production code.** Fake data lives only in `src/content/` as seed content; replace via Decap CMS in production.
- **Hardcoded strings must be translated.** Add keys to all three of `src/i18n/{es,en,ca}.json`. Use `src/lib/i18n.ts`'s `useTranslations(locale)` helper.
- **Brand voice is dark brutalist editorial.** See `doc/design-system.md`. Sharp 0px corners, no glassmorphism, no rounded elements. Respect `prefers-reduced-motion`.
- **Animations are CSS-only.** No GSAP, no Framer. Use `IntersectionObserver` for scroll-driven reveals.
- **Mobile-first.** Every layout should work at 375px first, then scale up.

---

## Deployment

Full walkthrough in [`DEPLOY.md`](./DEPLOY.md). Summary:

1. Code is pushed to `github.com/yusney/suba-tattoo`.
2. Dokploy has a webhook on push → `main`.
3. Dokploy builds the Docker image and runs it on port 80.
4. Traefik (in front of Dokploy) handles SSL with Let's Encrypt.
5. The site is reachable at the configured domain (currently `suba.donduque.dev` for staging).

For content updates from `/admin/`, Decap commits to the same repo → Dokploy rebuilds automatically → live in ~2 minutes.

---

## License & rights

- **Code**: © 2026 yusney. All rights reserved.
- **Brand & visual identity**: © 2026 Joshua Jiménez Buendía / SUBA TATTOO. All rights reserved.
- **Photographs of tattoo work**: © Joshua Jiménez Buendía / SUBA TATTOO (and respective clients where applicable). Used with consent.
- **Stitch-generated AI placeholders** (`public/images/tattoos/*.jpg`, `public/images/styles/*.jpg`, `public/images/sobre/artist-portrait.jpg`): temporary placeholders, replace with real photos via `/admin/` before public launch.