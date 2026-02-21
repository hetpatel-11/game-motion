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
    "Claude generates pixel-perfect game UIs with Pixi.js — Pokemon FireRed, chess, dungeon crawlers, any game. " +
    "Write game code once, update state per turn with no recompile.",
  host: process.env.HOST ?? "0.0.0.0",
  baseUrl: process.env.MCP_URL ?? `http://localhost:${port}`,
});

// ── read_me ───────────────────────────────────────────────────────────────────

server.tool(
  {
    name: "read_me",
    description:
      "CALL THIS FIRST before any game. Returns the complete guide for writing Pixi.js game compositions, " +
      "exact Pokemon FireRed specs, chess board specs, animation patterns, and the inputProps contract.",
  },
  async () => text(RULE_GAME_ENGINE)
);

// ── start_game ────────────────────────────────────────────────────────────────

server.tool(
  {
    name: "start_game",
    description:
      "Compile and launch ANY game the user requests — Pokemon, chess, blackjack, snake, 2048, wordle, " +
      "battleship, minesweeper, connect four, tic-tac-toe, dungeon crawler, or ANYTHING else. " +
      "You write the complete Pixi.js game UI as TypeScript — pixel-perfect, animated, real. " +
      "For Pokemon: use real sprites from PokeAPI via PIXI.Assets.load(). " +
      "REQUIRED: files must include 'main.tsx' exporting renderGame() and optionally cleanup(). " +
      "After this call, use update_game_state to advance the game — no recompile needed.",
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
    const compiled = await compileGameBundle(files);
    if (compiled.error) {
      return gameError(`Compilation failed:\n${compiled.error}`);
    }

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

// ── Server ────────────────────────────────────────────────────────────────────

server.get("/.well-known/openai-apps-challenge", (c: any) => {
  return c.text("gP0NHv0ywqzsT3-iJ5is_xR6HysaW9Gbls7TeneGl8M");
});

await server.listen(port);
