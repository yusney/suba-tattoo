/**
 * Build-time guard and URL source for the self-hosted Material Symbols subset.
 *
 * Imported by src/layouts/Layout.astro, so it runs once per build. It throws
 * (failing `astro build`, locally and in CI) when MATERIAL_ICONS no longer
 * matches the icons the committed font was generated for, or when the font
 * file is missing, was changed, or its name does not carry its content hash.
 * Any of those would ship icons that render as their plain ligature words, or
 * a font returning visitors never re-download (nginx caches it as immutable).
 */
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import manifest from "./icon-font.manifest.json";
import { ICON_FONT_DIR, ICON_FONT_PREFIX, MATERIAL_ICONS } from "./icons";

const FIX = "Run `pnpm icons:font` and commit the result (see src/lib/icons.ts).";

const expected = [...MATERIAL_ICONS].sort();
const missing = expected.filter((name) => !manifest.icons.includes(name));
const extra = manifest.icons.filter((name) => !(expected as string[]).includes(name));
if (missing.length > 0 || extra.length > 0) {
  throw new Error(
    `[icons] The icon font is out of date with MATERIAL_ICONS` +
      (missing.length ? ` (missing: ${missing.join(", ")})` : "") +
      (extra.length ? ` (no longer listed: ${extra.join(", ")})` : "") +
      `. ${FIX}`,
  );
}

const expectedFile = `${ICON_FONT_DIR}/${ICON_FONT_PREFIX}.${manifest.sha256.slice(0, 8)}.woff2`;
if (manifest.file !== expectedFile) {
  throw new Error(`[icons] Manifest file "${manifest.file}" does not carry its content hash. ${FIX}`);
}

let font: Buffer;
try {
  font = readFileSync(join(process.cwd(), "public", manifest.file));
} catch {
  throw new Error(`[icons] Icon font not found at public${manifest.file}. ${FIX}`);
}
if (createHash("sha256").update(font).digest("hex") !== manifest.sha256) {
  throw new Error(`[icons] public${manifest.file} does not match its manifest hash. ${FIX}`);
}

/** Verified, content-hashed URL of the icon font. */
export const ICON_FONT_URL: string = manifest.file;
