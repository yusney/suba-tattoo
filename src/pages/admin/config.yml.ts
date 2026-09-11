import type { APIRoute } from "astro";
import template from "../../cms/config.yml?raw";
import { configuredSiteUrl } from "../../lib/site";

// Renders the Decap CMS config at build time, injecting the PUBLIC_SITE_URL
// origin into the __SITE_URL__ token of src/cms/config.yml. Decap reads
// config.yml at runtime and does NOT support env-var interpolation in the
// YAML, so the substitution MUST happen here (see astro.config.mjs / site.ts
// for the canonical-origin validation). This keeps the real domain out of the
// repository while the served /admin/config.yml stays environment-correct.
export const GET: APIRoute = ({ site }) => {
  const siteOrigin = site?.origin ?? configuredSiteUrl;
  if (!siteOrigin) {
    throw new Error(
      "[admin/config.yml] Missing site origin — set PUBLIC_SITE_URL so the Decap OAuth base_url can be emitted.",
    );
  }

  const body = template.replaceAll(
    "__SITE_URL__",
    siteOrigin.replace(/\/+$/, ""),
  );

  return new Response(body, {
    headers: {
      "Content-Type": "application/x-yaml; charset=utf-8",
    },
  });
};
