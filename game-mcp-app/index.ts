import { MCPServer, text } from "mcp-use/server";
import { z } from "zod";
import { RULE_GAME_STATE } from "./rules/game-state.js";
import { rememberGame, getGame, gameWidget, gameError } from "./utils.js";
import type { GameState } from "./types.js";

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;

const server = new MCPServer({
  name: "game-mcp",
  title: "AI Game Engine",
  version: "3.0.0",
  description: "Play any game against Claude — Pokemon battles, chess, dungeon crawlers, and anything you can imagine.",
  host: process.env.HOST ?? "0.0.0.0",
  baseUrl: process.env.MCP_URL ?? `http://localhost:${port}`,
});

// ── Rules ─────────────────────────────────────────────────────────────────────

server.tool(
  {
    name: "read_me",
    description: "IMPORTANT: Call this FIRST before starting any game. Returns game state format guide.",
  },
  async () => text(RULE_GAME_STATE)
);

// ── start_game ────────────────────────────────────────────────────────────────

server.tool(
  {
    name: "start_game",
    description:
      "Start a new game session. Call read_me first for the game state format. " +
      "Supported gameType values: 'pokemon', 'chess', 'dungeon', 'generic'. " +
      "The widget renders immediately — no code to write, just supply game state JSON.",
    schema: z.object({
      gameType: z
        .enum(["pokemon", "chess", "dungeon", "generic"])
        .describe("Type of game to render"),
      title: z.string().optional().describe("Display title for the game"),
      initialState: z
        .string()
        .describe("JSON string of the initial game state. See read_me for the exact shape per game type."),
    }) as any,
    widget: {
      name: "game-player",
      invoking: "Setting up game…",
      invoked: "Game ready",
    },
  },
  async (
    { gameType, title, initialState }: { gameType: "pokemon" | "chess" | "dungeon" | "generic"; title?: string; initialState: string },
    ctx: any
  ) => {
    const sessionId: string = ctx.session?.sessionId ?? "default";

    let parsedState: Record<string, unknown>;
    try {
      parsedState = JSON.parse(initialState);
      if (!parsedState || typeof parsedState !== "object" || Array.isArray(parsedState)) {
        return gameError("initialState must be a JSON object.");
      }
    } catch {
      return gameError("initialState must be valid JSON.");
    }

    const gameState: GameState = {
      gameType: gameType as any,
      title: title ?? gameType,
      state: parsedState as any,
    };

    rememberGame(sessionId, gameState);

    return gameWidget(gameState, `${gameState.title} started. Good luck!`);
  }
);

// ── update_game_state ─────────────────────────────────────────────────────────

server.tool(
  {
    name: "update_game_state",
    description:
      "Update the game state after every turn. " +
      "Pass the complete updated state JSON — not just the changed fields. " +
      "The widget re-renders instantly with animations. " +
      "Call this for BOTH the player's move result AND the CPU counter-move.",
    schema: z.object({
      state: z
        .string()
        .describe("JSON string of the FULL updated game state (same shape as initialState)"),
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

    let parsedState: Record<string, unknown>;
    try {
      parsedState = JSON.parse(state);
      if (!parsedState || typeof parsedState !== "object" || Array.isArray(parsedState)) {
        return gameError("state must be a JSON object.");
      }
    } catch {
      return gameError("state must be valid JSON.");
    }

    const updated: GameState = {
      ...previous,
      state: parsedState as any,
    };

    rememberGame(sessionId, updated);
    return gameWidget(updated);
  }
);

// ── list_games ────────────────────────────────────────────────────────────────

server.tool(
  {
    name: "list_games",
    description: "List available game types and their descriptions.",
  },
  async () =>
    text(`Available game types:

pokemon  — Turn-based Pokemon-style battle. Two fighters, HP bars, type effectiveness, moves.
chess    — Full chess game with an 8×8 animated board. You play white, Claude plays black.
dungeon  — Dungeon crawler RPG. Explore rooms, fight enemies, collect loot, level up.
generic  — Any other game. Supports emoji scene, key/value fields, actions list, and dialog.

Start any game by saying e.g.:
  "Let's play a Pokemon battle — I pick Pikachu vs Gengar"
  "Play chess with me"
  "Start a dungeon crawl"
  "Let's play tic-tac-toe" (uses generic type)`)
);

// ── Server ────────────────────────────────────────────────────────────────────

server.get("/.well-known/openai-apps-challenge", (c: any) => {
  return c.text("gP0NHv0ywqzsT3-iJ5is_xR6HysaW9Gbls7TeneGl8M");
});

await server.listen(port);
