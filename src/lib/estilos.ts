import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { DEFAULT_LOCALE } from "./i18n";
import type { Locale } from "./i18n";

export type EstiloEntry = CollectionEntry<"estilos">;

/** Style landing pages of one locale, in their configured order. */
export async function getEstilos(locale: Locale): Promise<EstiloEntry[]> {
  const all = await getCollection("estilos", (entry) => entry.data.locale === locale);
  return all.sort((a, b) => a.data.order - b.data.order || a.data.title.localeCompare(b.data.title));
}

/** URL of a style landing page (always with the trailing slash the site serves). */
export function estiloHref(locale: Locale, slug: string): string {
  return locale === DEFAULT_LOCALE ? `/estilos/${slug}/` : `/${locale}/estilos/${slug}/`;
}

/**
 * Map from a tattoo `style` value to its landing page URL in `locale`, for
 * linking galleries and tattoo pages to the style page. Styles without a page
 * are simply absent, so callers can fall back to the gallery filter.
 */
export async function getEstiloHrefByStyle(locale: Locale): Promise<Map<string, string>> {
  const estilos = await getEstilos(locale);
  return new Map(estilos.map((entry) => [entry.data.style, estiloHref(locale, entry.data.slug)]));
}
