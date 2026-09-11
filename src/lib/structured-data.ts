import type { SiteSettings } from "./site";

const SCHEMA_CONTEXT = "https://schema.org";

/**
 * Builds the site-wide `TattooShop` (LocalBusiness) JSON-LD. Emitted on every
 * page from Layout so Google can resolve the business entity (NAP, hours,
 * social profiles) site-wide.
 *
 * `geo` is preferred for a structured PostalAddress; when absent it falls back
 * to the plain-text `address` field (schema.org accepts Text there too).
 */
export function buildTattooShopSchema(settings: SiteSettings, siteOrigin: string) {
  const sameAs = [settings.instagram_url, settings.instagram_url_secondary].filter(
    (url): url is string => Boolean(url),
  );

  const address = settings.geo
    ? {
        "@type": "PostalAddress",
        streetAddress: settings.geo.street,
        postalCode: settings.geo.postal_code,
        addressLocality: settings.geo.city,
        addressRegion: settings.geo.region,
        addressCountry: "ES",
      }
    : settings.address;

  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "TattooShop",
    name: settings.brand_name,
    url: new URL("/", siteOrigin).toString(),
    email: settings.contact_email,
    ...(address ? { address } : {}),
    ...(settings.schema_opening_hours ? { openingHours: settings.schema_opening_hours } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    areaServed: settings.location,
  };
}

/**
 * Builds a `FAQPage` JSON-LD from the FAQ questions. Only render it on the page
 * that actually shows those questions (Google expects the markup to match the
 * visible content).
 */
export function buildFaqSchema(questions: { question: string; answer: string }[]) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "FAQPage",
    mainEntity: questions.map((q) => ({
      "@type": "Question",
      name: q.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: q.answer,
      },
    })),
  };
}

export interface ArtworkSchemaInput {
  title: string;
  description?: string;
  image: string;
  year?: number;
  style?: string;
  studioName: string;
  siteOrigin: string;
  pageUrl: string;
}

/**
 * Builds a `VisualArtwork` JSON-LD for a portfolio piece detail page.
 */
export function buildArtworkSchema({
  title,
  description,
  image,
  year,
  style,
  studioName,
  siteOrigin,
  pageUrl,
}: ArtworkSchemaInput) {
  return {
    "@context": SCHEMA_CONTEXT,
    "@type": "VisualArtwork",
    name: title,
    ...(description ? { description } : {}),
    image: new URL(image, siteOrigin).toString(),
    ...(year ? { dateCreated: String(year) } : {}),
    ...(style ? { artMedium: style, artform: "Tattoo" } : {}),
    creator: { "@type": "Organization", name: studioName },
    url: pageUrl,
  };
}
