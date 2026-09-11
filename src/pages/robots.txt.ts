import type { APIRoute } from "astro";
import { configuredSiteUrl } from "../lib/site";

export const GET: APIRoute = ({ site }) => {
  const siteOrigin = site?.origin ?? configuredSiteUrl;
  if (!siteOrigin) {
    throw new Error(
      "[robots.txt] Missing site origin — set PUBLIC_SITE_URL so the sitemap URL can always be emitted.",
    );
  }
  const lines = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /admin/",
    "",
    `Sitemap: ${new URL("/sitemap-index.xml", siteOrigin).toString()}`,
  ];

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
