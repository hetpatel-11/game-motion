import React, {
  useMemo,
  useRef,
  useState,
  useEffect,
  useCallback,
  Component,
  type ErrorInfo,
  type ReactNode,
} from "react";
import { z } from "zod";
import { useWidget, McpUseProvider, type WidgetMetadata } from "mcp-use/react";
import { Player, type PlayerRef } from "@remotion/player";
import { compileBundle } from "./components/CodeComposition";
import type { VideoMeta, VideoProjectData } from "../../types";

import { GrainGradient } from "@paper-design/shaders-react";

// ---------------------------------------------------------------------------
// Error boundaries
// ---------------------------------------------------------------------------

class WidgetErrorBoundary extends Component<
  { children: ReactNode },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[remotion-player] top-level error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 16, color: "#ff6b6b", fontFamily: "monospace", fontSize: 12 }}>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Widget Error</div>
          <div style={{ whiteSpace: "pre-wrap" }}>{this.state.error}</div>
        </div>
      );
    }
    return this.props.children;
  }
}

class PlayerErrorBoundary extends Component<
  { children: ReactNode; onError?: (msg: string) => void; dark: boolean },
  { error: string | null }
> {
  state = { error: null as string | null };

  static getDerivedStateFromError(error: Error) {
    return { error: error.message };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error.message);
    console.error("[remotion-player] player error:", error.message, info.componentStack);
  }

  render() {
    if (this.state.error) {
      const dark = this.props.dark;
      return (
        <div
          style={{
            padding: 16,
            background: dark ? "#1c1c1c" : "#f5f5f5",
            borderRadius: 8,
            fontFamily: "system-ui, sans-serif",
            color: dark ? "#ff6b6b" : "#dc3545",
            fontSize: 13,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Error</div>
          <div style={{ opacity: 0.8, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
            {this.state.error}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ---------------------------------------------------------------------------
// Widget metadata
// ---------------------------------------------------------------------------

const propSchema = z.object({
  videoProject: z
    .string()
    .optional()
    .describe("JSON with bundled project code, composition metadata, defaultProps and inputProps"),
});

// @ts-expect-error - Zod v4 deep type instantiation
export const widgetMetadata: WidgetMetadata = {
  description: "Remotion video player",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: true,
    autoResize: true,
    widgetDescription: "Renders a Remotion video",
    csp: {
      resourceDomains: ["https://images.unsplash.com", "https://picsum.photos"],
      scriptDirectives: ["'unsafe-eval'"],
    },
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function positiveNumberOrFallback(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) return value;
  return fallback;
}

function toPropsObject(value: unknown): Record<string, unknown> {
  return isRecord(value) ? value : {};
}

function parseVideoProject(input: Record<string, unknown> | null): VideoProjectData | null {
  if (!input) return null;
  const raw = input.videoProject;
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!isRecord(parsed)) return null;
    const meta = parsed.meta;
    const bundle = parsed.bundle;
    if (!isRecord(meta) || typeof bundle !== "string" || bundle.trim().length === 0) return null;
    return {
      meta: {
        title: typeof meta.title === "string" && meta.title.trim().length > 0 ? meta.title : "Untitled",
        compositionId: typeof meta.compositionId === "string" && meta.compositionId.trim().length > 0 ? meta.compositionId : "Main",
        width: positiveNumberOrFallback(meta.width, 1920),
        height: positiveNumberOrFallback(meta.height, 1080),
        fps: positiveNumberOrFallback(meta.fps, 30),
        durationInFrames: positiveNumberOrFallback(meta.durationInFrames, 150),
      },
      bundle,
      defaultProps: toPropsObject(parsed.defaultProps),
      inputProps: toPropsObject(parsed.inputProps),
      compileError:
        typeof parsed.compileError === "string" && parsed.compileError.trim().length > 0
          ? parsed.compileError
          : undefined,
    };
  } catch {
    return null;
  }
}

function mergeProps(
  defaultProps: Record<string, unknown>,
  inputProps: Record<string, unknown>
): Record<string, unknown> {
  return { ...defaultProps, ...inputProps };
}

function readMetadataOverrides(overrides: Record<string, unknown>, fallback: VideoMeta): VideoMeta {
  return {
    ...fallback,
    width: positiveNumberOrFallback(overrides.width, fallback.width),
    height: positiveNumberOrFallback(overrides.height, fallback.height),
    fps: positiveNumberOrFallback(overrides.fps, fallback.fps),
    durationInFrames: positiveNumberOrFallback(overrides.durationInFrames, fallback.durationInFrames),
  };
}

// ---------------------------------------------------------------------------
// Loading words
// ---------------------------------------------------------------------------

const LOADING_WORDS = [
  "Storyboarding scenes",
  "Keyframing motion",
  "Color grading",
  "Stitching sequences",
  "Rendering frames",
  "Taming the timeline",
  "Crafting transitions",
  "Bezier curving",
  "Pixel polishing",
  "Building cinematics",
  "Compositing layers",
  "Animating typography",
  "Sweetening cuts",
  "Dialing in spring physics",
  "Choreographing entrances",
  "Interpolating smoothly",
  "Easing into position",
  "Cooking the render",
];

function useLoadingWord(active: boolean) {
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    if (!active) {
      setVisible(true);
      return;
    }
    const rotateMs = 2500;
    const fadeMs = 220;
    let timeout: number | null = null;
    const interval = window.setInterval(() => {
      setVisible(false);
      timeout = window.setTimeout(() => {
        setIndex((prev) => (prev + 1) % LOADING_WORDS.length);
        setVisible(true);
      }, fadeMs);
    }, rotateMs);
    return () => {
      window.clearInterval(interval);
      if (timeout !== null) window.clearTimeout(timeout);
    };
  }, [active]);

  return { word: LOADING_WORDS[index] + "...", visible };
}

// ---------------------------------------------------------------------------
// Shader background (safe — renders fallback gradient on failure)
// ---------------------------------------------------------------------------

function ShaderBackground({ style }: { style?: React.CSSProperties }) {
  return (
    <GrainGradient
      width="100%"
      height="100%"
      colors={["#7300ff", "#eba8ff", "#00bfff", "#2b00ff", "#33cc99", "#3399cc", "#3333cc"]}
      colorBack="#00000000"
      softness={1}
      intensity={1}
      noise={0.0}
      shape="corners"
      speed={2}
      scale={1.8}
      style={style}
    />
  );
}

// ---------------------------------------------------------------------------
// Loading state
// ---------------------------------------------------------------------------

function LoadingView({
  word,
  visible,
  dark,
  fullscreen,
  onExitFullscreen,
}: {
  word: string;
  visible: boolean;
  dark: boolean;
  fullscreen: boolean;
  onExitFullscreen?: () => void;
}) {
  const height = fullscreen ? "100vh" : 280;
  return (
    <div
      style={{
        position: "relative",
        height,
        minHeight: 280,
        borderRadius: fullscreen ? 0 : 12,
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      {/* Deep dark base */}
      <div style={{ position: "absolute", inset: 0, background: "#080810" }} />
      {/* Shader on top */}
      <ShaderBackground style={{ position: "absolute", inset: 0, width: "100%", height: "100%", opacity: 0.6 }} />
      {/* Scanline overlay for cinematic texture */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.08) 2px, rgba(0,0,0,0.08) 4px)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {fullscreen && onExitFullscreen && (
        <div style={{ position: "absolute", top: 14, right: 14, zIndex: 10 }}>
          <button
            onClick={onExitFullscreen}
            style={{
              background: "rgba(255,255,255,0.07)",
              border: "1px solid rgba(255,255,255,0.12)",
              cursor: "pointer",
              padding: "6px 12px",
              color: "rgba(255,255,255,0.7)",
              borderRadius: 6,
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: 0.3,
              backdropFilter: "blur(8px)",
            }}
          >
            Exit fullscreen
          </button>
        </div>
      )}

      <div
        style={{
          position: "relative",
          zIndex: 2,
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 20,
          textAlign: "center",
          padding: 32,
        }}
      >
        {/* Film reel icon */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="rgba(255,255,255,0.35)"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ opacity: visible ? 0.9 : 0.3, transition: "opacity 300ms ease" }}
        >
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
          <line x1="12" y1="2" x2="12" y2="9" />
          <line x1="12" y1="15" x2="12" y2="22" />
          <line x1="2" y1="12" x2="9" y2="12" />
          <line x1="15" y1="12" x2="22" y2="12" />
        </svg>

        <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center" }}>
          <span
            style={{
              fontSize: 15,
              fontWeight: 500,
              letterSpacing: 0.5,
              color: "rgba(255,255,255,0.9)",
              opacity: visible ? 1 : 0,
              transform: visible ? "translateY(0px)" : "translateY(6px)",
              transition: "opacity 180ms ease, transform 180ms ease",
              textShadow: "0 0 20px rgba(147,100,255,0.5)",
            }}
          >
            {word}
          </span>
          <span
            style={{
              fontSize: 11,
              fontWeight: 400,
              letterSpacing: 1.5,
              color: "rgba(255,255,255,0.3)",
              textTransform: "uppercase",
            }}
          >
            Remotion
          </span>
        </div>

        {/* Progress dots */}
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 4,
                height: 4,
                borderRadius: "50%",
                background: "rgba(147,100,255,0.8)",
                opacity: visible ? 0.9 : 0.2,
                transition: `opacity ${120 + i * 80}ms ease`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

function EmptyView({ dark }: { dark: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: 200,
        background: dark ? "#141414" : "#fff",
        borderRadius: 8,
        fontFamily: "system-ui, sans-serif",
        color: dark ? "#777" : "#888",
        fontSize: 13,
        textAlign: "center",
        padding: 16,
      }}
    >
      No video project data was returned. Check the tool output and call create_video or update_video again.
    </div>
  );
}

// ---------------------------------------------------------------------------
// Header bar
// ---------------------------------------------------------------------------

function HeaderBar({
  title,
  dark,
  isFullscreen,
  isAvailable,
  onToggleFullscreen,
}: {
  title: string;
  dark: boolean;
  isFullscreen: boolean;
  isAvailable: boolean;
  onToggleFullscreen: () => void;
}) {
  const bg = dark ? "rgba(12,12,18,0.95)" : "rgba(255,255,255,0.95)";
  const borderColor = dark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)";
  const titleColor = dark ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.82)";
  const dotColor = dark ? "rgba(255,255,255,0.18)" : "rgba(0,0,0,0.14)";
  const btnColor = dark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.35)";

  const fsIcon = isFullscreen ? (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 2 6 6 2 6" /><polyline points="10 14 10 10 14 10" />
      <line x1="2" y1="2" x2="6" y2="6" /><line x1="14" y1="14" x2="10" y2="10" />
    </svg>
  ) : (
    <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="10 2 14 2 14 6" /><polyline points="6 14 2 14 2 10" />
      <line x1="14" y1="2" x2="10" y2="6" /><line x1="2" y1="14" x2="6" y2="10" />
    </svg>
  );

  return (
    <div
      style={{
        padding: "8px 10px 8px 14px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
        background: bg,
        borderBottom: `1px solid ${borderColor}`,
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
        {/* Traffic-light-style indicators */}
        <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
          {["#FF5F57", "#FEBC2E", "#28C840"].map((c, i) => (
            <div
              key={i}
              style={{ width: 8, height: 8, borderRadius: "50%", background: dark ? dotColor : c, opacity: dark ? 1 : 0.7 }}
            />
          ))}
        </div>
        <span
          style={{
            color: titleColor,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: 0.2,
            fontFamily: "'Inter', system-ui, sans-serif",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>
      </div>

      <button
        onClick={onToggleFullscreen}
        disabled={!isAvailable}
        title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        style={{
          background: "none",
          border: "none",
          cursor: isAvailable ? "pointer" : "not-allowed",
          padding: "4px 6px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: btnColor,
          borderRadius: 4,
          opacity: isAvailable ? 1 : 0.3,
          flexShrink: 0,
          transition: "opacity 150ms ease",
        }}
      >
        {fsIcon}
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Updating overlay
// ---------------------------------------------------------------------------

function EditingOverlay({ word, visible }: { word: string; visible: boolean }) {
  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        zIndex: 10,
        pointerEvents: "none",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        borderRadius: "inherit",
      }}
    >
      {/* Blur layer over the video */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          transition: "opacity 300ms ease",
        }}
      />
      {/* Shader gradient on top */}
      <ShaderBackground
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          opacity: 0.55,
          mixBlendMode: "screen",
        }}
      />
      {/* Loading word */}
      <span
        style={{
          position: "relative",
          zIndex: 1,
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: 0.35,
          lineHeight: 1,
          color: "#ffffff",
          textShadow: "0 1px 8px rgba(0,0,0,0.5)",
          opacity: visible ? 0.95 : 0,
          transform: visible ? "translateY(0px) scale(1)" : "translateY(8px) scale(0.985)",
          transition: "opacity 120ms ease, transform 120ms ease",
        }}
      >
        {word}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Player view
// ---------------------------------------------------------------------------

function PlayerView({
  compiledProject,
  compileError,
  mergedProps,
  meta,
  dark,
  isBusy,
  isFullscreen,
  loadingWord,
  loadingVisible,
  onPlayerError,
}: {
  compiledProject: ReturnType<typeof compileBundle> | null;
  compileError: string | null;
  mergedProps: Record<string, unknown>;
  meta: VideoMeta;
  dark: boolean;
  isBusy: boolean;
  isFullscreen: boolean;
  loadingWord: string;
  loadingVisible: boolean;
  onPlayerError: (msg: string) => void;
}) {
  const ref = useRef<PlayerRef>(null);

  if (compileError) {
    return (
      <div
        style={{
          padding: 16,
          background: dark ? "#1c1c1c" : "#f5f5f5",
          borderRadius: 8,
          fontFamily: "system-ui, sans-serif",
          color: dark ? "#ff6b6b" : "#dc3545",
          fontSize: 13,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>Compilation Error</div>
        <div style={{ opacity: 0.8, fontSize: 12, fontFamily: "monospace", whiteSpace: "pre-wrap" }}>
          {compileError}
        </div>
      </div>
    );
  }

  if (!compiledProject || "error" in compiledProject) {
    return null;
  }

  return (
    <PlayerErrorBoundary onError={onPlayerError} dark={dark}>
      <div style={{ position: "relative", width: "100%", maxWidth: isFullscreen ? "100%" : undefined, margin: isFullscreen ? "0 auto" : undefined }}>
        <Player
          ref={ref}
          component={compiledProject.component as any}
          inputProps={mergedProps}
          durationInFrames={meta.durationInFrames}
          fps={meta.fps}
          compositionWidth={meta.width}
          compositionHeight={meta.height}
          controls
          autoPlay
          loop
          style={{
            width: "100%",
            maxWidth: "100%",
            maxHeight: isFullscreen ? "calc(100vh - 56px)" : undefined,
            margin: "0 auto",
          }}
        />
        {isBusy && (
          <EditingOverlay word={loadingWord} visible={loadingVisible} />
        )}
      </div>
    </PlayerErrorBoundary>
  );
}

// ---------------------------------------------------------------------------
// Main widget
// ---------------------------------------------------------------------------

function RemotionPlayerWidgetInner() {
  const {
    isPending,
    theme,
    displayMode,
    isAvailable,
    isStreaming,
    sendFollowUpMessage,
    requestDisplayMode,
  } = useWidget<z.infer<typeof propSchema>>();

  const prevRef = useRef<VideoProjectData | null>(null);
  const isFullscreen = displayMode === "fullscreen" && isAvailable;
  const dark = theme === "dark";
  const bg = dark ? "#141414" : "#fff";
  const isBusy = isPending || isStreaming;

  // --- Parse project data ---
  const { output } = useWidget<z.infer<typeof propSchema>>() as any;

  // The compiled video project comes from structuredContent (tool output),
  // not from props (tool input). Props contains what the model sent (files, title, etc.)
  const rawVideoProject = useMemo(() => {
    const value = (output as Record<string, unknown> | null)?.videoProject;
    return typeof value === "string" ? value : null;
  }, [output]);

  const finalData = useMemo(() => {
    if (isPending || !rawVideoProject) return null;
    return parseVideoProject({ videoProject: rawVideoProject });
  }, [isPending, rawVideoProject]);

  useEffect(() => {
    if (finalData) prevRef.current = finalData;
  }, [finalData]);

  const data = finalData || (isBusy ? prevRef.current : null);
  const hasData = !!data;
  const isLoading = !hasData && isBusy;

  // --- Loading word ---
  const { word: loadingWord, visible: loadingVisible } = useLoadingWord(isBusy);

  // --- Compile bundle ---
  const compiled = useMemo(() => {
    if (!data || data.compileError) return null;
    return compileBundle(data.bundle);
  }, [data?.bundle, data?.compileError]);

  const compileError = data?.compileError ?? (compiled && "error" in compiled ? compiled.error : null);
  const compiledProject = compiled && !("error" in compiled) ? compiled : null;

  // --- Merge props ---
  const mergedProps = useMemo(() => {
    if (!data) return {};
    return mergeProps(data.defaultProps, data.inputProps);
  }, [data]);

  // --- Resolve metadata (calculateMetadata) ---
  const [resolvedMeta, setResolvedMeta] = useState<VideoMeta | null>(null);

  useEffect(() => {
    if (!data) { setResolvedMeta(null); return; }
    setResolvedMeta(data.meta);
  }, [data?.bundle, data?.meta.title, data?.meta.compositionId, data?.meta.width, data?.meta.height, data?.meta.fps, data?.meta.durationInFrames]);

  useEffect(() => {
    if (!data || !compiled || "error" in compiled || !compiled.calculateMetadata) return;
    const controller = new AbortController();
    Promise.resolve(
      compiled.calculateMetadata({
        props: mergedProps,
        defaultProps: data.defaultProps,
        compositionId: data.meta.compositionId,
        abortSignal: controller.signal,
      })
    )
      .then((metadata) => {
        if (controller.signal.aborted || !isRecord(metadata)) return;
        setResolvedMeta((current) => readMetadataOverrides(metadata, current ?? data.meta));
      })
      .catch((error) => {
        if (controller.signal.aborted) return;
        try { sendFollowUpMessage(`calculateMetadata() failed:\n\n\`${(error as Error).message}\`\n\nPlease fix the project and call create_video or update_video again.`); } catch {}
      });
    return () => controller.abort();
  }, [compiled, data, mergedProps, sendFollowUpMessage]);

  // --- Send follow-up on compile error ---
  useEffect(() => {
    if (!compileError || data?.compileError) return;
    try { sendFollowUpMessage(`The project had a compilation error:\n\n\`${compileError}\`\n\nPlease fix the files and call create_video or update_video again.`); } catch {}
  }, [compileError, sendFollowUpMessage]);

  // --- Fullscreen toggle ---
  const toggleFullscreen = useCallback(() => {
    const nextMode = isFullscreen ? "inline" : "fullscreen";
    requestDisplayMode(nextMode).catch((error) => {
      console.error(`[remotion-player] Failed to request display mode "${nextMode}"`, error);
    });
  }, [isFullscreen, requestDisplayMode]);

  // --- Player error handler ---
  const handlePlayerError = useCallback(
    (msg: string) => {
      try { sendFollowUpMessage(`The video had a runtime error:\n\n\`${msg}\`\n\nPlease fix the project and call create_video or update_video again.`); } catch {}
    },
    [sendFollowUpMessage]
  );

  const meta = resolvedMeta ?? data?.meta ?? { title: "Untitled", compositionId: "Main", width: 1920, height: 1080, fps: 30, durationInFrames: 150 };

  // --- Loading state (no data yet, tool is running) ---
  if (isLoading) {
    return (
      <LoadingView
        word={loadingWord}
        visible={loadingVisible}
        dark={dark}
        fullscreen={isFullscreen}
        onExitFullscreen={isFullscreen ? toggleFullscreen : undefined}
      />
    );
  }

  // --- Empty state (no data, tool is done) ---
  if (!hasData) {
    return <EmptyView dark={dark} />;
  }

  // --- Player state ---
  const playerEl = (
    <PlayerView
      compiledProject={compiledProject}
      compileError={compileError}
      mergedProps={mergedProps}
      meta={meta}
      dark={dark}
      isBusy={isBusy}
      isFullscreen={isFullscreen}
      loadingWord={loadingWord}
      loadingVisible={loadingVisible}
      onPlayerError={handlePlayerError}
    />
  );

  if (isFullscreen) {
    return (
      <div style={{ display: "flex", flexDirection: "column", height: "100vh", background: "#000", fontFamily: "system-ui, sans-serif" }}>
        <HeaderBar title={meta.title} dark={dark} isFullscreen isAvailable={isAvailable} onToggleFullscreen={toggleFullscreen} />
        <div style={{ flex: 1, width: "100%", display: "flex", alignItems: "center", justifyContent: "center", padding: "12px 16px 16px", boxSizing: "border-box" }}>
          <div style={{ width: "100%", maxWidth: 1680 }}>{playerEl}</div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        borderRadius: 12,
        overflow: "hidden",
        background: dark ? "#0c0c12" : "#ffffff",
        fontFamily: "'Inter', system-ui, sans-serif",
        boxShadow: dark
          ? "0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.5)"
          : "0 0 0 1px rgba(0,0,0,0.06), 0 4px 24px rgba(0,0,0,0.08)",
      }}
    >
      <HeaderBar title={meta.title} dark={dark} isFullscreen={false} isAvailable={isAvailable} onToggleFullscreen={toggleFullscreen} />
      {playerEl}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Export with error boundary + provider
// ---------------------------------------------------------------------------

export default function RemotionPlayerWidget() {
  return (
    <McpUseProvider autoSize>
      <WidgetErrorBoundary>
        <RemotionPlayerWidgetInner />
      </WidgetErrorBoundary>
    </McpUseProvider>
  );
}
