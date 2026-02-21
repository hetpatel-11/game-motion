import React, { Component, type ReactNode, useMemo } from "react";
import { z } from "zod";
import { useWidget, McpUseProvider, type WidgetMetadata } from "mcp-use/react";
import { motion } from "framer-motion";
import type { GameState } from "../../types";

import PokemonBattle from "./components/PokemonBattle";
import Chess from "./components/Chess";
import DungeonCrawler from "./components/DungeonCrawler";
import GenericGame from "./components/GenericGame";

// ── Widget schema ─────────────────────────────────────────────────────────────

const propSchema = z.object({
  gameState: z.string().optional().describe("JSON-encoded GameState object"),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Interactive AI game player — Pokemon battles, chess, dungeon crawlers, and more",
  props: propSchema as any,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    autoResize: true,
    widgetDescription: "Play any game against Claude directly in chat",
    csp: {
      scriptDirectives: [],
    },
  },
};

// ── Error boundary ────────────────────────────────────────────────────────────

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "#f87171", fontFamily: "monospace", fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Widget error</div>
          <div style={{ whiteSpace: "pre-wrap", opacity: 0.8 }}>{this.state.error}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Loading screen ────────────────────────────────────────────────────────────

const LOADING_PHRASES = [
  "Rolling initiative…",
  "Shuffling the deck…",
  "Loading dungeon map…",
  "Calculating damage…",
  "Claude is thinking…",
  "Spawning enemies…",
  "Setting the stage…",
];

function LoadingScreen({ dark }: { dark: boolean }) {
  const [idx, setIdx] = React.useState(0);
  React.useEffect(() => {
    const t = setInterval(() => setIdx((n) => (n + 1) % LOADING_PHRASES.length), 1800);
    return () => clearInterval(t);
  }, []);

  return (
    <div style={{
      minHeight: 220,
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 16,
      background: dark ? "#0f172a" : "#f8fafc",
      borderRadius: 10,
    }}>
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
        style={{ fontSize: 36 }}
      >
        🎮
      </motion.div>
      <motion.div
        key={idx}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        style={{ fontSize: 13, color: dark ? "#64748b" : "#94a3b8", fontFamily: "monospace" }}
      >
        {LOADING_PHRASES[idx]}
      </motion.div>
    </div>
  );
}

// ── Idle screen (no game yet) ────────────────────────────────────────────────

function IdleScreen({ dark }: { dark: boolean }) {
  const games = ["⚔️ Pokemon battle", "♟ Chess", "🗡 Dungeon crawler", "🎲 Any game you can imagine"];
  return (
    <div style={{
      minHeight: 220, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      background: dark ? "#0f172a" : "#f8fafc", borderRadius: 10, padding: 24,
    }}>
      <div style={{ fontSize: 40 }}>🎮</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: dark ? "#e2e8f0" : "#1e293b" }}>
        Ready to play
      </div>
      <div style={{ fontSize: 12, color: dark ? "#64748b" : "#94a3b8", textAlign: "center", maxWidth: 260 }}>
        Ask Claude to start any game. For example:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", maxWidth: 260 }}>
        {games.map((g, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08 }}
            style={{ fontSize: 12, color: dark ? "#7c3aed" : "#6d28d9",
              background: dark ? "#1e1035" : "#ede9fe",
              borderRadius: 6, padding: "5px 10px", fontFamily: "monospace" }}
          >
            "{g}"
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ── Game router ───────────────────────────────────────────────────────────────

function GameRouter({ gameState }: { gameState: GameState }) {
  const { gameType, state, title } = gameState;

  switch (gameType) {
    case "pokemon":
      return <PokemonBattle state={state as any} title={title} />;
    case "chess":
      return <Chess state={state as any} title={title} />;
    case "dungeon":
      return <DungeonCrawler state={state as any} title={title} />;
    default:
      return <GenericGame state={state as any} title={title} />;
  }
}

// ── Inner widget ──────────────────────────────────────────────────────────────

function GamePlayerInner() {
  const { isPending, isStreaming, theme } = useWidget<z.infer<typeof propSchema>>();
  const { output } = useWidget<z.infer<typeof propSchema>>() as any;

  const dark = theme === "dark";
  const isBusy = isPending || isStreaming;

  const gameState = useMemo<GameState | null>(() => {
    const raw = (output as Record<string, unknown> | null)?.gameState;
    if (typeof raw !== "string") return null;
    try {
      return JSON.parse(raw) as GameState;
    } catch {
      return null;
    }
  }, [output]);

  if (!gameState && isBusy) return <LoadingScreen dark={dark} />;
  if (!gameState) return <IdleScreen dark={dark} />;

  return (
    <motion.div
      key={JSON.stringify({ type: gameState.gameType, title: gameState.title })}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.2 }}
    >
      <GameRouter gameState={gameState} />
    </motion.div>
  );
}

// ── Export ────────────────────────────────────────────────────────────────────

export default function GamePlayerWidget() {
  return (
    <McpUseProvider autoSize>
      <ErrorBoundary>
        <GamePlayerInner />
      </ErrorBoundary>
    </McpUseProvider>
  );
}
