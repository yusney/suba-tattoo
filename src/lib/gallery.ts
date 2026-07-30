import { getCollection } from "astro:content";
import type { Locale } from "./i18n";

export const GALLERY_PAGE_SIZE = 18;

export async function getGalleryTattoos(locale: Locale) {
  const allTattoos = await getCollection("tattoos");
  return allTattoos
    .filter((entry) => entry.data.locale === locale)
    .sort((a, b) => +b.data.date - +a.data.date);
}

export function getGalleryPageHref(locale: Locale, page: number) {
  const base = locale === "es" ? "/galeria" : `/${locale}/galeria`;
  return page === 1 ? base : `${base}/${page}`;
}
