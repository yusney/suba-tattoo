# Content Model

A short tour of the four content collections that power the SUBA TATTOO site. The schema lives in two places that must stay in sync: `public/admin/config.yml` (what Decap renders in the admin UI) and `src/content.config.ts` (what Astro validates at build time). Field names, types, and required flags are identical between the two.

## Locale separation

The site ships in three locales: `es` (default), `en`, `ca`. Each translatable collection stores one entry per locale:

- `tattoos/<locale>/<slug>.md`
- `faq/{es,en,ca}.json`
- `sobre/{es,en,ca}.json`
- `site_settings/{es,en,ca}.json`

For `tattoos`, the locale also lives as a frontmatter field so pages can filter by it without parsing the path. The Zod schema validates it (`z.enum(["es", "en", "ca"])`); the same values appear in the Decap CMS select widget so the editor never gets the folder name wrong.

URL scheme:

| Locale | URLs |
|---|---|
| `es` (default, no prefix) | `/`, `/sobre`, `/reserva`, `/faq`, `/detalle/<slug>` |
| `en` | `/en/`, `/en/sobre`, … |
| `ca` | `/ca/`, `/ca/sobre`, … |

See [`i18n.md`](./i18n.md) for the full architecture.

## `tattoos`

**Where:** `src/content/tattoos/<locale>/<slug>.md` (one Markdown file per piece per locale)

The portfolio. Each file is one tattoo shown in the gallery on the home page and the slug pages at `/detalle/<slug>`. Frontmatter is the full schema; the body of the .md is currently unused (kept for future artist notes / longer descriptions).

The `image` field accepts either a relative path to a file under `public/` (the typical Decap upload destination) or an absolute URL (handy while the artist is still using placeholder photos from the Stitch prototypes). The `featured: true` flag marks the single piece that gets the large 2-column card at the top of the gallery grid — only one piece should be featured at a time within a locale.

`category` is a coarser set of values than `style` and is what powers the filter chips on the home page; the chips are rendered dynamically from the unique values found in the current locale's collection, so adding a new category is automatic.

## `faq`

**Where:** `src/content/faq/{es,en,ca}.json` (one JSON per locale, three sections)

The full FAQ & Cuidados page in one file. The file holds a `sections` array; each section is either a questions accordion, a care-steps timeline, or a protocol-items grid, picked by which optional array is present on that section object. The `category_label` is the JetBrains Mono eyebrow shown above each section's title.

`care_steps` are the four cards in the post-session timeline (numbered 1–4 by `step_number`); `protocol_items` are the three hygiene protocol cards (icon is one of the five Material Symbols names listed in the schema).

## `sobre`

**Where:** `src/content/sobre/{es,en,ca}.json`

The Sobre el Artista page. The artist bio (`intro_text` and `filosofia_text`) is one long string — paragraphs are separated by a blank line and split in the renderer. `stats` is exactly 4 highlight numbers (years, pieces, styles, etc.); `styles` is exactly 6 cards (the six styles the artist masters, with optional reference images); `featured_in` is the press strip at the bottom.

## `site_settings`

**Where:** `src/content/settings/{es,en,ca}.json`

The single source of truth for the brand per locale. Anything that appears in more than one place in a given locale (the brand name, the hero copy, the about blurb) lives here so the artist can update it once. Components that need it import `getSiteSettings(locale)` from `src/lib/site.ts`, which memoizes results per locale for the build.

The `hero_headline_line_1` and `hero_headline_line_2_stroke` fields are the two halves of the H1 on the home page — the first rendered solid, the second rendered with the `text-stroke` class for the outlined-word effect. `about_short` is used as the meta description across pages.

Note: `contact_email`, `instagram_url`, `whatsapp_number`, and `address` are **not translation copy** — they are real values (URLs, phone numbers, addresses) and may be identical or slightly different across locales; only the labels around them change.

## Editing workflow

**Local** — open <http://localhost:4321/admin/> after running `pnpm run cms-dev` in a second terminal. Saves go to your local Git index; commit them when you're ready. The CMS surfaces the per-locale entries as separate files in the sidebar.

**Production** — depends on the Git Gateway host (Netlify Identity is the easiest). See [`stack.md`](./stack.md#production-deploy) for setup options.
