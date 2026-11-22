/**
 * Every Material Symbols ligature the site can render.
 *
 * The icon font is self-hosted as a subset containing only these glyphs
 * (~4 KiB instead of ~1.1 MiB for the full font). An icon that is NOT in the
 * font renders as its plain ligature text (e.g. the word "home"), so whenever
 * this list changes:
 *
 *   1. add/remove the name here — including icons set from JavaScript
 *      (src/lib/toast.ts) and the ones the CMS may pick (`icon` enum in
 *      src/content.config.ts and the selects in src/cms/config.yml);
 *   2. run `pnpm icons:font` to regenerate the font and its manifest.
 *
 * The build fails (src/layouts/Layout.astro) while step 2 is pending.
 */
export const MATERIAL_ICONS = [
  "add",
  "architecture",
  "arrow_downward",
  "arrow_forward",
  "arrow_right_alt",
  "chat_bubble",
  "check_circle",
  "cleaning_services",
  "close",
  "error",
  "expand_more",
  "format_quote",
  "forum",
  "gavel",
  "history_edu",
  "local_hospital",
  "medical_services",
  "menu",
  "sanitizer",
  "shield",
] as const;

/**
 * Public directory and file-name prefix of the self-hosted subset (served
 * from public/). The generator appends the first 8 hex chars of the content
 * hash (`material-symbols-outlined.<hash>.woff2`): nginx caches fonts for a
 * year as immutable, so a regenerated font must get a new URL. The current
 * file name is recorded in the manifest.
 */
export const ICON_FONT_DIR = "/fonts";
export const ICON_FONT_PREFIX = "material-symbols-outlined";

/** Repo-relative path of the manifest written by scripts/update-icon-font.mjs. */
export const ICON_FONT_MANIFEST = "src/lib/icon-font.manifest.json";

/**
 * Google Fonts stylesheet the subset is generated from — used only by
 * scripts/update-icon-font.mjs, never by the site. Only the axes the site uses
 * are requested: opsz 24, wght 400, GRAD 0 (see .material-symbols-outlined in
 * global.css) and FILL 0..1 (FILL 1 is the .icon-filled variant). Google Fonts
 * requires `icon_names` in alphabetical order.
 */
export const MATERIAL_SYMBOLS_GOOGLE_CSS_URL =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0" +
  `&icon_names=${[...MATERIAL_ICONS].sort().join(",")}&display=block`;
