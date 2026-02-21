import React, { Component, type ReactNode, useEffect, useRef, useState, useMemo } from "react";
import { z } from "zod";
import { useWidget, McpUseProvider, type WidgetMetadata } from "mcp-use/react";
import * as PIXI from "pixi.js";
import gsap from "gsap";

// ── Widget schema ─────────────────────────────────────────────────────────────

const propSchema = z.object({
  bundle: z.string().optional().describe("Compiled CJS game bundle string"),
  inputProps: z.string().optional().describe("JSON-encoded game state passed to renderGame()"),
  serverUrl: z.string().optional().describe("MCP server base URL for sprite proxy"),
});

export const widgetMetadata: WidgetMetadata = {
  description: "Dynamic AI game player — Claude generates pixel-perfect Pixi.js game UIs",
  props: propSchema as any,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    autoResize: true,
    widgetDescription: "Play any game against Claude — real pixel-perfect UIs with Pixi.js animations",
    csp: {
      // Required to execute compiled game bundles with new Function()
      scriptDirectives: ["'unsafe-eval'"],
      // Required for PIXI.Assets.load() — Pokemon sprites, backgrounds, etc.
      imgDirectives: ["https://raw.githubusercontent.com", "https://assets.pokemon.com", "data:"],
      connectDirectives: ["https://raw.githubusercontent.com", "https://pokeapi.co"],
    },
  },
};

// ── Global game packages (exposed to compiled bundles) ────────────────────────

// Set up the package registry so compiled bundles can require pixi.js and gsap
if (typeof window !== "undefined") {
  (window as any).__GAME_PACKAGES = {
    "pixi.js": PIXI,
    gsap,
  };
}

// ── Error boundary ────────────────────────────────────────────────────────────

class ErrorBoundary extends Component<{ children: ReactNode }, { error: string | null }> {
  state = { error: null as string | null };
  static getDerivedStateFromError(e: Error) { return { error: e.message }; }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "#f87171", fontFamily: "monospace", fontSize: 12, background: "#0f172a", borderRadius: 10 }}>
          <div style={{ fontWeight: 600, marginBottom: 6 }}>Game render error</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{this.state.error}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Loading screen ────────────────────────────────────────────────────────────

function LoadingScreen() {
  const [dots, setDots] = useState(".");
  useEffect(() => {
    const t = setInterval(() => setDots((d) => (d.length >= 3 ? "." : d + ".")), 500);
    return () => clearInterval(t);
  }, []);
  return (
    <div style={{
      minHeight: 260, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 14,
      background: "#0d1117", borderRadius: 10,
    }}>
      <div style={{ fontSize: 40 }}>🎮</div>
      <div style={{ fontSize: 13, color: "#64748b", fontFamily: "monospace" }}>
        Compiling game{dots}
      </div>
    </div>
  );
}

// ── Idle screen ───────────────────────────────────────────────────────────────

function IdleScreen() {
  const examples = [
    '"Let\'s play Pokemon — I pick Bulbasaur"',
    '"Play chess with me"',
    '"Start a dungeon crawl"',
    '"Let\'s play blackjack"',
  ];
  return (
    <div style={{
      minHeight: 260, display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center", gap: 12,
      background: "#0d1117", borderRadius: 10, padding: 24,
    }}>
      <div style={{ fontSize: 40 }}>🎮</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e2e8f0" }}>AI Game Engine</div>
      <div style={{ fontSize: 12, color: "#64748b", textAlign: "center", maxWidth: 280 }}>
        Claude writes a pixel-perfect game UI live in chat. Try:
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 5, width: "100%", maxWidth: 320 }}>
        {examples.map((e, i) => (
          <div key={i} style={{
            fontSize: 11, color: "#a78bfa",
            background: "#1e1035", borderRadius: 6,
            padding: "5px 10px", fontFamily: "monospace",
          }}>{e}</div>
        ))}
      </div>
    </div>
  );
}

// ── Error screen ──────────────────────────────────────────────────────────────

function ErrorScreen({ message }: { message: string }) {
  const [copied, setCopied] = React.useState(false);
  const prompt = `The game crashed with this error — please fix and call start_game again:\n\n${message}`;

  function copy() {
    navigator.clipboard?.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <div style={{ padding: 16, fontFamily: "monospace", fontSize: 12, background: "#0f172a", borderRadius: 10, border: "1px solid #f8717140" }}>
      <div style={{ fontWeight: 700, marginBottom: 8, color: "#f87171", fontSize: 13 }}>❌ Game render error</div>
      <pre style={{ whiteSpace: "pre-wrap", margin: "0 0 12px", color: "#fca5a5", fontSize: 11, background: "#1e0a0a", padding: 10, borderRadius: 6, overflow: "auto", maxHeight: 160 }}>{message}</pre>
      <div style={{ color: "#94a3b8", fontSize: 11, marginBottom: 8 }}>
        👇 Click to copy the fix prompt, then paste it into the chat:
      </div>
      <button
        onClick={copy}
        style={{
          padding: "7px 14px", borderRadius: 6, border: "none", cursor: "pointer",
          background: copied ? "#166534" : "#7c3aed", color: "#fff", fontSize: 12, fontWeight: 600,
          fontFamily: "monospace", transition: "background 0.2s",
        }}
      >
        {copied ? "✓ Copied!" : "📋 Copy fix prompt"}
      </button>
    </div>
  );
}

// ── Game renderer ─────────────────────────────────────────────────────────────

interface GameModule {
  renderGame: (container: HTMLElement, props: unknown, prevProps?: unknown) => void | Promise<void>;
  cleanup?: (container: HTMLElement) => void;
}

function GameRenderer({ bundle, inputProps, serverUrl }: { bundle: string; inputProps: unknown; serverUrl?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const moduleRef = useRef<GameModule | null>(null);
  const prevBundleRef = useRef<string | null>(null);
  const prevPropsRef = useRef<unknown>(undefined);
  const [error, setError] = useState<string | null>(null);

  // Execute bundle when it changes
  useEffect(() => {
    if (!bundle || bundle === prevBundleRef.current) return;

    // Cleanup previous game if there was one
    if (moduleRef.current?.cleanup && containerRef.current) {
      try { moduleRef.current.cleanup(containerRef.current); } catch {}
    }

    prevBundleRef.current = bundle;
    prevPropsRef.current = undefined;
    setError(null);

    // Inject packages — include the real MCP server URL so the game code
    // can build correct sprite proxy URLs regardless of the widget's iframe origin.
    (window as any).__GAME_PACKAGES = { "pixi.js": PIXI, gsap, BASE_URL: serverUrl ?? "" };

    // Execute CJS bundle with custom require
    try {
      const require = (id: string): unknown => (window as any).__GAME_PACKAGES?.[id] ?? {};
      const mod = { exports: {} as any };
      // eslint-disable-next-line no-new-func
      new Function("require", "module", "exports", bundle)(require, mod, mod.exports);
      const gameModule: GameModule = mod.exports;

      if (typeof gameModule.renderGame !== "function") {
        setError("Bundle does not export renderGame(). Make sure main.tsx exports renderGame.");
        return;
      }

      moduleRef.current = gameModule;
    } catch (err) {
      setError(`Bundle execution error: ${err instanceof Error ? err.message : String(err)}`);
    }
  }, [bundle]);

  // Call renderGame when module or inputProps change
  useEffect(() => {
    const mod = moduleRef.current;
    if (!mod || !containerRef.current || inputProps === undefined) return;

    const prevProps = prevPropsRef.current;
    prevPropsRef.current = inputProps;

    try {
      const result = mod.renderGame(containerRef.current, inputProps, prevProps);
      if (result instanceof Promise) {
        result.catch((err) => setError(`Render error: ${err instanceof Error ? err.message : String(err)}`));
      }
    } catch (err) {
      setError(`Render error: ${err instanceof Error ? err.message : String(err)}`);
    }
  // Re-run when module loads or inputProps change (use JSON to detect value changes)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleRef.current, JSON.stringify(inputProps)]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (moduleRef.current?.cleanup && containerRef.current) {
        try { moduleRef.current.cleanup(containerRef.current); } catch {}
      }
    };
  }, []);

  if (error) return <ErrorScreen message={error} />;

  return (
    <div
      ref={containerRef}
      style={{
        display: "block",
        lineHeight: 0,
        borderRadius: 8,
        overflow: "hidden",
      }}
    />
  );
}

// ── Inner widget ──────────────────────────────────────────────────────────────

function GamePlayerInner() {
  const { isPending, isStreaming } = useWidget<z.infer<typeof propSchema>>();
  const { output } = useWidget<z.infer<typeof propSchema>>() as any;

  const isBusy = isPending || isStreaming;

  // Extract bundle and inputProps from output (try multiple paths for mcp-use compatibility)
  const { bundle, inputPropsStr } = useMemo(() => {
    const candidates = [output, output?.props, output?.output];
    for (const c of candidates) {
      if (c && typeof c === "object" && typeof c.bundle === "string") {
        return { bundle: c.bundle as string, inputPropsStr: c.inputProps as string | undefined };
      }
    }
    return { bundle: undefined, inputPropsStr: undefined };
  }, [output]);

  const inputProps = useMemo(() => {
    if (!inputPropsStr) return undefined;
    try { return JSON.parse(inputPropsStr); } catch { return undefined; }
  }, [inputPropsStr]);

  // Extract serverUrl from output
  const serverUrl = useMemo(() => {
    const candidates = [output, output?.props, output?.output];
    for (const c of candidates) {
      if (c && typeof c === "object" && typeof c.serverUrl === "string") return c.serverUrl as string;
    }
    return undefined;
  }, [output]);

  if (!bundle && isBusy) return <LoadingScreen />;
  if (!bundle) return <IdleScreen />;

  return <GameRenderer bundle={bundle} inputProps={inputProps} serverUrl={serverUrl} />;
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
