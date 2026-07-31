import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

/**
 * Content collections for SUBA TATTOO.
 *
 * The schema here mirrors `public/admin/config.yml` 1:1 so that the Decap CMS
 * (and any human editing the markdown / JSON directly) validate the same
 * shape. Field names and types must stay in sync.
 *
 * - `tattoos`       → gallery portfolio pieces (one .md per (locale, slug))
 * - `faq`           → FAQ & Cuidados page (one JSON per locale under faq/)
 * - `sobre`         → Sobre el Artista page (one JSON per locale under sobre/)
 * - `site_settings` → global site config (one JSON per locale under settings/)
 *
 * i18n layout:
 *   src/content/tattoos/<locale>/<slug>.md   (locale in frontmatter too)
 *   src/content/faq/<locale>.json
 *   src/content/sobre/<locale>.json
 *   src/content/settings/<locale>.json
 *
 * For `tattoos`, glob picks up every .md file regardless of locale folder;
 * pages filter by the `locale` field on the frontmatter.
 *
 * For the single-document JSON collections, the entry id is derived from the
 * filename (`es`, `en`, `ca`) so callers do `getEntry("site_settings", "es")`.
 */

const sharedStyleEnum = z.enum([
  "Blackwork",
  "Realismo",
  "Fine Line",
  "Illustrative Color",
  "Geométrico",
  "Dark Art",
]);

const sharedCategoryEnum = z.enum(["Blackwork", "Realismo", "Fine Line", "Color"]);

// ---------------------------------------------------------------------------
// TATTOOS
// ---------------------------------------------------------------------------
const tattoos = defineCollection({
  loader: glob({
    pattern: "**/*.md",
    base: "./src/content/tattoos",
    // The default glob id is the filename (without extension). Since the same
    // slug exists in es/, en/, ca/, we generate a unique id keyed off the
    // folder: `<locale>/<slug>`. Pages look up entries by slug only and filter
    // by `entry.data.locale`.
    generateId: ({ entry }: { entry: string }) =>
      entry.replace(/\.md$/, "").replace(/^\/+/, ""),
  }),
  schema: z.object({
    locale: z.enum(["es", "en", "ca"]).optional(),
    title: z.string().trim().min(1).optional(),
    slug: z.string(),
    date: z.coerce.date(),
    year: z.number().int().min(2014).max(2100),
    style: sharedStyleEnum,
    category: sharedCategoryEnum,
    featured: z.boolean().default(false),
    image: z.string(),
    alt_text: z.string().trim().min(1, "alt_text is required for a11y").optional(),
    client_name: z.string().optional(),
    needles: z.string().optional(),
    duration_hours: z.number().optional(),
    sessions: z.number().int().default(1),
    body_part: z.string().optional(),
    size_cm: z.string().optional(),
    description: z.string().optional(),
    testimonial: z.string().optional(),
  }),
});

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------
const faq = defineCollection({
  loader: glob({ pattern: "{es,en,ca}.json", base: "./src/content/faq" }),
  schema: z.object({
    sections: z.array(
      z.object({
        category_label: z.string(),
        page_title: z.string(),
        page_subtitle: z.string(),
        questions: z
          .array(
            z.object({
              question: z.string(),
              answer: z.string(),
            }),
          )
          .optional(),
        care_steps: z
          .array(
            z.object({
              step_number: z.number().int().min(1).max(4),
              title: z.string(),
              description: z.string(),
            }),
          )
          .optional(),
        protocol_items: z
          .array(
            z.object({
              icon: z.enum([
                "cleaning_services",
                "medical_services",
                "shield",
                "local_hospital",
                "sanitizer",
              ]),
              title: z.string(),
              description: z.string(),
            }),
          )
          .optional(),
      }),
    ),
  }),
});

// ---------------------------------------------------------------------------
// SOBRE
// ---------------------------------------------------------------------------
const sobre = defineCollection({
  loader: glob({ pattern: "{es,en,ca}.json", base: "./src/content/sobre" }),
  schema: z.object({
    artist_name: z.string().default("Joshua Jiménez Buendía"),
    artist_subtitle: z
      .string()
      .default("ARTIST · BARCELONA · 2014 — PRESENTE"),
    intro_text: z.string(),
    stats: z.array(
      z.object({
        number: z.string(),
        label: z.string(),
      }),
    ),
    filosofia_text: z.string(),
    styles: z.array(
      z.object({
        name: z.string(),
        description: z.string(),
        image: z.string().optional(),
      }),
    ),
    featured_in: z.array(
      z.object({
        publication_name: z.string(),
      }),
    ),
  }),
});

// ---------------------------------------------------------------------------
// SITE SETTINGS
// ---------------------------------------------------------------------------
const site_settings = defineCollection({
  loader: glob({ pattern: "{es,en,ca}.json", base: "./src/content/settings" }),
  schema: z.object({
    brand_name: z.string().default("SUBA TATTOO"),
    tagline: z.string().default("Technical Precision. Artistic Rawness."),
    location: z.string().default("Barcelona · Underground Studio"),
    contact_email: z.string().email(),
    instagram_url: z.string().url().optional(),
    instagram_url_secondary: z.string().url().optional(),
    whatsapp_number: z.string().optional(),
    address: z.string().optional(),
    hero_headline_line_1: z.string(),
    hero_headline_line_2_stroke: z.string(),
    hero_subtitle: z.string(),
    about_short: z.string(),
    opening_hours: z.string().optional(),
  }),
});

export const collections = {
  tattoos,
  faq,
  sobre,
  site_settings,
};
