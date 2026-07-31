import { getCollection } from "astro:content";
import type { CollectionEntry } from "astro:content";
import { DEFAULT_LOCALE } from "./i18n";
import type { Locale } from "./i18n";

const TATTOO_LOCALES = ["es", "en", "ca"] as const;

type TattooLocale = (typeof TATTOO_LOCALES)[number];
type TattooEntry = CollectionEntry<"tattoos">;
type TattooData = TattooEntry["data"];

export interface NormalizedTattooData extends Omit<TattooData, "locale" | "title" | "alt_text"> {
  locale: Locale;
  title: string;
  alt_text: string;
}

export interface NormalizedTattoo extends Omit<TattooEntry, "data"> {
  data: NormalizedTattooData;
}

function isLocale(value: string | undefined): value is TattooLocale {
  return value !== undefined && TATTOO_LOCALES.includes(value as TattooLocale);
}

function localeFromId(id: string): TattooLocale | undefined {
  const firstSegment = id.split("/")[0];
  return isLocale(firstSegment) ? firstSegment : undefined;
}

function entryLocale(entry: TattooEntry): Locale {
  return entry.data.locale ?? localeFromId(entry.id) ?? DEFAULT_LOCALE;
}

function folderLocale(entry: TattooEntry): Locale | undefined {
  return localeFromId(entry.id);
}

function hasValue(value: unknown): boolean {
  if (typeof value === "string") return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return value !== undefined && value !== null;
}

function completeness(entry: TattooEntry): number {
  return Object.values(entry.data).filter(hasValue).length;
}

function compareSourceEntries(a: TattooEntry, b: TattooEntry): number {
  const completenessDifference = completeness(b) - completeness(a);
  if (completenessDifference !== 0) return completenessDifference;

  const aIsDefault = entryLocale(a) === DEFAULT_LOCALE;
  const bIsDefault = entryLocale(b) === DEFAULT_LOCALE;
  if (aIsDefault !== bIsDefault) return aIsDefault ? -1 : 1;

  return a.id.localeCompare(b.id);
}

function normalizeEntry(entry: TattooEntry, source: TattooEntry): NormalizedTattoo {
  const locale = folderLocale(entry) ?? entryLocale(entry);
  const title = entry.data.title ?? source.data.title ?? entry.data.slug;
  const altText = entry.data.alt_text ?? source.data.alt_text ?? `Tattoo artwork: ${title}`;
  const data: NormalizedTattooData = {
    ...source.data,
    ...entry.data,
    locale,
    title,
    alt_text: altText,
  };

  return { ...entry, data };
}

export async function getTattoos(): Promise<NormalizedTattoo[]> {
  const entries = await getCollection("tattoos");
  const entriesBySlug = new Map<string, TattooEntry[]>();

  for (const entry of entries) {
    const slugEntries = entriesBySlug.get(entry.data.slug) ?? [];
    slugEntries.push(entry);
    entriesBySlug.set(entry.data.slug, slugEntries);
  }

  const sourceBySlug = new Map<string, TattooEntry>();
  for (const [slug, slugEntries] of entriesBySlug) {
    sourceBySlug.set(slug, [...slugEntries].sort(compareSourceEntries)[0]);
  }

  return entries.map((entry) => normalizeEntry(entry, sourceBySlug.get(entry.data.slug) ?? entry));
}
