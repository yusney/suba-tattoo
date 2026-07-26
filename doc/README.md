# SUBA TATTOO

**Technical Precision. Artistic Rawness.**

Brand: Barcelona (Montcada i Reixac) underground tattoo studio — a portfolio site for a single artist who works in realism, blackwork, color, and fine line. The site doubles as a booking funnel: visitors browse curated work, read the philosophy, and request a valuation for a custom piece.

---

## Project structure

```
suba_tattoo/
├── doc/                  Project documentation & Stitch references
│   ├── README.md         (this file)
│   ├── design-system.md  Obsidian & Ink tokens (colors, type, spacing, components)
│   ├── content-model.md  Field-by-field content collection schema
│   ├── screens.md        Stitch screens inventory (IDs, dimensions, local HTML)
│   ├── stack.md          Architecture decisions (Astro, Tailwind v4, pnpm, Decap)
│   └── templates/        9 Stitch HTML files (reference designs)
├── public/               Static assets (favicon, Decap CMS admin, uploaded images)
│   └── admin/            Decap CMS UI (CDN, no npm install)
├── src/                  Astro source code
│   ├── components/
│   ├── content/          Content files: tattoos/, faq.json, sobre.json, settings.json
│   ├── content.config.ts Zod schemas (mirror of public/admin/config.yml)
│   ├── layouts/
│   ├── lib/              Typed helpers (site.ts)
│   ├── pages/
│   └── styles/
├── astro.config.mjs
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
└── AGENTS.md             AI agent instructions for this project
```

> The `node_modules/`, `dist/`, and `.astro/` folders are excluded for clarity.

---

## Quick start

This project uses **pnpm** exclusively — `npm` and `yarn` are not supported here.

```bash
# 1. Install dependencies
pnpm install

# 2. Start the dev server (http://localhost:4321)
pnpm run dev
# or run detached:
pnpm run dev --background
# then manage with: pnpm run dev stop | status | logs

# 3. Build for production
pnpm run build
```

Astro hot-reloads on file changes, so you rarely need to restart the dev server.

---

## Where to go next

- Building a new component? → [`doc/design-system.md`](./design-system.md) for tokens & component patterns.
- Adding a page? → [`doc/screens.md`](./screens.md) for the Stitch reference (look up the matching HTML in `templates/`).
- Picking a library? → [`doc/stack.md`](./stack.md) for the architecture decisions.
- Editing content (tattoos, FAQ, about, settings)? → [`doc/content-model.md`](./content-model.md) for the field-by-field schema.
- Implementing a specific screen? → open the matching file in [`doc/templates/`](./templates/).