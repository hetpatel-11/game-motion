# game-motion: Interactive Fiction as Pixel RPG via MCP

## Summary

Classic text adventures (Zork, etc.) visualized as Pokemon GameBoy-style pixel worlds, playable through chat on Claude. Jericho provides gameplay and story, Phaser 3 renders the visual world, MCP Apps delivers the experience inside the Claude chat interface.

## Architecture

Three layers:

```
User (chat) → Claude (AI game master) → MCP Server → Jericho (game engine)
                                           ↓
                                      Phaser Widget (pixel world renderer)
```

### Layer 1: Jericho — Game Engine

Microsoft's Jericho wraps the Frotz Z-machine interpreter. It runs classic interactive fiction games (Zork I, II, III, Hitchhiker's Guide, etc.) and exposes:

- `step(action)` — process player command, return text observation + reward + done flag
- `get_world_objects()` — full object tree (rooms, items, NPCs, parent/child/sibling)
- `get_player_location()` — current room as structured data
- `get_inventory()` — player's items
- `get_valid_actions()` — legal commands from current state
- `get_state()` / `set_state()` — save/load game state

Python process, called from TypeScript MCP server via child process or HTTP bridge.

### Layer 2: MCP Server — Bridge

Built with `mcp-use` framework (TypeScript), following hack-yc patterns.

**Tools:**

| Tool | Input | Jericho Call | Returns |
|---|---|---|---|
| `start-game` | `game?: string` | `reset()` | Initial world state + widget |
| `act` | `command: string` | `step(command)` | Observation, score, objects, location + widget |
| `look` | — | `step("look")` | Room description + objects + widget |
| `inventory` | — | `get_inventory()` | Player's items + widget |
| `valid-actions` | — | `get_valid_actions()` | Legal commands (for AI reasoning) |
| `save` / `load` | `slot?: string` | `get/set_state()` | Save/restore progress |

Each tool returns a widget render with:
- `content` — text summary for AI reasoning ("Player is in West of House. Mailbox is here.")
- `structuredContent` — game state for Phaser (player location, room objects, exits, inventory)
- `_meta` — large data hidden from model (full object tree, map cache)

### Layer 3: Phaser Widget — Visualizer

Single React widget wrapping Phaser 3 canvas, rendered in Claude's MCP App iframe.

**Rendering pipeline:**
1. Receive `structuredContent` with room data from Jericho
2. Map room description to tile layout (procedural + rule-based)
3. Place object sprites based on object tree
4. Animate player character based on actions
5. Show inventory, score, exits overlay

**Visual vocabulary from Monster Tamer:**
- Tilesets: grass, forest, cave, building interior, beach, paths
- Character sprites: player, NPCs
- Object sprites: items, doors, containers
- UI: score display, inventory panel, room name

**Object-to-visual mapping:**

| Jericho Object | Phaser Render |
|---|---|
| Room ("West of House") | Tile map area with house + grass |
| Object ("mailbox") | Sprite at grid position |
| Container state (open/closed) | Sprite variant |
| Exit ("north") | Path tiles leading to edge |
| Item in inventory | Icon in inventory overlay |

### AI Layer — Claude as Game Master

Claude interprets natural language and calls MCP tools:
- "go north" → `act({ command: "north" })`
- "what's in the mailbox?" → `act({ command: "open mailbox" })` then `act({ command: "look in mailbox" })`
- "where am I?" → `look()`
- AI narrates results with personality, adds flavor, suggests next moves
- Uses `valid-actions` to avoid impossible commands

## Tech Stack

| Component | Technology |
|---|---|
| MCP framework | `mcp-use` (TypeScript) |
| Game engine | Jericho + Frotz (Python) |
| Rendering | Phaser 3 |
| Widget shell | React 19 + Tailwind CSS 4 |
| Build | Vite |
| UI components | `@openai/apps-sdk-ui` |
| Validation | Zod |
| Platform | Claude (web/desktop) |

## Data Flow

```
1. User types "open the mailbox"
2. Claude interprets → calls `act` tool with command="open mailbox"
3. MCP server sends command to Jericho Python process
4. Jericho runs step("open mailbox"):
   - Returns: "Opening the small mailbox reveals a leaflet."
   - Object tree updated: mailbox.attr = open, leaflet.parent = mailbox
5. MCP server returns:
   - content: "The mailbox is now open. Inside is a leaflet."
   - structuredContent: { location: "West of House", objects: [...], exits: [...] }
6. Claude narrates: "You flip open the rusty mailbox. Inside, a single leaflet."
7. Phaser widget receives structuredContent:
   - Mailbox sprite changes to "open" variant
   - Leaflet sprite appears
   - Pickup prompt shown
```

## Translation Challenge: Text → Tiles

Core engineering problem: mapping Jericho's abstract world to visual tiles.

**Approach: Rule-based with AI fallback**

1. **Keyword matching** — room descriptions containing "forest" → tree tiles, "house" → building tiles, "cave" → cave tileset
2. **Object placement** — known objects mapped to sprites, placed on grid
3. **Exit mapping** — cardinal directions → path tiles at map edges
4. **AI-assisted** — for unknown rooms, Claude can help generate tile layouts (cached)
5. **Hand-crafted overrides** — for flagship games like Zork, pre-built maps

## MVP Scope

Phase 1 — Zork I only:
- MCP server with `start-game`, `act`, `look`, `inventory` tools
- Jericho Python bridge running Zork I
- Basic Phaser widget rendering room + objects + player
- Rule-based tile mapping for Zork I's rooms
- AI narration of game text

Phase 2 — Polish:
- Animations (walking, item pickup, door opening)
- Hand-crafted Zork I map overrides
- Save/load game state
- Score display and game progress

Phase 3 — Expand:
- Support multiple Z-machine games
- Procedural tile generation for unknown rooms
- Battle system (if applicable to game)
- Sound effects and music

## Reference Projects

- [hack-yc](../../../hack-yc) — MCP Apps starter template (mcp-use patterns)
- [Monster Tamer](https://github.com/devshareacademy/monster-tamer) — Pokemon-like Phaser 3 game (tilesets, sprites)
- [Jericho](https://github.com/microsoft/jericho) — Interactive fiction engine
- [MCP Apps spec](https://blog.modelcontextprotocol.io/posts/2026-01-26-mcp-apps/) — UI rendering in chat

## Open Questions

- Phaser bundle size in MCP App iframe — need to verify sandbox limits
- Python (Jericho) ↔ TypeScript (MCP server) bridge: child process vs HTTP microservice?
- Tile map generation: how much can be automated vs hand-crafted?
- Battle mechanics: defer to Phase 3, design when we get there
