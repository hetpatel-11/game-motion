// ── Session game state (server-side) ─────────────────────────────────────────

export type SessionGame = {
  /** Compiled CJS bundle string from esbuild */
  bundle: string;
  /** Current game state props passed to renderGame() */
  inputProps: Record<string, unknown>;
  /** Display title */
  title: string;
};
