# Stitch screens inventory

Reference designs live in Stitch (project `4316879983354984712`, design system `assets/0f2dbbd3d335448e9d8f6a049822a4b9`). Local HTML copies are in [`templates/`](./templates/) for offline reference.

> When two versions exist, **v2 is the canonical reference** — it uses the correct "SUBA TATTOO" branding (the originals inherited "Artemisa Tattoo" from the design-system probe).

| # | Pantalla | Versiones | IDs | Dimensiones | HTML local | Estado Astro |
|---|---|---|---|---|---|---|
| 1 | Landing Desktop | 1 | `1848ca1843fe456692a995dd94482ab4` | 2560×9164 | [`01-landing-desktop.html`](./templates/01-landing-desktop.html) | ✅ Ported to Astro |
| 2 | Landing Mobile | 1 | `97813a3bef9b482cae809103af84e203` | 780×12454 | [`02-mobile.html`](./templates/02-mobile.html) | ✅ Responsive (single flow at landing) |
| 3 | Sobre el Artista | 2 | v1: `06063e423c4045db8c1489bce5faae94` · **v2 ✓ canonical**: `ce2fab133c044964b7296884f084745e` | v1: 2560×7868 · v2: 2560×8544 | [`03-sobre-artista-v1.html`](./templates/03-sobre-artista-v1.html) · [`03-sobre-artista-v2.html`](./templates/03-sobre-artista-v2.html) | ✅ Ported to Astro (`/sobre`) |
| 4 | Reserva / Booking | 2 | v1: `630ba09424c54227a212cfec4e05e6ae` · **v2 ✓ canonical**: `df0017071bbe4f7e8fdf9a682b4bd1cb` | v1: 2560×4824 · v2: 2560×4366 | [`04-reserva-v1.html`](./templates/04-reserva-v1.html) · [`04-reserva-v2.html`](./templates/04-reserva-v2.html) | ✅ Ported to Astro (`/reserva`) |
| 5 | FAQ & Cuidados | 2 | v1: `9e2812d33aa940bb94d2da60717f43d9` · **v2 ✓ canonical**: `78dd8a15f4e9418b83fd9de9a114007a` | v1: 2560×7556 · v2: 2560×7180 | [`05-faq-v1.html`](./templates/05-faq-v1.html) · [`05-faq-v2.html`](./templates/05-faq-v2.html) | ✅ Ported to Astro (`/faq`) |
| 6 | Vista Detalle (Ouroboros) | 1 | `1ba5ee7fe0c245289cdf6c950c33a043` | 2560×8122 | [`06-vista-detalle.html`](./templates/06-vista-detalle.html) | ✅ Ported to Astro (`/detalle/[slug]`) |

**Total:** 9 HTML files, 6 distinct screens.

---

## Stitch project metadata

- **Project ID:** `4316879983354984712`
- **Design system asset:** `assets/0f2dbbd3d335448e9d8f6a049822a4b9` ("Obsidian & Ink")
- **Available tools:** `stitch_generate_screen_from_text`, `stitch_edit_screens`, `stitch_generate_variants`, `stitch_list_screens`, `stitch_get_screen`, `stitch_apply_design_system`

## How to use this inventory

1. **Implementing a page?** Open the matching `0X-*.html` in `templates/` and copy the structure. Strip out the Tailwind CDN script — the real project uses Tailwind v4 via `@tailwindcss/vite`.
2. **Need a new variant?** Call `stitch_generate_variants` on the canonical v2 ID with `creativeRange: "REFINE"` for subtle tweaks, or `EXPLORE` for bolder ideas.
3. **Editing the design system?** Use `stitch_apply_design_system` to re-skin an existing screen.
4. **Adding a new screen?** Call `stitch_generate_screen_from_text` with the project + design-system IDs and a prompt in the same style as the existing ones (300–400 words, direct, no nested sub-layouts).

## Known quirks (from generation phase)

- Stitch responses can take 3–7 minutes — retries after timeouts often succeed.
- About 50% of prompts produce a duplicate. v2 of each is the branded one.
- The mobile variant (screen 2) is 780×12454 — extremely tall. Treat mobile as a single-column flow rather than a desktop layout shrunk down.