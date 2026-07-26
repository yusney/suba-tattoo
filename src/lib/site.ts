import { getEntry } from "astro:content";
import { DEFAULT_LOCALE, type Locale } from "./i18n";

export interface SiteSettings {
  brand_name: string;
  tagline: string;
  location: string;
  contact_email: string;
  instagram_url?: string;
  instagram_url_secondary?: string;
  whatsapp_number?: string;
  address?: string;
  hero_headline_line_1: string;
  hero_headline_line_2_stroke: string;
  hero_subtitle: string;
  about_short: string;
  opening_hours?: string;
}

const cache = new Map<Locale, SiteSettings>();

/**
 * Reads the per-locale `src/content/settings/<locale>.json` file from the
 * `site_settings` collection. Result is memoized per locale.
 */
export async function getSiteSettings(locale: Locale = DEFAULT_LOCALE): Promise<SiteSettings> {
  if (cache.has(locale)) return cache.get(locale)!;
  const entry = await getEntry("site_settings", locale);
  if (!entry) {
    throw new Error(
      `[site.ts] Missing src/content/settings/${locale}.json — the site_settings collection has no entry for locale "${locale}".`,
    );
  }
  const data = entry.data as unknown as SiteSettings;
  cache.set(locale, data);
  return data;
}

/**
 * Returns a wa.me link from a phone number in international format.
 * Strips spaces, dashes, and parentheses. Falls back to "#" if no number.
 */
export function whatsappLink(phone: string | undefined): string {
  if (!phone) return "#";
  const cleaned = phone.replace(/[\s\-()]/g, "");
  return `https://wa.me/${cleaned}`;
}
