import { MCPServer, text } from "mcp-use/server";
import { z } from "zod";
import { RULE_GAME_ENGINE } from "./rules/game-engine.js";
import { compileGameBundle, rememberGame, getGame, gameWidget, gameError } from "./utils.js";
import type { SessionGame } from "./types.js";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = new MCPServer({
  name: "game-mcp",
  title: "AI Game Engine",
  version: "4.0.0",
  description:
    "IMPORTANT: When a user asks to play ANY game, you MUST: " +
    "1) Call read_me to get full instructions. " +
    "2) Call start_game with complete Pixi.js TypeScript code in the 'files' parameter. " +
    "3) Call update_game_state after each player turn. " +
    "NEVER describe a game in text — always call start_game to render it visually. " +
    "You write all game logic as Pixi.js v8 + GSAP TypeScript. The widget renders it live in the chat window.",
  host: process.env.HOST ?? "0.0.0.0",
  baseUrl: process.env.MCP_URL ?? `http://localhost:${port}`,
});

// ── read_me ───────────────────────────────────────────────────────────────────

server.tool(
  {
    name: "read_me",
    description:
      "CALL THIS FIRST — before writing any game code. Returns the complete Pixi.js v8 game engine guide: " +
      "API reference, real sprite CDN URLs (Pokemon/Chess/Cards), GSAP animation patterns, " +
      "game specs for 10+ games, and the renderGame() contract. Required before calling start_game.",
  },
  async () => text(RULE_GAME_ENGINE)
);

// ── start_game ────────────────────────────────────────────────────────────────

server.tool(
  {
    name: "start_game",
    description:
      "CALL THIS to launch any game visually. You write the FULL game as Pixi.js v8 TypeScript and pass it in 'files'. " +
      "Supported: Pokemon, chess, blackjack, snake, 2048, wordle, battleship, minesweeper, connect four, " +
      "tic-tac-toe, dungeon crawler, space invaders, poker, RPG, trivia, or ANY game the user wants. " +
      "files MUST include 'main.tsx' exporting renderGame(container, props, prevProps?) and cleanup(container). " +
      "Use real sprites: PokeAPI for Pokemon, Lichess SVGs for chess, deckofcardsapi for cards. " +
      "After compile succeeds the widget renders live — then use update_game_state for each turn.",
    schema: z.object({
      title: z.string().describe("Display title for the game, e.g. 'Pokemon FireRed Battle'"),
      files: z
        .record(z.string(), z.string())
        .describe(
          "Object mapping filename to file content. MUST include 'main.tsx' as entry point. " +
          "Example: { 'main.tsx': '...', 'types.ts': '...' }"
        ),
      initialState: z
        .string()
        .describe(
          "JSON string of the initial game state — must match the props interface in your main.tsx. " +
          "This is passed as inputProps to renderGame() on first render."
        ),
    }) as any,
    widget: {
      name: "game-player",
      invoking: "Compiling game…",
      invoked: "Game ready",
    },
  },
  async (
    { title, files, initialState }: { title: string; files: Record<string, string>; initialState: string },
    ctx: any
  ) => {
    const sessionId: string = ctx.session?.sessionId ?? "default";

    // Parse initial state
    let inputProps: Record<string, unknown>;
    try {
      inputProps = JSON.parse(initialState);
      if (!inputProps || typeof inputProps !== "object" || Array.isArray(inputProps)) {
        return gameError("initialState must be a JSON object.");
      }
    } catch {
      return gameError("initialState must be valid JSON.");
    }

    // Validate files
    if (!files || typeof files !== "object") {
      return gameError("files must be a record of filename → content.");
    }
    if (!files["main.tsx"] && !files["main.ts"]) {
      return gameError("files must include 'main.tsx' or 'main.ts' as the entry point.");
    }

    // Compile
    console.log(`[start_game] Compiling "${title}" — files: ${Object.keys(files).join(', ')}`);
    const compiled = await compileGameBundle(files);
    if (compiled.error) {
      console.error(`[start_game] Compilation FAILED for "${title}":\n${compiled.error}`);
      return gameError(`Compilation failed:\n${compiled.error}`);
    }
    console.log(`[start_game] Compiled OK — bundle ${Math.round((compiled.bundle as string).length / 1024)}KB`);

    const game: SessionGame = {
      bundle: compiled.bundle as string,
      inputProps,
      title,
    };

    rememberGame(sessionId, game);

    return gameWidget(game, `${title} started! Good luck.`);
  }
);

// ── update_game_state ─────────────────────────────────────────────────────────

server.tool(
  {
    name: "update_game_state",
    description:
      "Update the game state after each turn. The existing compiled bundle is reused — only inputProps change. " +
      "Call this for BOTH the player's move result AND the CPU counter-move (two separate calls per turn). " +
      "Pass the COMPLETE updated state JSON, not just changed fields.",
    schema: z.object({
      state: z
        .string()
        .describe(
          "JSON string of the complete updated game state. Must match the props interface in main.tsx."
        ),
    }) as any,
    widget: {
      name: "game-player",
      invoking: "Updating…",
      invoked: "Done",
    },
  },
  async ({ state }: { state: string }, ctx: any) => {
    const sessionId: string = ctx.session?.sessionId ?? "default";

    const previous = getGame(sessionId);
    if (!previous) {
      return gameError("No active game. Call start_game first.");
    }

    let inputProps: Record<string, unknown>;
    try {
      inputProps = JSON.parse(state);
      if (!inputProps || typeof inputProps !== "object" || Array.isArray(inputProps)) {
        return gameError("state must be a JSON object.");
      }
    } catch {
      return gameError("state must be valid JSON.");
    }

    const updated: SessionGame = {
      ...previous,
      inputProps,
    };

    rememberGame(sessionId, updated);
    return gameWidget(updated);
  }
);

// ── list_games ────────────────────────────────────────────────────────────────

server.tool(
  {
    name: "list_games",
    description: "List game ideas and examples to help the user pick a game.",
  },
  async () =>
    text(`AI Game Engine — powered by Pixi.js + GSAP

Claude writes your game UI from scratch — pixel-perfect, animated, real.

FEATURED GAMES:
  🎮 Pokemon FireRed battle  — Exact GBA-style HP bars, animated sprites, type effectiveness
  ♟  Chess                   — Lichess-style board, animated moves, check/checkmate detection
  ⚔️  Dungeon crawler         — Turn-based RPG, rooms, enemies, loot, leveling
  🃏  Blackjack               — Casino-style card game, bet, hit, stand, bust
  ❌  Tic-tac-toe             — Classic, win detection, CPU strategy
  🚀  Space invaders          — Scrolling enemies, shoot, score
  🌊  Battleship              — Grid hit/miss, fleet placement
  🐍  Snake                  — Classic snake on a grid

ANY game you can describe — Claude builds the UI live.

Try: "Let's play Pokemon — I pick Bulbasaur vs Charmander"`)
);

// ── Sprite proxy routes (same-origin, bypasses widget CSP/CORS) ───────────────

// Allowed CDN origins — only these are proxied
const ALLOWED_ORIGINS = [
  "https://raw.githubusercontent.com",
  "https://lichess1.org",
  "https://deckofcardsapi.com",
  "https://fonts.googleapis.com",
  "https://fonts.gstatic.com",
];

function isAllowed(url: string): boolean {
  try {
    const origin = new URL(url).origin + "/";
    return ALLOWED_ORIGINS.some((a) => url.startsWith(a));
  } catch { return false; }
}

// Generic sprite proxy: /sprites/proxy?url=<encoded-url>
server.get("/sprites/proxy", async (c: any) => {
  const url = c.req.query("url");
  if (!url || !isAllowed(url)) {
    return c.text("Forbidden", 403);
  }
  try {
    const resp = await fetch(url, { headers: { "User-Agent": "game-mcp-sprite-proxy/1.0" } });
    if (!resp.ok) return c.text("Not found", 404);
    const contentType = resp.headers.get("content-type") ?? "application/octet-stream";
    const buf = await resp.arrayBuffer();
    return c.body(buf as any, 200, {
      "Content-Type": contentType,
      "Cache-Control": "public, max-age=86400",
      "Access-Control-Allow-Origin": "*",
    });
  } catch (e) {
    return c.text("Proxy error", 502);
  }
});

// Convenience: /sprites/pokemon/front/:id  →  PokeAPI front sprite
server.get("/sprites/pokemon/front/:id", async (c: any) => {
  const id = c.req.param("id");
  const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
  const resp = await fetch(url);
  if (!resp.ok) return c.text("Not found", 404);
  const buf = await resp.arrayBuffer();
  return c.body(buf as any, 200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*" });
});

// Convenience: /sprites/pokemon/back/:id
server.get("/sprites/pokemon/back/:id", async (c: any) => {
  const id = c.req.param("id");
  const url = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/back/${id}.png`;
  const resp = await fetch(url);
  if (!resp.ok) return c.text("Not found", 404);
  const buf = await resp.arrayBuffer();
  return c.body(buf as any, 200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*" });
});

// Convenience: /sprites/chess/:piece  →  Lichess cburnett SVG
server.get("/sprites/chess/:piece", async (c: any) => {
  const piece = c.req.param("piece"); // e.g. "wK" "bQ"
  const url = `https://lichess1.org/assets/piece/cburnett/${piece}.svg`;
  const resp = await fetch(url);
  if (!resp.ok) return c.text("Not found", 404);
  const buf = await resp.arrayBuffer();
  return c.body(buf as any, 200, { "Content-Type": "image/svg+xml", "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*" });
});

// Convenience: /sprites/cards/:card  →  deckofcardsapi PNG
server.get("/sprites/cards/:card", async (c: any) => {
  const card = c.req.param("card"); // e.g. "AS" "KH" "back"
  const url = `https://deckofcardsapi.com/static/img/${card}.png`;
  const resp = await fetch(url);
  if (!resp.ok) return c.text("Not found", 404);
  const buf = await resp.arrayBuffer();
  return c.body(buf as any, 200, { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400", "Access-Control-Allow-Origin": "*" });
});

// ── Server ────────────────────────────────────────────────────────────────────

server.get("/.well-known/openai-apps-challenge", (c: any) => {
  return c.text("gP0NHv0ywqzsT3-iJ5is_xR6HysaW9Gbls7TeneGl8M");
});

await server.listen(port);
