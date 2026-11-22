#!/usr/bin/env node
// Post-build check for self-hosted fonts (runs as part of `pnpm build`).
//
// The Astro Fonts API downloads the text fonts from Google at build time. If
// that lookup fails, Astro only logs "No data found for font family ..." and
// the build still succeeds, shipping pages that silently fall back to system
// fonts. This check turns that into a failed build (locally and in the Docker
// build that CI runs): every font CSS variable must be defined in the built
// home page and every @font-face URL must exist in dist/.
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const dist = resolve(process.cwd(), "dist");
const html = readFileSync(resolve(dist, "index.html"), "utf8");

// Keep in sync with the `fonts` entries in astro.config.mjs.
const REQUIRED_VARIABLES = ["--font-syne", "--font-plus-jakarta-sans", "--font-jetbrains-mono"];

const problems = [];
for (const variable of REQUIRED_VARIABLES) {
  if (!new RegExp(`${variable}:`).test(html)) problems.push(`${variable} is not defined`);
}

const faces = html.match(/@font-face\{[^}]*\}/g) ?? [];
// Unique: several weights of one variable font share the same file.
const urls = [...new Set(faces.flatMap((face) => [...face.matchAll(/url\("?([^")]+)"?\)/g)].map((m) => m[1])))];
if (!urls.some((url) => url.includes("material-symbols-outlined"))) problems.push("icon font @font-face is missing");
if (urls.filter((url) => url.startsWith("/_astro/fonts/")).length < REQUIRED_VARIABLES.length) {
  problems.push("fewer self-hosted text font files than font families");
}
for (const url of urls) {
  if (url.startsWith("/") && !existsSync(resolve(dist, `.${url}`))) problems.push(`${url} is referenced but missing from dist/`);
}

if (problems.length > 0) {
  console.error(`[fonts] Built site is missing fonts:\n  - ${problems.join("\n  - ")}`);
  process.exit(1);
}
console.log(`[fonts] OK: ${REQUIRED_VARIABLES.length} font families, ${urls.length} font files referenced.`);
