# PRIMAL MCP Server

Lets an AI agent shop the PRIMAL multi-brand fashion catalog: search products,
compose cross-brand loadouts from a user's profile, swap pieces, and generate a
checkout link — all over the Model Context Protocol.

This is the **agent-facing surface** of PRIMAL. The web HUD is the human-facing
surface; both read the same `../data/catalog.json` and use the same
recommendation engine (`engine.js`).

## Tools

| Tool | Purpose |
|------|---------|
| `set_profile` | Store body specs + style prefs for the session |
| `search_garments` | Filter the catalog (slot, brand, price, archetype, warmth, color, text) |
| `get_product` | Full detail for one product id |
| `recommend_build` | **Core engine** — compose a full loadout from profile + budget + occasion |
| `swap_piece` | Replace one slot with a constrained alternative |
| `create_checkout` | Turn the current build into a (mock) checkout URL + drop code |

## Install

```bash
cd mcp
npm install
```

## Run tests

```bash
npm test        # 9 engine tests, no framework
```

## Connect to Claude Desktop

Add to your `claude_desktop_config.json`:

- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`

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

Restart Claude Desktop. You should see the `primal` tools available.

## Connect to Cursor / other MCP clients

Point the client at the stdio command `node server.js` from this directory.
Any MCP-compatible client works the same way.

## Try it

Once connected, ask your agent things like:

> "I'm 5'11", 75kg, shadow/techwear style, budget $1000, need something for a
> cold rainy commute. Build me a fit."

> "Swap the outer for something warmer under $400."

> "Check me out."

The agent calls `set_profile` → `recommend_build` → `swap_piece` →
`create_checkout` and you get a complete, purchasable, cross-brand outfit
without ever touching a search box.

## Architecture

```
data/catalog.json        ← single source of truth (multi-brand inventory)
mcp/engine.js            ← pure recommendation logic (no I/O, fully testable)
mcp/server.js            ← MCP wrapper exposing engine as agent tools
mcp/engine.test.js       ← node:test unit tests
```

The engine is deliberately I/O-free so the same functions can power the web HUD
in the browser (via a JSON fetch) and the MCP server in Node.
