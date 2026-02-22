# game-motion Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build an MCP App that renders classic text adventures (Zork I) as a Pokemon GameBoy-style pixel world, playable through chat commands on Claude.

**Architecture:** Three layers — (1) Python bridge to Jericho/Frotz game engine, (2) TypeScript MCP server using mcp-use framework, (3) React + Phaser 3 widget for visual rendering. Chat commands → MCP tool → Jericho step → structured game state → Phaser renders pixel world.

**Tech Stack:** mcp-use (TypeScript), Jericho + Frotz (Python), Phaser 3, React 19, Tailwind CSS 4, Vite, Zod

**Reference project:** `/Users/mac357/dev/ycom/hack-yc` — mcp-use MCP Apps starter (copy patterns exactly)

---

## Task 1: Scaffold MCP Server (mcp-use)

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `index.ts`
- Create: `.gitignore`

**Step 1: Initialize package.json**

```json
{
  "name": "game-motion",
  "type": "module",
  "version": "1.0.0",
  "description": "Interactive fiction as pixel RPG via MCP",
  "main": "dist/index.js",
  "scripts": {
    "build": "mcp-use build",
    "dev": "mcp-use dev",
    "start": "mcp-use start",
    "deploy": "mcp-use deploy",
    "postinstall": "mcp-use generate-types || true"
  },
  "dependencies": {
    "@openai/apps-sdk-ui": "^0.2.1",
    "mcp-use": "latest",
    "phaser": "^3.87.0",
    "react": "^19.2.4",
    "react-dom": "^19.2.4",
    "tailwindcss": "^4.2.0",
    "zod": "4.3.5"
  },
  "devDependencies": {
    "@tailwindcss/vite": "^4.2.0",
    "@types/node": "^25.3.0",
    "@types/react": "^19.2.14",
    "@types/react-dom": "^19.2.3",
    "@vitejs/plugin-react": "^5.1.4",
    "tsx": "^4.21.0",
    "typescript": "^5.9.3",
    "vite": "^7.3.1"
  },
  "license": "MIT"
}
```

**Step 2: Create tsconfig.json**

Copy from hack-yc exactly:
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "allowJs": true,
    "strict": true,
    "outDir": "./dist",
    "sourceMap": true,
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "baseUrl": ".",
    "paths": { "@/*": ["src/*"] }
  },
  "include": ["index.ts", "src/**/*", "resources/**/*", "server.ts", ".mcp-use/**/*.d.ts"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 3: Create .gitignore**

```
node_modules/
dist/
.mcp-use/
*.z5
*.z8
__pycache__/
*.pyc
.venv/
```

**Step 4: Create index.ts — minimal MCP server with one placeholder tool**

```typescript
import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "game-motion",
  title: "Game Motion",
  version: "1.0.0",
  description: "Classic text adventures as pixel RPG worlds",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [{ src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
});

server.tool(
  {
    name: "start-game",
    description: "Start a new interactive fiction game and display the world",
    schema: z.object({
      game: z.string().optional().describe("Game to play (default: zork1)"),
    }),
    widget: {
      name: "game-world",
      invoking: "Loading world...",
      invoked: "World loaded",
    },
  },
  async ({ game }) => {
    return widget({
      props: {
        observation: "You are standing in an open field west of a white house, with a boarded front door. There is a small mailbox here.",
        location: "West of House",
        objects: ["mailbox", "door"],
        exits: ["north", "south", "west"],
        score: 0,
        moves: 0,
      },
      output: text("Game started: Zork I. You are west of a white house."),
    });
  }
);

server.listen().then(() => {
  console.log("Game Motion server running");
});
```

**Step 5: Install dependencies**

Run: `npm install`

**Step 6: Verify server starts**

Run: `npm run dev`
Expected: "Game Motion server running" in console

**Step 7: Commit**

```bash
git add package.json tsconfig.json index.ts .gitignore
git commit -m "scaffold mcp server with mcp-use"
```

---

## Task 2: Jericho Python Bridge

**Files:**
- Create: `bridge/server.py`
- Create: `bridge/requirements.txt`
- Create: `src/jericho-bridge.ts`

**Step 1: Create Python requirements**

File: `bridge/requirements.txt`
```
jericho
flask
```

**Step 2: Create Python HTTP bridge**

File: `bridge/server.py`

A minimal Flask server that wraps Jericho's FrotzEnv. Each endpoint maps to a Jericho method, returning JSON.

```python
import json
import os
import base64
import pickle
from flask import Flask, request, jsonify
from jericho import FrotzEnv

app = Flask(__name__)
env = None
GAMES_DIR = os.path.join(os.path.dirname(__file__), "games")


@app.route("/start", methods=["POST"])
def start_game():
    global env
    data = request.json or {}
    game = data.get("game", "zork1")
    game_path = os.path.join(GAMES_DIR, f"{game}.z5")
    if not os.path.exists(game_path):
        return jsonify({"error": f"Game not found: {game_path}"}), 404
    env = FrotzEnv(game_path)
    obs, info = env.reset()
    return jsonify({
        "observation": obs,
        "info": info,
        "location": _get_location(),
        "inventory": _get_inventory(),
        "objects": _get_room_objects(),
        "valid_actions": env.get_valid_actions(),
        "max_score": env.get_max_score(),
    })


@app.route("/step", methods=["POST"])
def step():
    global env
    if env is None:
        return jsonify({"error": "No game running"}), 400
    data = request.json or {}
    command = data.get("command", "look")
    obs, reward, done, info = env.step(command)
    return jsonify({
        "observation": obs,
        "reward": reward,
        "done": done,
        "info": info,
        "location": _get_location(),
        "inventory": _get_inventory(),
        "objects": _get_room_objects(),
        "valid_actions": env.get_valid_actions(),
    })


@app.route("/save", methods=["POST"])
def save_state():
    global env
    if env is None:
        return jsonify({"error": "No game running"}), 400
    state = env.get_state()
    encoded = base64.b64encode(pickle.dumps(state)).decode("ascii")
    return jsonify({"state": encoded})


@app.route("/load", methods=["POST"])
def load_state():
    global env
    if env is None:
        return jsonify({"error": "No game running"}), 400
    data = request.json or {}
    state = pickle.loads(base64.b64decode(data["state"]))
    env.set_state(state)
    return jsonify({
        "observation": "State restored.",
        "location": _get_location(),
        "inventory": _get_inventory(),
        "objects": _get_room_objects(),
        "valid_actions": env.get_valid_actions(),
    })


def _get_location():
    try:
        loc = env.get_player_location()
        return {"num": loc.num, "name": loc.name} if loc else None
    except Exception:
        return None


def _get_inventory():
    try:
        items = env.get_inventory()
        return [{"num": o.num, "name": o.name} for o in items]
    except Exception:
        return []


def _get_room_objects():
    try:
        loc = env.get_player_location()
        if not loc:
            return []
        all_objects = env.get_world_objects()
        room_objects = [
            {"num": o.num, "name": o.name, "parent": o.parent}
            for o in all_objects
            if o.parent == loc.num and o.num != env.get_player_object().num
        ]
        return room_objects
    except Exception:
        return []


if __name__ == "__main__":
    app.run(port=5001, debug=False)
```

**Step 3: Create TypeScript bridge client**

File: `src/jericho-bridge.ts`

```typescript
const BRIDGE_URL = process.env.JERICHO_URL || "http://localhost:5001";

export interface GameState {
  observation: string;
  location: { num: number; name: string } | null;
  inventory: { num: number; name: string }[];
  objects: { num: number; name: string; parent: number }[];
  valid_actions: string[];
  info?: { score: number; moves: number };
  reward?: number;
  done?: boolean;
  max_score?: number;
}

async function call(endpoint: string, body?: Record<string, unknown>): Promise<GameState> {
  const res = await fetch(`${BRIDGE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Bridge error: ${res.status}`);
  }
  return res.json();
}

export async function startGame(game = "zork1"): Promise<GameState> {
  return call("/start", { game });
}

export async function step(command: string): Promise<GameState> {
  return call("/step", { command });
}

export async function saveGame(): Promise<string> {
  const res = await call("/save");
  return (res as unknown as { state: string }).state;
}

export async function loadGame(state: string): Promise<GameState> {
  return call("/load", { state });
}
```

**Step 4: Download Zork I game file**

Jericho provides a download utility. Create `bridge/download_games.py`:

```python
import jericho
import os
import shutil

games_dir = os.path.join(os.path.dirname(__file__), "games")
os.makedirs(games_dir, exist_ok=True)

# Jericho ships game ROMs in its package data
rom_dir = os.path.join(os.path.dirname(jericho.__file__), "roms")
if os.path.exists(rom_dir):
    for f in os.listdir(rom_dir):
        if f.endswith((".z5", ".z8", ".z3")):
            shutil.copy(os.path.join(rom_dir, f), os.path.join(games_dir, f))
            print(f"Copied {f}")
else:
    print(f"Jericho roms not found at {rom_dir}")
    print("Download manually: https://github.com/microsoft/jericho")
```

**Step 5: Set up Python environment and test bridge**

Run:
```bash
cd bridge
uv venv && uv pip install -r requirements.txt
python download_games.py
python server.py
```
Expected: Flask server running on port 5001

In a separate terminal, test:
```bash
curl -X POST http://localhost:5001/start -H "Content-Type: application/json" -d '{"game":"zork1"}'
```
Expected: JSON with observation about "west of a white house"

**Step 6: Commit**

```bash
git add bridge/ src/jericho-bridge.ts
git commit -m "add jericho python bridge and typescript client"
```

---

## Task 3: Wire MCP Tools to Jericho Bridge

**Files:**
- Modify: `index.ts`

**Step 1: Replace placeholder tools with real Jericho-backed tools**

Replace the entire `index.ts` with:

```typescript
import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { startGame, step, saveGame, loadGame, type GameState } from "./src/jericho-bridge.js";

const server = new MCPServer({
  name: "game-motion",
  title: "Game Motion",
  version: "1.0.0",
  description: "Classic text adventures as pixel RPG worlds. Start a game, then interact through chat commands.",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [{ src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
});

function formatState(state: GameState): string {
  const loc = state.location?.name ?? "Unknown";
  const items = state.objects.map((o) => o.name).join(", ") || "nothing notable";
  const exits = state.valid_actions.filter((a) =>
    ["north", "south", "east", "west", "up", "down"].includes(a)
  );
  const inv = state.inventory.map((i) => i.name).join(", ") || "empty";
  const score = state.info?.score ?? 0;
  const moves = state.info?.moves ?? 0;
  return [
    `Location: ${loc}`,
    `You see: ${items}`,
    `Exits: ${exits.join(", ") || "none obvious"}`,
    `Inventory: ${inv}`,
    `Score: ${score} | Moves: ${moves}`,
    ``,
    state.observation,
  ].join("\n");
}

server.tool(
  {
    name: "start-game",
    description: "Start a new interactive fiction game. Returns the opening scene as a visual pixel world.",
    schema: z.object({
      game: z.string().optional().describe("Game to play (default: zork1)"),
    }),
    widget: {
      name: "game-world",
      invoking: "Loading world...",
      invoked: "World loaded",
    },
  },
  async ({ game }) => {
    const state = await startGame(game ?? "zork1");
    return widget({
      props: {
        observation: state.observation,
        location: state.location,
        objects: state.objects,
        inventory: state.inventory,
        validActions: state.valid_actions,
        score: state.info?.score ?? 0,
        moves: state.info?.moves ?? 0,
        maxScore: state.max_score ?? 0,
        done: false,
      },
      output: text(formatState(state)),
    });
  }
);

server.tool(
  {
    name: "act",
    description: "Execute a command in the game world (e.g. 'open mailbox', 'north', 'take sword'). Returns updated visual world.",
    schema: z.object({
      command: z.string().describe("The game command to execute"),
    }),
    widget: {
      name: "game-world",
      invoking: "Acting...",
      invoked: "Action complete",
    },
  },
  async ({ command }) => {
    const state = await step(command);
    return widget({
      props: {
        observation: state.observation,
        location: state.location,
        objects: state.objects,
        inventory: state.inventory,
        validActions: state.valid_actions,
        score: state.info?.score ?? 0,
        moves: state.info?.moves ?? 0,
        reward: state.reward ?? 0,
        done: state.done ?? false,
      },
      output: text(formatState(state)),
    });
  }
);

server.tool(
  {
    name: "valid-actions",
    description: "Get the list of valid actions from the current game state. Use this to understand what commands are possible before acting.",
    schema: z.object({}),
  },
  async () => {
    const state = await step("look");
    return text(`Valid actions: ${state.valid_actions.join(", ")}`);
  }
);

server.tool(
  {
    name: "save-game",
    description: "Save the current game state",
    schema: z.object({}),
    outputSchema: z.object({ state: z.string() }),
  },
  async () => {
    const encoded = await saveGame();
    return { state: encoded } as any;
  }
);

server.tool(
  {
    name: "load-game",
    description: "Load a previously saved game state",
    schema: z.object({
      state: z.string().describe("The saved game state string"),
    }),
    widget: {
      name: "game-world",
      invoking: "Loading save...",
      invoked: "Game restored",
    },
  },
  async ({ state: savedState }) => {
    const state = await loadGame(savedState);
    return widget({
      props: {
        observation: state.observation,
        location: state.location,
        objects: state.objects,
        inventory: state.inventory,
        validActions: state.valid_actions,
        score: 0,
        moves: 0,
        done: false,
      },
      output: text(formatState(state)),
    });
  }
);

server.listen().then(() => {
  console.log("Game Motion server running");
});
```

**Step 2: Test the full flow**

Start both servers:
```bash
# Terminal 1: Python bridge
cd bridge && python server.py

# Terminal 2: MCP server
npm run dev
```

Expected: Both servers running, MCP server connects to Jericho bridge.

**Step 3: Commit**

```bash
git add index.ts
git commit -m "wire mcp tools to jericho bridge"
```

---

## Task 4: Game World Widget — Static Rendering

**Files:**
- Create: `resources/game-world/widget.tsx`
- Create: `resources/game-world/types.ts`
- Create: `resources/styles.css`
- Create: `public/favicon.ico` (placeholder)
- Create: `public/icon.svg` (placeholder)

**Step 1: Create shared styles**

File: `resources/styles.css` (copy from hack-yc, stripped down)
```css
@import "tailwindcss";
@import "@openai/apps-sdk-ui/css";

@source "../node_modules/@openai/apps-sdk-ui";
@source "./**/*.{ts,tsx,js,jsx,html}";

@theme {
  --color-scheme: light dark;
}

@variant dark (&:where(.dark, .dark *));

body {
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Roboto", sans-serif;
  -webkit-font-smoothing: antialiased;
  background: #1a1a2e;
  color: #e0e0e0;
}
```

**Step 2: Create widget types**

File: `resources/game-world/types.ts`
```typescript
import { z } from "zod";

export const propSchema = z.object({
  observation: z.string(),
  location: z.object({ num: z.number(), name: z.string() }).nullable(),
  objects: z.array(z.object({ num: z.number(), name: z.string(), parent: z.number() })),
  inventory: z.array(z.object({ num: z.number(), name: z.string() })),
  validActions: z.array(z.string()),
  score: z.number(),
  moves: z.number(),
  maxScore: z.number().optional(),
  reward: z.number().optional(),
  done: z.boolean(),
});

export type GameWorldProps = z.infer<typeof propSchema>;
```

**Step 3: Create the game world widget — text-based first (no Phaser yet)**

Start with a styled text display that shows the game state in a GameBoy-inspired UI. We'll add Phaser in the next task.

File: `resources/game-world/widget.tsx`
```tsx
import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React from "react";
import "../styles.css";
import { propSchema, type GameWorldProps } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive fiction game world rendered as pixel RPG",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading world...",
    invoked: "World loaded",
  },
};

const GameWorld: React.FC = () => {
  const { props, isPending } = useWidget<GameWorldProps>();

  if (isPending) {
    return (
      <McpUseProvider>
        <div className="bg-[#1a1a2e] rounded-2xl p-6 text-[#e0e0e0] font-mono">
          <div className="animate-pulse text-center">Loading world...</div>
        </div>
      </McpUseProvider>
    );
  }

  const { observation, location, objects, inventory, validActions, score, moves, done } = props;
  const exits = validActions.filter((a) =>
    ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"].includes(a)
  );

  return (
    <McpUseProvider>
      <div className="bg-[#0f0f23] rounded-2xl overflow-hidden font-mono text-sm" style={{ maxWidth: 480 }}>
        {/* Header bar — GameBoy style */}
        <div className="bg-[#1a1a2e] px-4 py-2 flex justify-between items-center border-b border-[#2a2a4a]">
          <span className="text-[#88c070] font-bold text-xs uppercase tracking-wider">
            {location?.name ?? "Unknown"}
          </span>
          <span className="text-[#a0a0b0] text-xs">
            Score: {score} | Moves: {moves}
          </span>
        </div>

        {/* Game screen — pixel art placeholder area */}
        <div className="bg-[#306230] mx-4 mt-4 rounded-lg p-4 min-h-[200px] flex items-center justify-center border-2 border-[#0f380f]">
          <div className="text-center text-[#0f380f] text-xs">
            [ Pixel world renders here ]
          </div>
        </div>

        {/* Observation text */}
        <div className="px-4 py-3">
          <p className="text-[#c8c8d8] leading-relaxed text-xs">
            {observation}
          </p>
        </div>

        {/* Objects in room */}
        {objects.length > 0 && (
          <div className="px-4 pb-2">
            <span className="text-[#88c070] text-xs font-bold">You see: </span>
            <span className="text-[#a0a0b0] text-xs">
              {objects.map((o) => o.name).join(", ")}
            </span>
          </div>
        )}

        {/* Exits */}
        {exits.length > 0 && (
          <div className="px-4 pb-2">
            <span className="text-[#88c070] text-xs font-bold">Exits: </span>
            <span className="text-[#a0a0b0] text-xs">{exits.join(", ")}</span>
          </div>
        )}

        {/* Inventory */}
        {inventory.length > 0 && (
          <div className="px-4 pb-2">
            <span className="text-[#88c070] text-xs font-bold">Carrying: </span>
            <span className="text-[#a0a0b0] text-xs">
              {inventory.map((i) => i.name).join(", ")}
            </span>
          </div>
        )}

        {/* Game over */}
        {done && (
          <div className="px-4 pb-3">
            <span className="text-[#ff6b6b] text-xs font-bold">*** GAME OVER ***</span>
          </div>
        )}

        {/* Bottom bar */}
        <div className="bg-[#1a1a2e] px-4 py-2 border-t border-[#2a2a4a]">
          <span className="text-[#606080] text-xs">Type commands in chat to play</span>
        </div>
      </div>
    </McpUseProvider>
  );
};

export default GameWorld;
```

**Step 4: Create placeholder public assets**

File: `public/icon.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="64" fill="#306230"/>
  <text x="256" y="300" text-anchor="middle" font-size="240" fill="#0f380f" font-family="monospace">GM</text>
</svg>
```

Create `public/favicon.ico` as a copy of icon.svg (or generate one — a simple placeholder is fine).

**Step 5: Verify widget builds**

Run: `npm run build`
Expected: Build succeeds, widget bundled

**Step 6: Commit**

```bash
git add resources/ public/
git commit -m "add game world widget with gameboy-style text display"
```

---

## Task 5: End-to-End Integration Test

**Files:**
- No new files — testing the full stack

**Step 1: Start Python bridge**

```bash
cd bridge && python server.py
```

**Step 2: Start MCP server with tunnel**

```bash
npm run dev -- --tunnel
```

This creates a tunnel URL like `https://<subdomain>.tunnel.mcp-use.com/mcp`

**Step 3: Add to Claude**

1. Go to Claude → Settings → Integrations → Add integration
2. Paste the tunnel URL
3. Start a conversation and type: "Start a game of Zork"

Expected: Claude calls `start-game` tool, widget renders with GameBoy-style display showing "West of House"

**Step 4: Test game interaction**

Type: "open the mailbox"
Expected: Claude calls `act` with command "open mailbox", widget updates with new observation

**Step 5: Verify and document any issues**

Note any issues with:
- Widget rendering in iframe
- State passing between tool calls
- Bridge response times
- Valid actions accuracy

**Step 6: Commit any fixes**

```bash
git add -u
git commit -m "fix integration issues from end-to-end test"
```

---

## Task 6: Phaser 3 Canvas — Basic Room Rendering

**Files:**
- Create: `resources/game-world/phaser/GameScene.ts`
- Create: `resources/game-world/phaser/config.ts`
- Create: `resources/game-world/phaser/tile-mapper.ts`
- Modify: `resources/game-world/widget.tsx`
- Create: `public/tiles/` (tileset PNGs)

**Step 1: Create tile mapper — maps room descriptions to tile types**

File: `resources/game-world/phaser/tile-mapper.ts`

```typescript
export type TileType = "grass" | "forest" | "house" | "cave" | "water" | "path" | "indoor" | "dark";

export interface RoomLayout {
  tileType: TileType;
  exits: Record<string, boolean>;
  objectPositions: { name: string; x: number; y: number }[];
}

const ROOM_KEYWORDS: Record<string, TileType> = {
  forest: "forest",
  tree: "forest",
  clearing: "forest",
  house: "house",
  kitchen: "indoor",
  attic: "indoor",
  living: "indoor",
  room: "indoor",
  cave: "cave",
  cavern: "cave",
  underground: "cave",
  cellar: "cave",
  river: "water",
  lake: "water",
  stream: "water",
  dam: "water",
  path: "path",
  road: "path",
  trail: "path",
  dark: "dark",
  maze: "dark",
};

export function mapRoomToLayout(
  locationName: string,
  observation: string,
  objects: { name: string }[],
  validActions: string[]
): RoomLayout {
  const combined = `${locationName} ${observation}`.toLowerCase();

  let tileType: TileType = "grass";
  for (const [keyword, type] of Object.entries(ROOM_KEYWORDS)) {
    if (combined.includes(keyword)) {
      tileType = type;
      break;
    }
  }

  const exitDirs = ["north", "south", "east", "west", "up", "down"];
  const exits: Record<string, boolean> = {};
  for (const dir of exitDirs) {
    exits[dir] = validActions.includes(dir);
  }

  const objectPositions = objects.map((obj, i) => ({
    name: obj.name,
    x: 3 + (i % 4) * 2,
    y: 3 + Math.floor(i / 4) * 2,
  }));

  return { tileType, exits, objectPositions };
}
```

**Step 2: Create Phaser scene**

File: `resources/game-world/phaser/GameScene.ts`

```typescript
import Phaser from "phaser";
import { mapRoomToLayout, type RoomLayout, type TileType } from "./tile-mapper";

const TILE_SIZE = 16;
const MAP_WIDTH = 10;
const MAP_HEIGHT = 10;

const TILE_COLORS: Record<TileType, number> = {
  grass: 0x306230,
  forest: 0x1a4a1a,
  house: 0x8b6914,
  cave: 0x3a3a3a,
  water: 0x2060a0,
  path: 0xc8b060,
  indoor: 0x705030,
  dark: 0x101010,
};

const OBJECT_COLORS: Record<string, number> = {
  mailbox: 0xc0c0c0,
  door: 0x8b4513,
  sword: 0xd4af37,
  lamp: 0xffd700,
  leaflet: 0xffffff,
  default: 0xe0a0a0,
};

export class GameScene extends Phaser.Scene {
  private layout: RoomLayout | null = null;
  private playerSprite: Phaser.GameObjects.Rectangle | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  init(data: {
    locationName: string;
    observation: string;
    objects: { name: string }[];
    validActions: string[];
  }) {
    this.layout = mapRoomToLayout(
      data.locationName,
      data.observation,
      data.objects,
      data.validActions
    );
  }

  create() {
    if (!this.layout) return;
    this.cameras.main.setBackgroundColor(0x0f380f);

    // Draw tile grid
    for (let y = 0; y < MAP_HEIGHT; y++) {
      for (let x = 0; x < MAP_WIDTH; x++) {
        const color = TILE_COLORS[this.layout.tileType];
        const variation = ((x + y) % 2 === 0) ? 0x080808 : 0;
        this.add.rectangle(
          x * TILE_SIZE + TILE_SIZE / 2,
          y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
          color + variation
        );
      }
    }

    // Draw exits as path tiles
    const exitPositions: Record<string, { x: number; y: number }> = {
      north: { x: 5, y: 0 },
      south: { x: 5, y: 9 },
      east: { x: 9, y: 5 },
      west: { x: 0, y: 5 },
    };
    for (const [dir, open] of Object.entries(this.layout.exits)) {
      if (open && exitPositions[dir]) {
        const pos = exitPositions[dir];
        this.add.rectangle(
          pos.x * TILE_SIZE + TILE_SIZE / 2,
          pos.y * TILE_SIZE + TILE_SIZE / 2,
          TILE_SIZE - 1,
          TILE_SIZE - 1,
          TILE_COLORS.path
        );
      }
    }

    // Draw objects
    for (const obj of this.layout.objectPositions) {
      const color = OBJECT_COLORS[obj.name] ?? OBJECT_COLORS.default;
      this.add.rectangle(
        obj.x * TILE_SIZE + TILE_SIZE / 2,
        obj.y * TILE_SIZE + TILE_SIZE / 2,
        TILE_SIZE - 2,
        TILE_SIZE - 2,
        color
      );
    }

    // Draw player
    this.playerSprite = this.add.rectangle(
      5 * TILE_SIZE + TILE_SIZE / 2,
      5 * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE - 2,
      TILE_SIZE - 2,
      0x88c070
    );
  }
}
```

**Step 3: Create Phaser config**

File: `resources/game-world/phaser/config.ts`

```typescript
import Phaser from "phaser";
import { GameScene } from "./GameScene";

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    type: Phaser.AUTO,
    width: 160,
    height: 160,
    parent,
    pixelArt: true,
    scene: [GameScene],
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    render: {
      antialias: false,
    },
  };
}
```

**Step 4: Update widget to embed Phaser canvas**

Modify `resources/game-world/widget.tsx` — replace the green placeholder div with a Phaser canvas mount point. Add a `useEffect` that creates/destroys the Phaser game instance when props change.

The key addition:
```tsx
import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { createGameConfig } from "./phaser/config";
import { GameScene } from "./phaser/GameScene";

// Inside the component:
const gameRef = useRef<Phaser.Game | null>(null);
const containerRef = useRef<HTMLDivElement>(null);

useEffect(() => {
  if (!containerRef.current) return;
  if (gameRef.current) gameRef.current.destroy(true);

  const config = createGameConfig(containerRef.current);
  const game = new Phaser.Game(config);
  game.scene.start("GameScene", {
    locationName: location?.name ?? "",
    observation,
    objects,
    validActions,
  });
  gameRef.current = game;

  return () => { game.destroy(true); };
}, [observation, location?.name]);
```

Replace the placeholder `<div className="bg-[#306230]...">` with:
```tsx
<div ref={containerRef} className="mx-4 mt-4 rounded-lg overflow-hidden border-2 border-[#0f380f]" style={{ height: 320 }} />
```

**Step 5: Test Phaser renders in widget**

Run: `npm run dev -- --tunnel`
Expected: Widget now shows colored tile grid with player square and object squares

**Step 6: Commit**

```bash
git add resources/game-world/phaser/ public/tiles/
git commit -m "add phaser 3 canvas with procedural tile rendering"
```

---

## Task 7: Sprite Tileset Integration

**Files:**
- Create: `public/tiles/tileset.png` (from Monster Tamer assets or free pixel art)
- Create: `public/sprites/player.png`
- Create: `public/sprites/objects.png`
- Modify: `resources/game-world/phaser/GameScene.ts`

**Step 1: Source free pixel art tilesets**

Download a GameBoy-style tileset (16x16 tiles). Good free sources:
- [itch.io GameBoy tilesets](https://itch.io/game-assets/tag-gameboy)
- Monster Tamer assets (MIT license)

Place in `public/tiles/` and `public/sprites/`.

**Step 2: Update GameScene to use sprite tilesets instead of colored rectangles**

Replace `this.add.rectangle()` calls with `this.add.image()` using loaded tileset sprites. Add `preload()` method to load assets.

**Step 3: Add player character sprite with idle animation**

Load a sprite sheet for the player character, create an idle animation.

**Step 4: Test visual improvement**

Run dev server, verify sprites render correctly in the widget.

**Step 5: Commit**

```bash
git add public/tiles/ public/sprites/ resources/game-world/phaser/
git commit -m "add pixel art tilesets and player sprite"
```

---

## Task 8: Polish and Game Feel

**Files:**
- Modify: `resources/game-world/widget.tsx`
- Modify: `resources/game-world/phaser/GameScene.ts`
- Modify: `index.ts`

**Step 1: Add room transition animation**

When the location changes between tool calls, animate the screen fading to black and back in.

**Step 2: Add score popup**

When `reward > 0`, show a floating "+N" score popup in the Phaser scene.

**Step 3: Add inventory overlay**

Show inventory icons at the bottom of the Phaser canvas, updating when items change.

**Step 4: Add fullscreen/PiP support to widget**

Use `requestDisplayMode("fullscreen")` button for a larger game view.

**Step 5: Commit**

```bash
git add -u
git commit -m "add transitions, score popups, inventory overlay, fullscreen"
```

---

## Summary of Tasks

| # | Task | Key Output |
|---|---|---|
| 1 | Scaffold MCP Server | `package.json`, `index.ts` — runnable mcp-use server |
| 2 | Jericho Python Bridge | `bridge/server.py`, `src/jericho-bridge.ts` — Zork running via HTTP |
| 3 | Wire MCP Tools | `index.ts` — 5 tools backed by Jericho |
| 4 | Game World Widget | `resources/game-world/widget.tsx` — GameBoy-style text display |
| 5 | End-to-End Test | Full stack running in Claude |
| 6 | Phaser Canvas | Procedural tile rendering from Jericho object tree |
| 7 | Sprite Tilesets | Real pixel art replacing colored rectangles |
| 8 | Polish | Animations, overlays, fullscreen |
