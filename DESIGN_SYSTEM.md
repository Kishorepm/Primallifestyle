# PRIMAL — Design System

> Game-HUD fashion interface. Panel-switch architecture, not a scrolling site.

## Locked Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Accent | **Red** `#E32D2D` — single accent, dark-dominant |
| 2 | Imagery | **Drop-in ready** — every figure slot is an `<img>` container with a CSS placeholder behind it. Swap `src`, done. |
| 3 | Navigation | **Panel switch** — fixed HUD chrome, content panels replace inside a static stage |
| 4 | Mobile | **Full experience** — chrome collapses, panels reflow, nothing cut |
| 5 | Ch03 | **Character-select row** (matches Street Style lookbook) — all builds visible, click to focus |

---

## 1. Architecture — "Chrome + Stage"

The screen is a **fixed HUD frame** that never moves:

```
┌─[CORNER]──────── TOP BAR (logo · tabs · status) ──────[CORNER]┐
│                                                               │
│                    ╔═══════════════════╗                      │
│   LEFT RAIL        ║                   ║       RIGHT RAIL     │
│   (telemetry)      ║   ◄ STAGE ►       ║       (telemetry)    │
│                    ║   panels swap here║                      │
│                    ╚═══════════════════╝                      │
│                                                               │
└─[CORNER]────────── BOTTOM BAR (drop code · time) ─────[CORNER]┘
```

- **Chrome** = corner brackets, top bar, bottom bar, side rails. Always present.
- **Stage** = the only thing that changes. Panels cross-fade/slide in 480ms.
- Switching tabs does NOT scroll — it swaps the stage content like a game menu.

## 2. Color

```
--bg:        #0A0A0C   /* near-black base */
--bg-panel:  #0E0E11   /* panel fill */
--bg-raise:  #16161A   /* raised cards */
--ink:       #FAFAF8   /* primary text */
--ink-dim:   #8A8A90   /* secondary */
--ink-faint: #3A3A40   /* labels, hairlines */
--red:       #E32D2D   /* THE accent */
--red-glow:  rgba(227,45,45,0.25)
--red-dim:   rgba(227,45,45,0.10)
--line:      rgba(250,250,248,0.07)
```

Red is **rationed** — used for: active states, accents, the drop CTA, corner-bracket highlights, live indicators. Never for body text.

## 3. Type

- **Display:** Bebas Neue — wordmark, panel titles, big numbers
- **Mono:** Space Mono — all HUD labels, codes, telemetry, prices
- **Sans:** Space Grotesk — the rare paragraph of real copy

Rule: if it's a label, it's mono + uppercase + letter-spaced. If it's a headline, it's Bebas. Almost nothing is sans.

## 4. HUD Vocabulary (the reusable parts)

- **Corner brackets** `⌐ ¬ L ⌐` — frame any panel/image. Red on active.
- **Tab rail** — top nav, each chapter is a numbered tab `01 / 02 / 03...`
- **Telemetry line** — `LABEL ······· VALUE` dotted leader, mono
- **Spec sheet** — left-aligned key/value stack for product data
- **Status pill** — `◉ LIVE` style chips
- **Scanline + grid** — subtle animated background texture

## 5. Image Slots (drop-in contract)

Every figure uses this structure so you can swap real photos later:

```html
<div class="fig-slot">
  <img class="fig-img" src="" alt="" />   <!-- your photo -->
  <div class="fig-placeholder"></div>      <!-- CSS shape, shown until img loads -->
</div>
```

When `src` is empty → placeholder shows. Set `src` → photo shows, placeholder hides. Zero code change needed.

**What to feed it:** cut-out PNGs (transparent bg) of full-body models or garments, matte/desaturated, dark-friendly. One per build for Ch03, one per garment for Ch04.

## 6. Motion

- Panel swap: 480ms fade + 20px rise
- Float loop: 4s ease-in-out on hero figure + floating objects (Gameday poster vibe)
- Red pulse: 2s on live indicators
- Glitch: occasional on wordmark only
- Everything else: 200ms ease

## 7. Chapters (panels)

1. **TITLE** — hero figure center, floating objects around it (Gameday composition), glitch wordmark, drop ticket, BEGIN
2. **PREPARE** — build engine: photo upload, body inputs, archetype. Styled as a config terminal.
3. **DROP.01** — character-select row of full builds, click to focus + spec sheet
4. **EQUIP** — loadout configurator, swappable garment slots, live flat-lay
5. **DEPLOY** — order spec sheet, drop-status modules, confirm + social card
