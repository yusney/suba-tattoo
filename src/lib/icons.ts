/**
 * Every Material Symbols ligature the site can render.
 *
 * The icon font is requested from Google Fonts with `icon_names=`, which
 * returns a subset containing only these glyphs (~3 KiB instead of ~1.1 MiB
 * for the full font). An icon that is NOT listed here renders as its plain
 * ligature text (e.g. the word "home"), so add the name here whenever a new
 * icon is used — including icons set from JavaScript (src/lib/toast.ts) and
 * the ones the CMS may pick (`icon` enum in src/content.config.ts).
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
 * Stylesheet URL for the subset. Only the axes the site uses are requested:
 * opsz 24, wght 400, GRAD 0 (see .material-symbols-outlined in global.css)
 * and FILL 0..1 (FILL 1 is the .icon-filled variant). Google Fonts requires
 * `icon_names` in alphabetical order.
 */
export const MATERIAL_SYMBOLS_HREF =
  "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@24,400,0..1,0" +
  `&icon_names=${[...MATERIAL_ICONS].sort().join(",")}&display=swap`;
