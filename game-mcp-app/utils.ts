import { text, widget } from "mcp-use/server";
import type { GameState } from "./types.js";

// ── Session store ────────────────────────────────────────────────────────────

const sessionGames = new Map<string, GameState>();
const MAX_SESSIONS = 250;

export function rememberGame(sessionId: string, gameState: GameState): void {
  if (!sessionId) return;
  if (sessionGames.has(sessionId)) sessionGames.delete(sessionId);
  sessionGames.set(sessionId, gameState);

  while (sessionGames.size > MAX_SESSIONS) {
    const oldest = sessionGames.keys().next().value;
    if (typeof oldest === "string") sessionGames.delete(oldest);
  }
}

export function getGame(sessionId: string): GameState | null {
  return sessionGames.get(sessionId) ?? null;
}

// ── Widget responses ─────────────────────────────────────────────────────────

export function gameWidget(gameState: GameState, message?: string) {
  return widget({
    props: { gameState: JSON.stringify(gameState) },
    output: text(message ?? `${gameState.title ?? gameState.gameType} — game running.`),
  });
}

export function gameError(message: string) {
  return widget({
    props: {
      gameState: JSON.stringify({
        gameType: "generic",
        title: "Error",
        state: { message, phase: "error" },
      }),
    },
    output: text(`Game error: ${message}`),
  });
}
