# PRIMAL Lifestyle — Handoff Document

Pick this up in a fresh local Claude Code session. Everything you need is here.

---

## What This Is

**PRIMAL** — a hyper-personalized AI-native fashion drop engine and marketplace.

Two surfaces, one catalog:
- **Web HUD** (`index.html`) — the human-facing game-UI experience
- **MCP Server** (`mcp/server.js`) — agent-facing, lets Claude Desktop / Cursor shop the catalog by chat

The core aesthetic: dark editorial game-HUD. Fixed chrome frame, panels swap inside. Think Valorant agent select crossed with a streetwear lookbook.

---

## File Map

```
Primallifestyle/
├── index.html              ← Main SPA (5 panels, fixed chrome)
├── css/main.css            ← Full HUD stylesheet + design tokens
├── js/main.js              ← Panel-switch controller + carousel logic
├── data/catalog.json       ← 36-product multi-brand catalog (source of truth)
├── assets/                 ← Garment images (drop in here)
├── package.json            ← devDeps: http-server, htmlhint, stylelint, eslint
├── eslint.config.js        ← ESLint flat config
├── .htmlhintrc             ← HTMLHint config (src-not-empty disabled intentionally)
├── DESIGN_SYSTEM.md        ← 5 locked design decisions + HUD vocabulary
├── mcp/
│   ├── server.js           ← MCP stdio server (6 tools)
│   ├── engine.js           ← Pure recommendation engine (no I/O)
│   ├── engine.test.js      ← 9 passing tests (node:test)
│   ├── package.json        ← "type":"module", deps: @modelcontextprotocol/sdk, zod
│   └── README.md           ← Claude Desktop connection instructions
└── .claude/
    ├── settings.json       ← SessionStart hook config
    └── hooks/session-start.sh  ← Auto-installs node_modules on remote
```

---

## Design Tokens (locked, don't change)

```css
:root {
  --bg: #0A0A0C;
  --bg-panel: #0E0E11;
  --bg-raise: #16161A;
  --ink: #FAFAF8;
  --ink-dim: #8A8A90;
  --ink-faint: #3A3A40;
  --red: #E32D2D;
  --red-glow: rgba(227,45,45,0.25);
  --red-dim: rgba(227,45,45,0.10);
  --line: rgba(250,250,248,0.07);
  --line-2: rgba(250,250,248,0.14);
  --f-disp: "Bebas Neue";
  --f-mono: "Space Mono";
  --f-sans: "Space Grotesk";
  --chrome-pad: 3.25rem;
}
```

Stage inset: `inset: var(--chrome-pad) 170px` (side rails). At `≤1100px` rails hide, stage goes `inset: var(--chrome-pad) 0`.

---

## HUD Structure

```
<div class="chrome">           ← fixed, never moves
  <header class="topbar">     ← PRIMAL logo · tab-rail 01–05 · status pill
  <aside class="rail rail--left">   ← SYS / VER / SEASON / UNITS telemetry
  <aside class="rail rail--right">  ← NODE / EDITION / GEO / UTC telemetry
  <footer class="botbar">     ← drop code · progress segments · hint
</div>
<main class="stage">           ← panels swap here
  <section class="panel active" id="p0">  ← 00 TITLE
  <section class="panel" id="p1">         ← 01 PREPARE
  <section class="panel" id="p2">         ← 02 DROP.01 (character select / archetype)
  <section class="panel" id="p3">         ← 03 EQUIP (flat-lay outfit configurator)
  <section class="panel" id="p4">         ← 04 DEPLOY
</main>
```

Navigation: `switchPanel(index)` in `js/main.js`. Arrow keys + `data-goto` buttons. No scroll — panels hard-cut with a 500ms exit fade.

---

## Drop-in Image Contract

Images use this pattern — placeholder visible until real src is set:

```html
<div class="fig-slot">
  <img class="fig-img" src="" />
  <div class="fig-placeholder"></div>
</div>
```

Drop real photos into `assets/` and set `src`. No other changes needed.

---

## Catalog Schema (`data/catalog.json`)

```json
{
  "id": "acr-j1a",
  "name": "J1A-GT Jacket",
  "brand": "ACRONYM",
  "slot": "outer",
  "archetype": ["SHADOW", "URBAN"],
  "colors": ["black"],
  "price": 580,
  "warmth": 3,
  "fit": "regular",
  "sizes": ["S","M","L","XL"],
  "image": "assets/garment-jacket.png",
  "desc": "Gore-Tex 2L shell..."
}
```

Slots: `outer`, `mid`, `bottom`, `feet`, `carry`, `head`
Archetypes: `URBAN`, `SHADOW`, `FIELD`
Warmth: 1–5

---

## MCP Server — 6 Tools

| Tool | What it does |
|------|-------------|
| `set_profile` | Store body specs + style prefs for the session |
| `search_garments` | Filter catalog (slot, brand, price, archetype, warmth, color, text) |
| `get_product` | Full detail for one product id |
| `recommend_build` | Core engine — compose full loadout from profile + budget + occasion |
| `swap_piece` | Replace one slot in current build with a constrained alternative |
| `create_checkout` | Turn current build into mock checkout URL + drop code |

### Connect to Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "primal": {
      "command": "node",
      "args": ["/absolute/path/to/Primallifestyle/mcp/server.js"]
    }
  }
}
```

### Run tests

```bash
cd mcp
npm install
npm test   # 9 tests, all pass
```

---

## How to Run Locally

```bash
# In project root
npm install
npm run dev     # starts http-server on port 8080

# In another terminal
npm run lint    # htmlhint + stylelint + eslint
```

---

## Clothing Aesthetic (important)

The store direction is **grey/black baggy Korean/Russian streetwear** — not techwear:
- Loose silhouettes, oversized hoodies, wide-leg cargo trousers
- Clean minimal colourway: charcoal, off-white, washed grey, black
- Reference: Gentle Monster, Ader Error, Stone Island, Korean street lookbook style
- NOT: tight-fitting ACRONYM techwear or tactical gear

Midjourney prompt base:
```
[garment name], oversized loose fit, charcoal grey colorway, Korean streetwear editorial, 
clean white background, flat lay product shot, high contrast, studio lighting, 
4k --ar 3:4 --style raw --v 6
```

---

## Pending Tasks (priority order)

### 1. Wire web HUD to catalog.json
The HUD currently has hardcoded JS data. The MCP server reads `data/catalog.json` correctly, but the web UI doesn't fetch it yet.

```js
// In js/main.js, replace hardcoded product arrays with:
const catalog = await fetch('../data/catalog.json').then(r => r.json());
```

Then replace the Ch03 EQUIP panel's hardcoded build names with catalog-driven data.

### 2. Update build names in Ch03

Current hardcoded names use ACRONYM/Veilance refs. Replace with:
- `CITY MODE`
- `URBAN EDGE`
- `STREET CORE`
- `DARK MOVE`
- `TECH FLOW`

### 3. Drop real garment images

Generate with Midjourney using the prompts above. Name them:
```
assets/garment-jacket.png
assets/garment-pants.png
assets/garment-hoodie.png
assets/garment-shoes.png
assets/garment-bag.png
assets/garment-cap.png
```

Then update `image` fields in `data/catalog.json` to match.

### 4. Real checkout integration

`create_checkout` in `mcp/server.js` returns a mock URL. Wire to Stripe or a real cart:
```js
// mcp/server.js line ~184
const url = `https://primal.shop/checkout?items=${ids.join(",")}&code=${code}`;
// → replace with real Stripe session create call
```

### 5. Multi-vendor marketplace layer (stretch)

Allow external brands to list items via an admin panel. Each product gets a `vendor_id` + commission rate. Checkout splits payment across vendors.

---

## Engine Scoring Logic

```
scoreProduct(product, profile):
  archetype match  → +10 per matching archetype
  fit match        → +4
  warmth match     → +3 (if product.warmth >= profile.minWarmth)
  color match      → +2 per matching color
```

`recommendBuild` runs greedy slot-fill then a budget-relief loop that swaps the cheapest-saving slot until under budget.

`occasionToWarmth` keyword map:
```
arctic→5, winter/cold→4, rain/cool/fall/autumn→3, spring/mild→2, summer/hot/warm→1, default→2
```

---

## Git Branch

Active branch: `claude/elegant-hopper-znxrxk`

```bash
git checkout claude/elegant-hopper-znxrxk
git pull origin claude/elegant-hopper-znxrxk
```

---

## Quick Orientation Commands

```bash
# Verify everything works
npm run dev          # web HUD at http://localhost:8080
cd mcp && npm test   # 9 engine tests

# Lint everything
npm run lint

# Verify MCP handshake
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node mcp/server.js 2>/dev/null
```

You should see all 6 tools listed in the JSON response.
