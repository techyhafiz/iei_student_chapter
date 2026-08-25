# DESIGN // IEI Student Chapter — Cybersecurity

> Design system and interaction spec for the NULLSEC landing page.
> Direction: **dark console, glassmorphism, tactical monospace** — a cybersecurity club site that reads like operator software, not a brochure.

---

## 1. Design Tokens

All tokens live in `:root` (`styles.css`). Every component consumes tokens — never hard-coded values — so light mode is a pure token swap (`html[data-theme="light"]`).

### Color — Dark (default)

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#0d0f12` | Page background |
| `--panel` | `#15181d` | Plates, frames, image fills |
| `--glass` | `rgba(255,255,255,.05)` | Glass panel fill |
| `--text` | `#e8e6e1` | Body text |
| `--muted` | `#9a978f` | Labels, captions, hints |
| `--accent` | `#d4a017` | Gold — lines, strokes, links |
| `--accent-hi` | `#f2c14e` | Bright gold — hover, highlights |
| `--border` | `rgba(212,160,23,.15)` | All hairlines and frames |
| `--ok` | `#8a9a5b` | Status green (OK dots, telemetry) |

### Color — Light

Warm Titanium & Champagne Slate aesthetic (`--bg #eeeae2`, `--panel #fbf9f4`, `--glass rgba(251,249,244,0.86)`, `--text #181b22`, `--muted #595e6a`, `--accent #b87d00`, `--accent-hi #945e00`, `--ok #15803d`, borders `rgba(24,27,34,0.10)`). A grounded deep obsidian footer (`#11141a`) and dark interactive cybersecurity terminal provide striking grounding contrast so the page never feels washed-out or blinding white. Generated SVG artwork and gallery frames utilize warm champagne `#e5e0d4` backdrops with cyber gold accents.

### Type

| Token | Family | Roles |
| --- | --- | --- |
| `--disp` | Space Grotesk 500–700 | Section titles, hero display |
| `--mono` | JetBrains Mono 400–700 | Kickers, labels, meta, buttons, terminal |
| `--sans` | Inter 400–600 | Body copy, forms |

Mono is used at small sizes with wide tracking (`.18em–.26em`) for all chrome — counters, badges, hints.

### Motion & shape

- `--ease: cubic-bezier(.22,.61,.36,1)` — one easing everywhere.
- `--r: 14px` — glass radius; inner frames drop to `8–10px`.
- Transitions: `.4s–.6s` for state changes; scroll animation is GSAP-scrubbed, not timeout-based.

### Z-index scale

`progressBar/ambient 0–91` < `nav 110` < `mobileMenu 120` < `cursor 150` < `lightbox 160` < `loader 200`.

---

## 2. Layout & Sections

Single column, max content width `~1150–1200px`, section order is numbered in-kicker (`// 01 — ABOUT` … `// 05 — JOIN`):

1. **Hero** — photographic background with a 90deg scrim fade, status cards, scroll hint.
2. **Marquee** — accent-gold ticker strip (decorative, `aria-hidden`).
3. **About** — copy on the left, fake terminal card on the right (typed telemetry via JS).
4. **Events** — activity calendar: central spine with interactive filter tabs (`[ALL LOGS]`, `[UPCOMING]`, `[HISTORICAL ARCHIVE]`), alternating cards/dates.
5. **Gallery** — masonry-style grid of event frames with persistent dock title bars (see §4).
6. **Team** — 3D solo operator deck & board (`operators.css/js`).
7. **Join** — two-column: contact block + glass form.
8. **Footer** — oversized stroke wordmark, sitemap grid, EOF marker.

**Breakpoints:** `960 / 820 / 760 / 640 / 520` (styles.css), `900 / 560` (operators.css). Gallery collapses `6 → 2 → 1` columns; lightbox peek hides `≤640px`.

---

## 3. Ambient FX Stack (decorative, all `aria-hidden`)

Layered under content, all pointer-events-none below the cursor:

| Layer | Effect |
| --- | --- |
| `#bgGrid` | thin gold grid lines |
| `#bgGlow` | two radial gold glows |
| `#bgMid` | 16 floating hex-fragment spans (`AES::256`, `SYN→ACK`, …), JS-parallaxed on scroll |
| `#scanlines` | CRT scanlines, multiply blend |
| `#noise` | SVG turbulence grain @ 3.5% |
| Cursor | Native system cursor (clean, responsive, standard OS pointer) |

Custom cursor and parallax are disabled for coarse pointers and `prefers-reduced-motion`.

---

## 4. Gallery — Event Frames

One frame = **one event**. Grid: `repeat(6, 1fr)`, `grid-auto-rows: 120px`, frames span 2–4 columns / 2 rows via `cs2/cs3/cs4` + `rs2`.

Per frame:
- `.gal-img` cover art (SVG plate) + parallax drift on scroll (`data-speed`).
- `figcaption` bottom-left caption bar.
- **Fluid Focus & Sibling Dimming**: Hovering lifts the active card (`scale 1.045 / translateY -6px`) with golden ambient glow while non-hovered siblings smoothly dim to `40% opacity`.
- **Cursor Hover Pill**: Minimalist pill `[ VIEW EVENT ↗ ]` follows the cursor smoothly within the hovered card.
- `data-caption` (name/date), `data-date`, `data-desc` (short description shown in the viewer).

### Photo model

Each event carries an **album of 5–6 photos**: the cover plate + generated variants (10 seeded scene factories: dots, bars, waves, hexes, rings, diag, blocks, scatter, gauge, chevrons — same palette, deterministic per event via `mulberry32` seed).

**Swapping in real photography:** replace album nodes in `script.js` (album construction block) with `<img>` sources — the viewer markup is source-agnostic inside `#lbContent` / `#lbPeekImg`.

---

## 5. Lightbox — Event Viewer

Compact, framed, per-event slideshow — intentionally **not** full-bleed. Two-column layout: framed image stage on the left, persistent event info & next preview on the right.

```
┌────────────────────────────────────────────────────────┐
│                                    [ESC] CLOSE ✕       │
│  ┌── stage ──────────────┐  ┌ info column ──────────┐  │
│  │                       │  │ EVENT NAME            │  │
│  │ [‹]    image     [›]  │  │ OCT 2025              │  │
│  │                       │  │ short description     │  │
│  └───────────────────────┘  │ [01 / 06]  ← → · ESC  │  │
│                             │ ┌ VIEW MORE IMAGES ─┐ │  │
│                             │ │ mini thumbnail ›  │ │  │
│                             │ └───────────────────┘ │  │
│                             └───────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

Rules:
- Grid `minmax(0, 1fr) minmax(260px, 340px)`, max-width `min(1120px, 94vw)`; stacks to one column ≤860px (image stage on top, info underneath).
- **Image Stage (Left)**: Bordered stage (`--border` + `--panel` mat); `‹` `›` arrows overlay its edges without any external overlay collision.
- **Info Column (Right)**: Contains persistent event details: event name (accent-hi), date (muted), short description (from `data-desc`), counter chip `01 / 06`, nav hint, and docked **`// VIEW MORE IMAGES` preview card**.
- **Next-photo preview**: Docked inside the sidebar, previews the upcoming image in the album, and advances on click.
- Navigation wraps within the event; `←` `→` keys, `Esc` or backdrop click closes; focus is saved/restored.
- Backdrop: `rgba(13,15,18,.82)` + `blur(14px)` (light: warm-paper equivalent).

---

## 6. Interaction & Motion System

- **Scroll**: Lenis inertial scroll, synced with GSAP `ScrollTrigger`; stopped while the lightbox is open.
- **Scroll-driven**: hero parallax, events spine fill, team deck stacking (`scale .93 / opacity .55` as next card covers), gallery plate drift, footer wordmark rise.
- **Reveals**: `[data-reveal]` blocks fade/slide in on entry.
- **Micro**: mono buttons with arrow glyphs, `[data-hover]` links, blinking terminal cursor, animated counters (`data-count`).
- **Reduced motion**: `prefers-reduced-motion` strips GSAP/Lenis choreography; the page degrades to static, fully readable content.

---

## 7. Accessibility

- Semantic landmarks (`header/nav/main/section/footer`), single `h1`, numbered section kickers.
- Gallery frames: `role="button"` + `tabindex`, open on `Enter`/`Space`.
- Lightbox: `role="dialog"` + `aria-modal`, labelled close/prev/next/peek controls, live counter (`aria-live`), `Esc` close, focus restore on close.
- All FX layers and the marquee are `aria-hidden`.
- Color contrast held at AA for text tokens in both themes; interactive states change `color + border-color` (not color alone).

---

## 8. File Map

| File | Responsibility |
| --- | --- |
| `index.html` | Structure, SEO, theme bootstrap (inline, pre-paint to avoid FOUC) |
| `styles.css` | Tokens + all section styles + light mode overrides |
| `script.js` | Lenis/GSAP choreography, FX layers, gallery albums, lightbox, form |
| `operators.css/js` | Team deck (isolated component) |
| `assets/` | Hero photography (dark + light variants) |

## 9. Do / Don't

**Do**: reuse tokens; mono + wide tracking for all UI chrome; hairline `--border` frames; gold only for signal, never for large fills.
**Don't**: introduce new hues (palette is LOCKED); use flat `box-shadow` popups on top of glass; animate with CSS transitions where GSAP already owns the timeline; hard-code colors in light-mode components.
