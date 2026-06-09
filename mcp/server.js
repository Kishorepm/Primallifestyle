#!/usr/bin/env node
/**
 * PRIMAL MCP server.
 *
 * Exposes the PRIMAL fashion marketplace to any MCP client (Claude Desktop,
 * Cursor, etc.) so an AI agent can search the catalog, build cross-brand
 * loadouts from a user's profile, swap pieces, and produce a checkout link.
 *
 * Transport: stdio. Run with `node server.js` or wire it into a client config.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import {
  loadCatalog,
  searchGarments,
  getProduct,
  recommendBuild,
  swapPiece,
} from "./engine.js";

const catalog = loadCatalog();

/* ── in-memory session profile (one client = one process = one profile) ── */
const session = {
  profile: { archetype: "SHADOW", fit: "regular", colors: [] },
  lastBuild: null,
};

const ARCHETYPE = z.enum(["URBAN", "SHADOW", "FIELD"]);
const FIT = z.enum(["slim", "regular", "oversized"]);

/* ── formatting helpers ── */
const money = (n) => `$${n.toLocaleString()}`;
function fmtProduct(p) {
  return `• ${p.brand} ${p.name} — ${money(p.price)}  [${p.id}]\n  ${p.slot} · ${p.archetype.join("/")} · warmth ${p.warmth}/5 · ${p.fit} · ${p.colors.join(", ")}\n  ${p.desc}`;
}
function fmtBuild(result) {
  const lines = result.build.map((p) => `  ${p.slot.toUpperCase().padEnd(7)} ${p.brand} ${p.name} — ${money(p.price)}`);
  return [
    `BUILD TOTAL: ${money(result.total)}`,
    ...lines,
    "",
    result.notes.join(" "),
  ].join("\n");
}

const server = new McpServer({ name: "primal", version: "1.0.0" });

/* ── set_profile ── */
server.registerTool(
  "set_profile",
  {
    title: "Set shopper profile",
    description: "Store the user's body specs and style preferences for this session. Call this first; recommend_build uses it.",
    inputSchema: {
      archetype: ARCHETYPE.optional().describe("Style direction: URBAN, SHADOW, or FIELD"),
      fit: FIT.optional().describe("Preferred fit"),
      height_cm: z.number().int().min(120).max(230).optional(),
      weight_kg: z.number().int().min(35).max(200).optional(),
      colors: z.array(z.string()).optional().describe("Preferred colors, e.g. ['black','grey']"),
    },
  },
  async (args) => {
    session.profile = { ...session.profile, ...args, colors: args.colors ?? session.profile.colors };
    return { content: [{ type: "text", text: `Profile updated:\n${JSON.stringify(session.profile, null, 2)}` }] };
  }
);

/* ── search_garments ── */
server.registerTool(
  "search_garments",
  {
    title: "Search the catalog",
    description: "Filter PRIMAL's multi-brand catalog. All filters optional. Returns matching products with ids.",
    inputSchema: {
      slot: z.enum(["outer", "mid", "bottom", "feet", "carry", "head"]).optional(),
      brand: z.string().optional(),
      archetype: ARCHETYPE.optional(),
      maxPrice: z.number().optional(),
      minWarmth: z.number().int().min(0).max(5).optional(),
      fit: FIT.optional(),
      color: z.string().optional(),
      text: z.string().optional().describe("Free-text match on name/brand/description"),
    },
  },
  async (query) => {
    const results = searchGarments(catalog, query);
    const text = results.length
      ? `${results.length} match(es):\n\n${results.map(fmtProduct).join("\n\n")}`
      : "No products match those filters.";
    return { content: [{ type: "text", text }] };
  }
);

/* ── get_product ── */
server.registerTool(
  "get_product",
  {
    title: "Get product detail",
    description: "Full detail for one product by its id.",
    inputSchema: { id: z.string().describe("Product id, e.g. 'acr-j1a'") },
  },
  async ({ id }) => {
    const p = getProduct(catalog, id);
    return {
      content: [{ type: "text", text: p ? `${fmtProduct(p)}\n  sizes: ${p.sizes.join(", ")}` : `No product with id '${id}'.` }],
      isError: !p,
    };
  }
);

/* ── recommend_build ── */
server.registerTool(
  "recommend_build",
  {
    title: "Recommend a full build",
    description: "The core engine. Composes a complete cross-brand loadout from the session profile (or overrides), a budget, and an occasion. Returns the build, total, and reasoning.",
    inputSchema: {
      archetype: ARCHETYPE.optional(),
      fit: FIT.optional(),
      budget: z.number().min(100).optional().describe("Total budget in USD"),
      occasion: z.string().optional().describe("e.g. 'winter', 'rain', 'everyday', 'travel'"),
      colors: z.array(z.string()).optional(),
    },
  },
  async (args) => {
    const opts = {
      archetype: args.archetype ?? session.profile.archetype,
      fit: args.fit ?? session.profile.fit,
      colors: args.colors ?? session.profile.colors,
      budget: args.budget ?? 1200,
      occasion: args.occasion ?? "everyday",
    };
    const result = recommendBuild(catalog, opts);
    session.lastBuild = result.build;
    return { content: [{ type: "text", text: fmtBuild(result) }] };
  }
);

/* ── swap_piece ── */
server.registerTool(
  "swap_piece",
  {
    title: "Swap a piece in the current build",
    description: "Replace one slot of the most recent build with a better/constrained alternative. e.g. 'swap the outer for something warmer under $400'.",
    inputSchema: {
      slot: z.enum(["outer", "mid", "bottom", "feet", "carry", "head"]),
      maxPrice: z.number().optional(),
      minWarmth: z.number().int().min(0).max(5).optional(),
      brand: z.string().optional(),
      color: z.string().optional(),
    },
  },
  async ({ slot, ...constraints }) => {
    if (!session.lastBuild) {
      return { content: [{ type: "text", text: "No active build. Call recommend_build first." }], isError: true };
    }
    const res = swapPiece(catalog, session.lastBuild, slot, session.profile, constraints);
    if (!res.swapped) {
      return { content: [{ type: "text", text: `No alternative found for slot '${slot}' under those constraints.` }], isError: true };
    }
    session.lastBuild = res.build;
    const result = { build: res.build, total: res.total, notes: [`Swapped ${slot} → ${res.swapped.brand} ${res.swapped.name}.`] };
    return { content: [{ type: "text", text: fmtBuild(result) }] };
  }
);

/* ── create_checkout ── */
server.registerTool(
  "create_checkout",
  {
    title: "Create a checkout link",
    description: "Turn the current build into a purchasable cart and return a (mock) checkout URL with a PRIMAL drop code.",
    inputSchema: {},
  },
  async () => {
    if (!session.lastBuild?.length) {
      return { content: [{ type: "text", text: "No active build to check out. Call recommend_build first." }], isError: true };
    }
    const ids = session.lastBuild.map((p) => p.id);
    const total = session.lastBuild.reduce((a, p) => a + p.price, 0);
    const code = "PRM-" + Math.random().toString(36).slice(2, 6).toUpperCase() + "-" + Math.random().toString(36).slice(2, 6).toUpperCase();
    const url = `https://primal.shop/checkout?items=${ids.join(",")}&code=${code}`;
    return {
      content: [{ type: "text", text: `Checkout ready — ${money(total)}\nDrop code: ${code}\n${url}\n\n(Mock endpoint for the MVP — wire to a real cart/payments provider next.)` }],
    };
  }
);

/* ── boot ── */
const transport = new StdioServerTransport();
await server.connect(transport);
console.error("PRIMAL MCP server running on stdio.");
