import type { APIRoute } from "astro";
import { configuredSiteUrl } from "../lib/site";

export const GET: APIRoute = ({ site }) => {
  const siteOrigin = site?.origin ?? configuredSiteUrl;
  const lines = ["User-agent: *", "Allow: /", "Disallow: /admin/"];

  if (siteOrigin) {
    lines.push("", `Sitemap: ${new URL("/sitemap-index.xml", siteOrigin).toString()}`);
  }

  return new Response(`${lines.join("\n")}\n`, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
};
