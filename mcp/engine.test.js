/**
 * Engine tests — plain node:test, no framework. Run: node engine.test.js
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  loadCatalog,
  occasionToWarmth,
  scoreProduct,
  searchGarments,
  getProduct,
  recommendBuild,
  swapPiece,
} from "./engine.js";

const catalog = loadCatalog();

test("catalog loads with products", () => {
  assert.ok(catalog.products.length >= 30, "expected a curated catalog");
  for (const p of catalog.products) {
    assert.ok(p.id && p.slot && p.price >= 0, `product ${p.id} well-formed`);
    assert.ok(catalog.meta.slots.includes(p.slot), `${p.id} has a valid slot`);
  }
});

test("occasionToWarmth maps known + fuzzy + default", () => {
  assert.equal(occasionToWarmth("winter"), 4);
  assert.equal(occasionToWarmth("ARCTIC"), 5);
  assert.equal(occasionToWarmth("light rain commute"), 3); // fuzzy 'rain'
  assert.equal(occasionToWarmth("cold rainy night"), 4); // 'cold' wins
  assert.equal(occasionToWarmth(undefined), 2);
});

test("scoreProduct rewards archetype + fit match", () => {
  const p = catalog.products.find((x) => x.id === "acr-j1a");
  const matched = scoreProduct(p, { archetype: "SHADOW", fit: "regular", minWarmth: 2 });
  const unmatched = scoreProduct(p, { archetype: "FIELD", fit: "oversized", minWarmth: 2 });
  assert.ok(matched > unmatched);
});

test("searchGarments filters by slot, price, archetype", () => {
  const outers = searchGarments(catalog, { slot: "outer" });
  assert.ok(outers.every((p) => p.slot === "outer"));
  const cheap = searchGarments(catalog, { maxPrice: 100 });
  assert.ok(cheap.every((p) => p.price <= 100));
  const shadow = searchGarments(catalog, { archetype: "SHADOW" });
  assert.ok(shadow.every((p) => p.archetype.includes("SHADOW")));
});

test("getProduct returns by id or null", () => {
  assert.equal(getProduct(catalog, "acr-j1a").brand, "ACRONYM");
  assert.equal(getProduct(catalog, "nope"), null);
});

test("recommendBuild fills core slots and respects budget", () => {
  const r = recommendBuild(catalog, { archetype: "SHADOW", budget: 1200, occasion: "everyday" });
  const slots = r.build.map((p) => p.slot);
  for (const core of ["outer", "bottom", "feet", "carry"]) {
    assert.ok(slots.includes(core), `build includes ${core}`);
  }
  // budget guard should keep us at/under budget when feasible
  assert.ok(r.total <= 1200 || r.notes.join(" ").includes("Over budget"));
});

test("recommendBuild adds mid-layer when cold", () => {
  const r = recommendBuild(catalog, { archetype: "FIELD", budget: 2000, occasion: "winter" });
  const slots = r.build.map((p) => p.slot);
  assert.ok(slots.includes("mid"), "cold build adds a mid-layer");
});

test("recommendBuild honors a tight budget by down-shifting", () => {
  const lavish = recommendBuild(catalog, { archetype: "SHADOW", budget: 3000, occasion: "everyday" });
  const tight = recommendBuild(catalog, { archetype: "SHADOW", budget: 700, occasion: "everyday" });
  assert.ok(tight.total <= lavish.total, "tighter budget yields a cheaper build");
});

test("swapPiece replaces a slot and changes the build", () => {
  const r = recommendBuild(catalog, { archetype: "URBAN", budget: 1500, occasion: "everyday" });
  const before = r.build.find((p) => p.slot === "feet");
  const swapped = swapPiece(catalog, r.build, "feet", r.profile, { maxPrice: before.price });
  assert.ok(swapped.swapped, "found a swap");
  assert.equal(swapped.build.filter((p) => p.slot === "feet").length, 1, "still one feet item");
});
