import esbuild from "esbuild";
import { text, widget } from "mcp-use/server";
import type { SessionGame } from "./types.js";

// ── Session store ─────────────────────────────────────────────────────────────

const sessionGames = new Map<string, SessionGame>();
const MAX_SESSIONS = 100;

export function rememberGame(sessionId: string, game: SessionGame): void {
  if (!sessionId) return;
  if (sessionGames.has(sessionId)) sessionGames.delete(sessionId);
  sessionGames.set(sessionId, game);
  while (sessionGames.size > MAX_SESSIONS) {
    const oldest = sessionGames.keys().next().value;
    if (typeof oldest === "string") sessionGames.delete(oldest);
  }
}

export function getGame(sessionId: string): SessionGame | null {
  return sessionGames.get(sessionId) ?? null;
}

// ── esbuild virtual files plugin ──────────────────────────────────────────────

function virtualFilesPlugin(files: Record<string, string>): esbuild.Plugin {
  return {
    name: "virtual-files",
    setup(build) {
      // Resolve: intercept imports from virtual namespace OR from real entry
      build.onResolve({ filter: /.*/ }, (args) => {
        // Don't handle external packages
        if (args.path === "pixi.js" || args.path === "gsap" || args.path === "react" || args.path === "react-dom") {
          return undefined;
        }

        // Resolve relative path from importer
        let resolved = args.path;
        if ((resolved.startsWith("./") || resolved.startsWith("../")) && args.importer) {
          const importerDir = args.importer.replace(/\/[^/]+$/, "");
          resolved = importerDir ? `${importerDir}/${resolved}` : resolved;
          // Normalize: remove ./ and ../
          resolved = resolved.replace(/\/\.\//g, "/").replace(/[^/]+\/\.\.\//g, "");
        }
        // Strip leading ./
        resolved = resolved.replace(/^\.\//, "");

        // Try with extensions
        const candidates = [
          resolved,
          `${resolved}.tsx`,
          `${resolved}.ts`,
          `${resolved}.jsx`,
          `${resolved}.js`,
        ];
        for (const c of candidates) {
          if (files[c]) return { path: c, namespace: "virtual" };
        }
        return undefined;
      });

      build.onLoad({ filter: /.*/, namespace: "virtual" }, (args) => {
        const content = files[args.path];
        if (content === undefined) return undefined;
        const ext = args.path.split(".").pop() ?? "tsx";
        const loaderMap: Record<string, esbuild.Loader> = {
          tsx: "tsx", ts: "ts", jsx: "jsx", js: "js",
        };
        return { contents: content, loader: loaderMap[ext] ?? "tsx" };
      });
    },
  };
}

// ── Compile game bundle ───────────────────────────────────────────────────────

/**
 * Compile user-provided TypeScript/TSX files into a CJS bundle.
 * pixi.js and gsap are kept as externals — the widget provides them via
 * a custom require() function at runtime.
 *
 * The entry point MUST be named "main.tsx" (or "main.ts").
 * The entry must export: renderGame(container, props, prevProps?) and optionally cleanup(container).
 */
export async function compileGameBundle(
  files: Record<string, string>
): Promise<{ bundle: string; error?: undefined } | { bundle?: undefined; error: string }> {
  const entryPoint = files["main.tsx"] ? "main.tsx" : files["main.ts"] ? "main.ts" : null;
  if (!entryPoint) {
    return { error: "No entry point found. Files must include 'main.tsx' or 'main.ts'." };
  }

  try {
    const result = await esbuild.build({
      entryPoints: [entryPoint],
      bundle: true,
      format: "cjs",
      platform: "browser",
      // Keep pixi.js and gsap as externals — provided by widget's custom require
      external: ["pixi.js", "gsap"],
      jsx: "automatic",
      plugins: [virtualFilesPlugin(files)],
      write: false,
      logLevel: "silent",
      // Minify for smaller bundle size but keep readable enough for debugging
      minifySyntax: true,
    });

    const bundle = result.outputFiles[0]?.text;
    if (!bundle) return { error: "esbuild produced no output." };

    // Check for errors in warnings
    if (result.errors.length > 0) {
      return { error: result.errors.map((e) => e.text).join("\n") };
    }

    return { bundle };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { error: `Compile error: ${msg}` };
  }
}

// ── Widget responses ──────────────────────────────────────────────────────────

// The MCP server URL — passed to the widget so game code can reach the sprite proxy
// regardless of what origin the widget iframe is running on.
const SERVER_URL = (process.env.MCP_URL ?? `http://localhost:${process.env.PORT ?? 3000}`)
  .replace(/\/mcp$/, "");

export function gameWidget(
  game: SessionGame,
  message?: string
) {
  return widget({
    props: {
      bundle: game.bundle,
      inputProps: JSON.stringify(game.inputProps),
      serverUrl: SERVER_URL,
    },
    output: text(message ?? `${game.title} — running.`),
  });
}

export function gameError(message: string) {
  return text(`Error: ${message}`);
}
