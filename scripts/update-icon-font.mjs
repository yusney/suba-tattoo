#!/usr/bin/env node
// Regenerates the self-hosted Material Symbols subset from MATERIAL_ICONS.
//
// Usage: pnpm icons:font   (run it whenever src/lib/icons.ts changes)
//
// It asks Google Fonts for a subset containing only the listed icons, saves
// the woff2 under public/fonts/ and records the icon list plus the file hash
// in src/lib/icon-font.manifest.json. The layout fails the build when that
// manifest no longer matches MATERIAL_ICONS or the font file, so a forgotten
// regeneration cannot ship icons that render as plain text.
import { createHash } from "node:crypto";
import { mkdir, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  ICON_FONT_DIR,
  ICON_FONT_MANIFEST,
  ICON_FONT_PREFIX,
  MATERIAL_ICONS,
  MATERIAL_SYMBOLS_GOOGLE_CSS_URL,
} from "../src/lib/icons.ts";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
// Google Fonts only returns woff2 to browsers that advertise support for it.
const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36";

const cssResponse = await fetch(MATERIAL_SYMBOLS_GOOGLE_CSS_URL, { headers: { "User-Agent": USER_AGENT } });
if (!cssResponse.ok) throw new Error(`Google Fonts CSS request failed: HTTP ${cssResponse.status}`);
const css = await cssResponse.text();
const fontUrls = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)\s*format\('woff2'\)/g)].map((m) => m[1]);
if (fontUrls.length !== 1) {
  throw new Error(`Expected exactly one woff2 in the Google Fonts CSS, found ${fontUrls.length}`);
}

const fontResponse = await fetch(fontUrls[0], { headers: { "User-Agent": USER_AGENT } });
if (!fontResponse.ok) throw new Error(`Font download failed: HTTP ${fontResponse.status}`);
const font = Buffer.from(await fontResponse.arrayBuffer());
if (font.subarray(0, 4).toString("latin1") !== "wOF2") throw new Error("Downloaded file is not a woff2 font");

// Content-hashed file name: nginx serves fonts as immutable for a year, so a
// regenerated font must live at a new URL. Older generated files are removed.
const sha256 = createHash("sha256").update(font).digest("hex");
const fileName = `${ICON_FONT_PREFIX}.${sha256.slice(0, 8)}.woff2`;
const dir = resolve(root, "public", ICON_FONT_DIR.replace(/^\//, ""));
await mkdir(dir, { recursive: true });
for (const entry of await readdir(dir)) {
  if (entry.startsWith(`${ICON_FONT_PREFIX}`) && entry.endsWith(".woff2") && entry !== fileName) {
    await rm(resolve(dir, entry));
  }
}
await writeFile(resolve(dir, fileName), font);

const manifest = {
  icons: [...MATERIAL_ICONS].sort(),
  file: `${ICON_FONT_DIR}/${fileName}`,
  sha256,
};
await writeFile(resolve(root, ICON_FONT_MANIFEST), `${JSON.stringify(manifest, null, 2)}\n`);

console.log(`Icon font: ${manifest.icons.length} icons, ${font.length} bytes -> public${manifest.file}`);
