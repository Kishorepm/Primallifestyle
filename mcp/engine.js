/**
 * PRIMAL recommendation engine — pure, side-effect-free functions.
 *
 * The same logic powers two surfaces:
 *   - the human-facing HUD web app
 *   - the agent-facing MCP server
 *
 * Nothing here touches I/O, the network, or the MCP SDK, so it can be
 * unit-tested in isolation and reused anywhere.
 */

import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CATALOG_PATH = join(__dirname, "..", "data", "catalog.json");

/** Load and parse the shared catalog. Throws if missing/invalid. */
export function loadCatalog(path = CATALOG_PATH) {
  const raw = readFileSync(path, "utf8");
  return JSON.parse(raw);
}

/* ── occasion → required minimum warmth on the outer layer ── */
const OCCASION_WARMTH = {
  summer: 1,
  mild: 2,
  transitional: 3,
  cold: 4,
  winter: 4,
  arctic: 5,
  rain: 3,
  travel: 3,
  everyday: 2,
};

/** Normalize free-text occasion into a minimum warmth target (1-5). */
export function occasionToWarmth(occasion) {
  if (!occasion) return 2;
  const key = String(occasion).toLowerCase().trim();
  if (OCCASION_WARMTH[key] != null) return OCCASION_WARMTH[key];
  // fuzzy contains
  for (const [k, v] of Object.entries(OCCASION_WARMTH)) {
    if (key.includes(k)) return v;
  }
  return 2;
}

/**
 * Score a single product against a profile. Higher = better fit.
 * Deterministic so recommendations are reproducible.
 */
export function scoreProduct(product, profile = {}) {
  let score = 0;
  const { archetype, fit, minWarmth = 0, colors } = profile;

  // archetype alignment is the strongest signal
  if (archetype && product.archetype?.includes(archetype)) score += 10;

  // fit preference
  if (fit && product.fit === fit) score += 4;

  // warmth: reward meeting the threshold, lightly penalize wild overshoot
  if (product.warmth >= minWarmth) score += 3;
  else score -= (minWarmth - product.warmth) * 2;
  if (product.warmth > minWarmth + 2) score -= 1;

  // color preference
  if (colors?.length && product.colors?.some((c) => colors.includes(c))) score += 2;

  return score;
}

/** Filter the catalog by arbitrary criteria. All fields optional. */
export function searchGarments(catalog, query = {}) {
  const { slot, brand, archetype, maxPrice, minWarmth, fit, color, text } = query;
  return catalog.products.filter((p) => {
    if (slot && p.slot !== slot) return false;
    if (brand && p.brand.toLowerCase() !== String(brand).toLowerCase()) return false;
    if (archetype && !p.archetype.includes(archetype)) return false;
    if (maxPrice != null && p.price > maxPrice) return false;
    if (minWarmth != null && p.warmth < minWarmth) return false;
    if (fit && p.fit !== fit) return false;
    if (color && !p.colors.includes(color)) return false;
    if (text) {
      const hay = `${p.name} ${p.brand} ${p.desc}`.toLowerCase();
      if (!hay.includes(String(text).toLowerCase())) return false;
    }
    return true;
  });
}

/** Get one product by id, or null. */
export function getProduct(catalog, id) {
  return catalog.products.find((p) => p.id === id) ?? null;
}

/**
 * Compose a full cross-brand loadout from a profile + budget + occasion.
 *
 * Strategy: fill core slots (outer, bottom, feet, carry) always; add mid and
 * head if warmth demands or budget allows. Greedy by score, with a budget
 * guard that down-shifts to the best affordable candidate per slot.
 *
 * Returns { build: [products], total, slots, notes }.
 */
export function recommendBuild(catalog, opts = {}) {
  const {
    archetype = "SHADOW",
    fit = "regular",
    budget = 1200,
    occasion = "everyday",
    colors = [],
  } = opts;

  const minWarmth = occasionToWarmth(occasion);
  const profile = { archetype, fit, minWarmth, colors };

  // Core slots are mandatory; mid/head are conditional.
  const coreSlots = ["outer", "bottom", "feet", "carry"];
  const wantMid = minWarmth >= 3;
  const wantHead = minWarmth >= 2;
  const slots = [...coreSlots];
  if (wantMid) slots.splice(1, 0, "mid");
  if (wantHead) slots.push("head");

  // Rank candidates per slot by score (desc), then price (asc) as tiebreak.
  const ranked = {};
  for (const slot of slots) {
    ranked[slot] = catalog.products
      .filter((p) => p.slot === slot)
      .map((p) => ({ p, s: scoreProduct(p, profile) }))
      .sort((a, b) => b.s - a.s || a.p.price - b.p.price)
      .map((x) => x.p);
  }

  // First pass: take the top-ranked item per slot.
  const picks = {};
  for (const slot of slots) picks[slot] = ranked[slot][0] ?? null;

  let total = sum(picks);

  // Budget guard: while over budget, find the slot where swapping to the next
  // affordable candidate saves the most without dropping below the warmth floor.
  let guard = 0;
  while (total > budget && guard++ < 50) {
    let bestSwap = null;
    for (const slot of slots) {
      const current = picks[slot];
      if (!current) continue;
      const cheaper = ranked[slot].find(
        (c) => c.price < current.price && (slot !== "outer" || c.warmth >= minWarmth)
      );
      if (cheaper) {
        const saving = current.price - cheaper.price;
        if (!bestSwap || saving > bestSwap.saving) {
          bestSwap = { slot, cheaper, saving };
        }
      }
    }
    if (!bestSwap) break; // can't get cheaper without violating constraints
    picks[bestSwap.slot] = bestSwap.cheaper;
    total = sum(picks);
  }

  const build = slots.map((s) => picks[s]).filter(Boolean);
  const notes = [];
  if (total > budget) notes.push(`Over budget by $${total - budget} — minimum viable ${archetype} build for ${occasion}.`);
  else notes.push(`${archetype} build for ${occasion}, $${budget - total} under budget.`);
  if (wantMid) notes.push("Mid-layer added for warmth.");

  return { build, total, slots, notes, profile };
}

/**
 * Swap one slot of an existing build for a better/constrained alternative.
 * constraints: { maxPrice, minWarmth, brand, color }
 */
export function swapPiece(catalog, build, slot, profile = {}, constraints = {}) {
  const candidates = searchGarments(catalog, { slot, ...constraints })
    .map((p) => ({ p, s: scoreProduct(p, profile) }))
    .sort((a, b) => b.s - a.s || a.p.price - b.p.price)
    .map((x) => x.p);

  const currentId = build.find((p) => p.slot === slot)?.id;
  // prefer the top candidate that isn't the current piece
  const next = candidates.find((c) => c.id !== currentId) ?? candidates[0] ?? null;
  if (!next) return { build, swapped: null };

  const newBuild = build.map((p) => (p.slot === slot ? next : p));
  if (!build.some((p) => p.slot === slot)) newBuild.push(next);
  return { build: newBuild, swapped: next, total: newBuild.reduce((a, p) => a + p.price, 0) };
}

/* ── helpers ── */
function sum(picksObj) {
  return Object.values(picksObj).reduce((a, p) => a + (p?.price ?? 0), 0);
}
