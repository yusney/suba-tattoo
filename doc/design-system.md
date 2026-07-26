# Design System — Obsidian & Ink

The site uses a single design system: **Obsidian & Ink**. Dark, brutalist, editorial. Sharp 0px corners, hairline 1px borders, no shadows, generous blackspace. The brand reads "technical precision meets artistic rawness" — the UI should feel like a high-end print magazine, not a SaaS dashboard.

> Source: extracted from the `<script id="tailwind-config">` and `<style>` blocks at the top of [`templates/01-landing-desktop.html`](./templates/01-landing-desktop.html).
> Stitch project ID: `4316879983354984712` · Design system asset: `assets/0f2dbbd3d335448e9d8f6a049822a4b9`.

---

## Color palette (Material 3-style tokens)

Dark-only. Every token is mapped to a hex value; use these names in Tailwind classes (e.g. `bg-surface`, `text-on-surface`, `border-outline-variant`).

### Surfaces (dark mode ramp)

| Token | Hex | Use |
|---|---|---|
| `surface` | `#131313` | Page background |
| `surface-dim` | `#131313` | Same as surface (lowest end of ramp) |
| `surface-bright` | `#393939` | Brightest dark surface (rare) |
| `surface-container-lowest` | `#0e0e0e` | Deepest background (footer, gallery backdrop) |
| `surface-container-low` | `#1c1b1b` | Card backgrounds, contact section |
| `surface-container` | `#201f1f` | Standard container |
| `surface-container-high` | `#2a2a2a` | Hover/elevated cards |
| `surface-container-highest` | `#353534` | Highest container level |

### On-surface (text colors)

| Token | Hex | Use |
|---|---|---|
| `on-surface` | `#e5e2e1` | Default body text |
| `on-surface-variant` | `#e4beba` | Muted/secondary text |
| `inverse-on-surface` | `#313030` | Text on inverse surfaces |
| `on-background` | `#e5e2e1` | Text on raw background |

### Primary (brand red)

| Token | Hex | Use |
|---|---|---|
| `primary` | `#ffb3ad` | Brand accent (CTAs, hover states, highlights) |
| `on-primary` | `#68000a` | Text on primary fills |
| `primary-container` | `#ff5451` | Solid primary fill (chip selected, button hover bg) |
| `on-primary-container` | `#5c0008` | Text on primary-container |
| `primary-fixed` | `#ffdad7` | Stable light primary |
| `primary-fixed-dim` | `#ffb3ad` | Dimmed primary |
| `on-primary-fixed` | `#410004` | Text on primary-fixed |
| `on-primary-fixed-variant` | `#930013` | Variant text |
| `inverse-primary` | `#b91a24` | Inverse primary |

### Secondary

| Token | Hex | Use |
|---|---|---|
| `secondary` | `#c6c6c7` | Cool neutral (rare) |
| `on-secondary` | `#2f3131` | Text on secondary |
| `secondary-container` | `#454747` | Secondary fill |
| `on-secondary-container` | `#b4b5b5` | Text on secondary-container |
| `secondary-fixed` | `#e2e2e2` | Fixed light |
| `secondary-fixed-dim` | `#c6c6c7` | Dimmed |
| `on-secondary-fixed` | `#1a1c1c` | Text on fixed |
| `on-secondary-fixed-variant` | `#454747` | Variant text |

### Tertiary (teal accent)

| Token | Hex | Use |
|---|---|---|
| `tertiary` | `#69d8d4` | Teal accent |
| `on-tertiary` | `#003736` | Text on tertiary |
| `tertiary-container` | `#24a09d` | Teal fill |
| `on-tertiary-container` | `#00302e` | Text on tertiary-container |
| `tertiary-fixed` | `#87f4f0` | Fixed light teal |
| `tertiary-fixed-dim` | `#69d8d4` | Dimmed teal |
| `on-tertiary-fixed` | `#00201f` | Text on tertiary-fixed |
| `on-tertiary-fixed-variant` | `#00504e` | Variant text |

### Outline & errors

| Token | Hex | Use |
|---|---|---|
| `outline` | `#ab8986` | Strong borders, focus rings |
| `outline-variant` | `#5b403e` | Hairline dividers, card borders |
| `error` | `#ffb4ab` | Error state |
| `on-error` | `#690005` | Text on error |
| `error-container` | `#93000a` | Error fill |
| `on-error-container` | `#ffdad6` | Text on error-container |
| `surface-tint` | `#ffb3ad` | Tinted overlay |
| `inverse-surface` | `#e5e2e1` | Inverse surface |
| `surface-variant` | `#353534` | Subtle variant fill |
| `background` | `#131313` | Alias for surface |

---

## Typography

Three families. No fallbacks — load them via Google Fonts (`<link>` tags in `<head>`).

| Family | Weights | Roles |
|---|---|---|
| **Syne** | 400, 600, 700, 800 | Display, headlines, anything that needs editorial weight |
| **Plus Jakarta Sans** | 400, 500 | Body text, descriptions |
| **JetBrains Mono** | 400, 500, 700 | Labels, eyebrows, uppercase micro-copy, form values |

Material Symbols Outlined is used for icons (load via Google Fonts).

### Type scale

| Token | Size / line-height / weight / tracking | Family | Use |
|---|---|---|---|
| `display-lg` | 80px / 1.0 / 800 / -0.04em | Syne | Hero H1 only |
| `headline-lg` | 48px / 1.1 / 700 | Syne | Section H2 (desktop) |
| `headline-lg-mobile` | 32px / 1.1 / 700 | Syne | Section H2 (mobile) |
| `headline-md` | 32px / 1.2 / 600 | Syne | Card titles, sub-headings |
| `body-lg` | 18px / 1.6 / 400 | Plus Jakarta Sans | Lead paragraphs |
| `body-md` | 16px / 1.6 / 400 | Plus Jakarta Sans | Default body |
| `label-sm` | 12px / 1.0 / 500 / 0.1em | JetBrains Mono | ALL-CAPS eyebrows, nav links, buttons |

> Headlines are always `uppercase`. Body text is sentence case. Labels are always `uppercase tracking-widest`.

---

## Spacing

| Token | Value | Use |
|---|---|---|
| `base` | `8px` | Base unit — multiply by 2/3/4/6 for everything else |
| `container-max` | `1440px` | Max width of the centered content rail |
| `gutter` | `24px` | Grid gap between columns |
| `margin-desktop` | `64px` | Outer horizontal padding (desktop) |
| `margin-mobile` | `16px` | Outer horizontal padding (mobile) |
| `section-gap` | `120px` | Vertical padding between major sections |

The main content lives in a centered rail (`max-w-container-max mx-auto`) with side borders (`border-x border-outline-variant`) — this is what gives the editorial "frame" look.

---

## Shape

**All corners are 0px. No exceptions.**

```js
borderRadius: {
  DEFAULT: "0px",
  lg: "0px",
  xl: "0px",
  full: "9999px"  // only for the circular scroll-progress / pill chips
}
```

Buttons, cards, inputs, modals — everything is sharp-edged. Pills (`rounded-full`) are reserved for circular avatars and tiny chips.

---

## Style rules

- **Dark only** — `html.dark` is always set; no light-mode variant.
- **1px borders everywhere** — use `border border-outline-variant` for cards, `border-b border-outline-variant` for dividers, `border-x border-outline-variant` on the main content rail.
- **No shadows** — elevation is shown via surface tones (`bg-surface-container-low` vs `bg-surface-container-high`), never via `shadow-*`.
- **No rounded corners** — see Shape above.
- **Generous blackspace** — `section-gap` is 120px; sections breathe.
- **Editorial framing** — every section lives inside the `border-x border-outline-variant` rail.
- **Hairline scrollbar** — 4px wide, `background: #5b403e` thumb on `#131313` track.
- **Selection** — `bg-primary-container text-on-primary-container` (warm red highlight).
- **Text stroke accent** — `text-stroke` class (1px primary outline, transparent fill) used for the italic-flavored secondary word in hero headlines (e.g. "Arte Único").
- **Editorial grid** — 12-col grid (`grid grid-cols-12 gap-gutter`) for the about and process sections.
- **Grayscale images on hover** — gallery images render in grayscale and desaturate on `group-hover:grayscale-0`. Scale up to 1.05–1.10 on hover.

---

## Component patterns

### Top app bar

Fixed, full-width, 96px tall (`h-24`), `bg-surface/90 backdrop-blur-sm`, `border-b border-outline-variant`. Content lives inside the centered rail.

```
[ SUBA TATTOO ]  [ Gallery  Process  Philosophy  Contact ]  [ Request Valuation CTA ]
```

CTA button: `bg-primary text-on-primary px-6 py-3 font-label-sm uppercase tracking-widest hover:bg-on-background hover:text-surface`.

### Buttons

Two variants:

**Primary CTA:**
```
bg-primary text-on-primary px-10 py-5 font-label-sm uppercase tracking-[0.2em] font-bold
border border-primary hover:bg-transparent hover:text-primary transition-all duration-300
```

**Secondary outline:**
```
border border-outline-variant text-on-surface px-10 py-5 font-label-sm uppercase tracking-[0.2em]
hover:bg-surface-container-high transition-all duration-300
```

### Portfolio cards

- Wrapper: `aspect-[16/10]` (feature) or `aspect-square` (small), `border border-outline-variant`, `bg-surface-container-high`.
- Image: `object-cover grayscale group-hover:grayscale-0 transition-all duration-700`, `scale-100 group-hover:scale-105`.
- Overlay gradient at bottom: `bg-gradient-to-t from-surface to-transparent opacity-60`.
- Label & title at bottom-left: `text-label-sm text-primary uppercase tracking-widest` (category) + `text-headline-md uppercase` (title).
- Feature card spans `md:col-span-2` of a 3-col grid.

### Input fields

- Wrapper: `space-y-2` (label + input).
- Label: `text-label-sm uppercase tracking-widest text-on-surface-variant`.
- Input: `w-full bg-surface border border-outline-variant p-4 text-on-surface focus:border-primary focus:ring-0 transition-colors font-label-sm`.
- Select adds `appearance-none`.
- Textarea: same as input but `rows={4}`.

### Filter chips (gallery)

Container: `border-b border-outline-variant pb-2`.
Chip: `text-label-sm uppercase tracking-widest px-4 py-2`.
- Active: `text-primary border-b-2 border-primary`.
- Inactive: `text-on-surface-variant hover:text-on-surface`.

### Feature cards (about / process)

3-col grid (`md:grid-cols-3 gap-6`).
- `p-8 border border-outline-variant bg-surface-container-low hover:border-primary transition-colors group`
- Material Symbols icon: `text-primary text-4xl mb-6`.
- Title: `text-label-sm font-bold uppercase mb-4`.
- Body: `text-body-md text-on-surface-variant`.

### Process steps

3-col grid. Each step:
- Huge ghost number behind: `text-[120px] font-headline-lg text-outline-variant/30 absolute -top-20 -left-4 z-0 group-hover:text-primary/20`.
- Foreground content: `relative z-10 pt-12` with `text-headline-md uppercase` title + `text-body-md` description.

### Floating WhatsApp button

`fixed bottom-8 right-8 z-[100] bg-primary text-on-primary p-4 hover:scale-110 transition-transform`.
Icon + label that expands on hover (`max-w-0 group-hover:max-w-xs transition-all duration-500`).

### Scroll reveal (vanilla JS)

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('opacity-100', 'translate-y-0');
      entry.target.classList.remove('opacity-0', 'translate-y-10');
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('section > div').forEach(el => {
  el.classList.add('transition-all', 'duration-1000', 'opacity-0', 'translate-y-10');
  observer.observe(el);
});
```

Applied once on `DOMContentLoaded`. Targets direct children of `<section>`.

---

## Motion

Three impact animations ship in v1. All are **CSS-only** (no GSAP, Framer Motion, or any animation runtime). Every animation honors `prefers-reduced-motion: reduce` and resolves to a static, fully-revealed state for users with that preference.

### 1. Hero cinematic reveal (cascade stagger)

On first paint, the hero block cascades in: tagline → headline → subtitle → primary CTA → secondary CTA. Designed to feel like a magazine title card, never jumpy.

| Element | Delay |
|---|---|
| Tagline (`.text-label-sm`) | `0ms` |
| Headline `<h1>` | `200ms` |
| Subtitle `<p>` | `450ms` |
| Primary CTA | `650ms` |
| Secondary CTA | `750ms` |

All five elements share the same `heroEnter` keyframe (opacity `0 → 1`, `translateY(20px) → 0`, `600ms ease-out`, `animation-fill-mode: both`) so they start invisible before their delay and stay revealed afterwards. Delays are applied per element via Tailwind arbitrary values (`[animation-delay:200ms]`).

The bottom-right scroll indicator does **not** cascade — it keeps its own `data-reveal` fade.

### 2. Marquee strip (editorial ticker)

A full-width two-row horizontal ticker between the hero and the gallery. Row 1 scrolls left (`marqueeLeft`, `30s linear infinite`), row 2 scrolls right (`marqueeRight`, `40s linear infinite`). Different durations create the editorial layered effect.

Both rows share the same anatomy:
- `bg-surface` band, `py-6` vertical padding
- `border-y border-outline-variant` outer frame
- `border-t border-primary/30` red hairline between the two rows
- Items in `text-label-sm font-label-sm uppercase tracking-[0.3em]` (JetBrains Mono uppercase)
- Row 1 in `text-on-surface`, Row 2 in `text-on-surface-variant` for hierarchy
- Red dot (`text-primary ●`) between each style name

Text content comes from the `marquee.styles` translation key (array of 6 strings per locale). The track is rendered twice inside the scrolling container, so translating `translateX(-50%)` produces a seamless infinite loop with zero JavaScript.

Hover pauses the animation via `animation-play-state: paused` on the wrapper.

### 3. Gallery image reveal (clip-path wipe)

Each gallery card starts `clip-path: inset(0 100% 0 0)` (fully clipped from the right) and transitions to `clip-path: inset(0 0 0 0)` over `800ms ease-out` once it enters the viewport.

Triggered by an `IntersectionObserver` (`rootMargin: '0px 0px -10% 0px'` so cards reveal slightly before they fully enter the viewport). The observer only fires once per card (`observer.unobserve(target)` after the first hit). Stagger is applied by setting `transition-delay` from the card's `data-idx`: `0ms`, `150ms`, `300ms`, `450ms`, `600ms`.

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    const idx = Number((entry.target as HTMLElement).dataset.idx ?? "0");
    (entry.target as HTMLElement).style.transitionDelay = `${idx * 150}ms`;
    entry.target.classList.add('is-revealed');
    observer.unobserve(entry.target);
  });
}, { rootMargin: '0px 0px -10% 0px' });

document.querySelectorAll<HTMLElement>('.gallery-card').forEach((el) => observer.observe(el));
```

CSS:

```css
.gallery-card {
  clip-path: inset(0 100% 0 0);
  transition: clip-path 800ms ease-out;
}
.gallery-card.is-revealed {
  clip-path: inset(0 0 0 0);
}
```

### Reduced-motion fallback

Every motion utility short-circuits under `prefers-reduced-motion: reduce`:

```css
@media (prefers-reduced-motion: reduce) {
  .animate-marquee-left,
  .animate-marquee-right {
    animation: none !important;
    transform: none !important;
  }
  .animate-hero-enter {
    animation: none !important;
    opacity: 1 !important;
    transform: none !important;
  }
  .gallery-card {
    clip-path: none !important;
    transition: none !important;
  }
}
```

### Rationale

- **Editorial restraint.** The Obsidian & Ink system rejects ornament — motion is the only place we get to add personality, so every animation must feel earned. Three moments total: landing cascade, the magazine ticker, the wipe-in. Nothing more.
- **Sharp corners, no easing tricks.** `ease-out` for reveals, `linear` for the marquee. No spring physics, no `cubic-bezier(0.34, 1.56, 0.64, 1)`. Brutalist motion.
- **No JS for static reveals.** The hero cascade and the marquee are 100% CSS keyframes — zero runtime cost, zero hydration penalty.
- **Stagger over parallelism.** Cards and hero lines reveal in sequence, never together. The eye should be led, not overwhelmed.
- **A11y non-negotiable.** `prefers-reduced-motion` short-circuits every animation to its end state. Users who opt out get the same final composition, instantly.

### 4. Scroll-pinned panels (sticky heading + cascading cards)

Two sections (`FilosofiaSection`, `ProcessSection`) use a sticky heading column paired with cards that cascade in as they scroll into view. The editorial effect is "magazine sidebar pinned while the article reads on".

**Layout**

- The left column (`FilosofiaSection`) or the heading wrapper (`ProcessSection`) is pinned with `lg:sticky lg:top-24`. `top-24` (6rem / 96px) clears the fixed `h-24` TopBar.
- `self-start` is added to the sticky element whenever it is a grid/flex item, to defeat the default `align-items: stretch` that would expand the column to grid height and break sticky positioning.
- Mobile (`< lg`) drops sticky entirely — the columns stack normally and cards reveal on scroll without pinning.

**Markup notes — sticky respects parent bounds**

`position: sticky` only sticks within the bounds of its scrolling ancestor (in practice: the nearest ancestor that scrolls, here the document). The sticky element also only pins for as long as its **parent** is in view. Concretely:

- In `FilosofiaSection`, the sticky left column is a direct grid-child of the 12-col grid that itself sits inside the `<section>`. The grid is taller than the left column (because the right column has 3 cards), so the heading pins for the entire scroll-past of the cards. When the section ends, the heading scrolls away with it.
- In `ProcessSection`, the sticky heading wrapper is a direct child of `<section>`, with the step grid as the next sibling. The grid is taller than the heading, so the heading pins while the steps scroll past.

If either sticky element had been wrapped in an inner container that exited the viewport before the cards did, sticky would silently unstick mid-section. Keep sticky elements as direct (or near-direct) children of the section they are meant to pin within.

**Card reveal (cascading fade + slide)**

Each card carries `data-reveal-card` and an inline `transition-delay` derived from its index. CSS keeps the card invisible (`opacity: 0; translateY(40px)`) until an IntersectionObserver flips `.is-revealed` on the element. Stagger values:

- `FilosofiaSection` cards: `0ms`, `150ms`, `300ms` (tight — 3 small cards in a single row)
- `ProcessSection` steps: `0ms`, `200ms`, `400ms` (slightly slower — bigger moments, more body copy)

A single shared observer handles all `[data-reveal-card]` elements on the page:

```js
const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-revealed");
      revealObserver.unobserve(entry.target);
    }
  });
}, { rootMargin: "0px 0px -15% 0px" });

document.querySelectorAll("[data-reveal-card]").forEach((el) => revealObserver.observe(el));
```

`rootMargin: '0px 0px -15% 0px'` triggers the reveal 15% before the card fully enters the viewport, so the animation lands as the card becomes visible rather than after it has already settled in. `unobserve(target)` makes the reveal one-shot — scrolling back never re-hides the card.

CSS:

```css
[data-reveal-card] {
  opacity: 0;
  transform: translateY(40px);
  transition: opacity 700ms ease-out, transform 700ms ease-out;
}
[data-reveal-card].is-revealed {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  [data-reveal-card] {
    opacity: 1;
    transform: none;
    transition: none;
  }
}
```

**Reduced-motion fallback**

The `[data-reveal-card]` rule is short-circuited under `prefers-reduced-motion: reduce` (opacity:1, no transform, no transition) so motion-sensitive users see the fully-revealed composition immediately, identical to the desktop end state.

**Rationale (added)**

- **Stickiness is reading rhythm.** The pinned heading gives the user a stable reference point while the cards reveal one after another — the same cadence you get reading a magazine spread where the headline stays put and the body changes beneath it.
- **Stagger > batch.** 150–200ms between cards is the sweet spot: long enough to read the cascade, short enough that no single card feels late.
- **`rootMargin` matters.** Triggering on a hard `threshold: 0` makes the reveal land too late (card is already fully visible). `-15% 0px` makes the reveal lead the entry — feels intentional rather than reactive.