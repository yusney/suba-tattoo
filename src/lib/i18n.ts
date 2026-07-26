import es from "../i18n/es.json";
import en from "../i18n/en.json";
import ca from "../i18n/ca.json";

const dictionaries = { es, en, ca } as const;
export type Locale = keyof typeof dictionaries;
export const DEFAULT_LOCALE: Locale = "es";
export const LOCALES: Locale[] = ["es", "en", "ca"];

export type Translator = ((key: string) => string) & {
  array: (key: string) => string[];
};

export function useTranslations(locale: Locale | string | undefined): Translator {
  const normalized = (locale ?? DEFAULT_LOCALE) as Locale;
  const dict = dictionaries[normalized] ?? dictionaries[DEFAULT_LOCALE];
  const dictObj = dict as unknown as Record<string, unknown>;

  const resolve = (key: string): unknown =>
    key.split(".").reduce<unknown>((acc, k) => {
      if (acc && typeof acc === "object" && k in (acc as Record<string, unknown>)) {
        return (acc as Record<string, unknown>)[k];
      }
      return undefined;
    }, dictObj);

  function t(key: string): string {
    const value = resolve(key);
    return typeof value === "string" ? value : (key as string);
  }

  t.array = (key: string): string[] => {
    const value = resolve(key);
    return Array.isArray(value) ? (value as unknown[]).map((v) => String(v)) : [];
  };

  return t as Translator;
}

/**
 * Extracts the locale from a request path.
 *
 * - `/`                    → "es"  (default)
 * - `/sobre`               → "es"
 * - `/en`, `/en/sobre`     → "en"
 * - `/ca`, `/ca/sobre`     → "ca"
 * - `/en/detalle/foo`      → "en"
 */
export function getLocaleFromPath(pathname: string): Locale {
  const clean = (pathname || "/").replace(/\/+$/, "") || "/";
  const segments = clean.split("/").filter(Boolean);
  const head = segments[0];
  if (head === "en" || head === "ca") return head;
  return DEFAULT_LOCALE;
}

/**
 * Builds a URL under a target locale. If the source path already has a locale
 * prefix it is replaced; if it does not, the new prefix is added (unless the
 * target is the default locale).
 */
export function localizePath(pathname: string, target: Locale): string {
  const clean = (pathname || "/").replace(/\/+$/, "") || "/";
  const segments = clean.split("/").filter(Boolean);
  const head = segments[0];
  let tail = clean;
  if (head === "es" || head === "en" || head === "ca") {
    tail = "/" + segments.slice(1).join("/");
  }
  if (tail === "/") tail = "";
  if (target === DEFAULT_LOCALE) return tail === "" ? "/" : tail;
  return tail === "" ? `/${target}` : `/${target}${tail}`;
}

/**
 * Strip the locale prefix from a pathname. Used by components that need to
 * render locale-agnostic links (e.g. anchors in a hero section).
 */
export function stripLocale(pathname: string): string {
  const localized = (pathname || "/").replace(/\/+$/, "") || "/";
  const segments = localized.split("/").filter(Boolean);
  const head = segments[0];
  if (head === "es" || head === "en" || head === "ca") {
    const rest = segments.slice(1).join("/");
    return rest === "" ? "/" : `/${rest}`;
  }
  return localized === "/" ? "/" : localized;
}
