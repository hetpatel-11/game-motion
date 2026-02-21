export const RULE_GAME_COMPOSITION = `# Game Composition Rules

Use these patterns when writing Remotion compositions for interactive games.
All visual state MUST come from props — never hardcode game values.

## Props Interface Pattern

\`\`\`tsx
interface GameState {
  player: { name: string; hp: number; maxHp: number };
  enemy:  { name: string; hp: number; maxHp: number };
  message: string;
  phase: "player_turn" | "enemy_turn" | "victory" | "defeat";
  lastMove?: string;
}

export default function GameComposition(props: GameState) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  // ...
}
\`\`\`

## HP Bar with Spring Animation

\`\`\`tsx
const BAR_WIDTH = 200;
const hpRatio = hp / maxHp;
// Spring-damped entry: bar animates in from 0 on every new render
const barProgress = spring({ frame, fps, config: { damping: 20 } });
const barWidth = interpolate(hpRatio, [0, 1], [0, BAR_WIDTH]) * barProgress;
const barColor = hpRatio > 0.5 ? "#4caf50" : hpRatio > 0.25 ? "#ff9800" : "#f44336";

return (
  <div style={{ width: BAR_WIDTH, height: 16, background: "#333", borderRadius: 8, overflow: "hidden" }}>
    <div style={{ width: barWidth, height: "100%", background: barColor, borderRadius: 8 }} />
  </div>
);
\`\`\`

## Message Box with Typewriter Effect

\`\`\`tsx
const charsToShow = Math.floor(interpolate(frame, [0, fps * 1.5], [0, message.length], { extrapolateRight: "clamp" }));
const displayedText = message.slice(0, charsToShow);

return (
  <div style={{
    position: "absolute", bottom: 20, left: 20, right: 20,
    background: "rgba(0,0,0,0.85)", color: "#fff",
    padding: "12px 16px", borderRadius: 8, fontSize: 18, minHeight: 56,
    border: "2px solid #fff"
  }}>
    {displayedText}
  </div>
);
\`\`\`

## Sprite / Pokemon Sprite Pattern

Use large emoji or colored boxes since external URLs are not available.

\`\`\`tsx
// Player sprite — bottom-left, scale spring on appear
const playerScale = spring({ frame, fps, config: { damping: 18, stiffness: 120 } });
<div style={{
  position: "absolute", bottom: 100, left: 60,
  fontSize: 80, transform: \`scale(\${playerScale})\`,
  transformOrigin: "bottom center",
}}>
  🦎
</div>
\`\`\`

## Faint Animation (HP = 0)

\`\`\`tsx
const isFainted = hp <= 0;
const faintOpacity = isFainted
  ? interpolate(frame, [0, fps], [1, 0], { extrapolateRight: "clamp" })
  : 1;
const faintY = isFainted
  ? interpolate(frame, [0, fps], [0, 40], { extrapolateRight: "clamp" })
  : 0;

<div style={{ opacity: faintOpacity, transform: \`translateY(\${faintY}px)\` }}>
  {/* sprite */}
</div>
\`\`\`

## Victory / Defeat Overlay

\`\`\`tsx
if (phase === "victory" || phase === "defeat") {
  const overlayOpacity = spring({ frame, fps, config: { damping: 25 } });
  const overlayScale = spring({ frame, fps, from: 0.5, to: 1, config: { damping: 16 } });
  const color = phase === "victory" ? "#ffd700" : "#cc0000";
  const label = phase === "victory" ? "🏆 Victory!" : "💀 Defeated!";

  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", background: \`\${color}33\` }}>
      <div style={{
        fontSize: 72, fontWeight: "bold", color,
        opacity: overlayOpacity,
        transform: \`scale(\${overlayScale})\`,
        textShadow: "0 4px 24px rgba(0,0,0,0.6)",
      }}>
        {label}
      </div>
    </AbsoluteFill>
  );
}
\`\`\`

## Attack Flash Effect

Briefly flash the background when a move hits:

\`\`\`tsx
const flashOpacity = interpolate(frame, [0, 4, 8], [0.6, 0.6, 0], { extrapolateRight: "clamp" });
<AbsoluteFill style={{ background: \`rgba(255,255,255,\${flashOpacity})\`, pointerEvents: "none" }} />
\`\`\`

## Key Rules

1. ALL state (HP, names, messages, phase) comes through props — NEVER hardcode
2. Compositions must loop gracefully: frame resets to 0 on re-render, so spring(frame) will re-animate
3. Use spring() for entrances, interpolate() for continuous value mapping
4. durationInFrames=90, fps=30 → 3 second loop per state — ideal for turn-based games
5. Register the composition with: \`<Composition id="Game" component={GameComposition} defaultProps={...} />\`
6. Export the GameComposition as default from the entry file
7. Avoid external fetch/network calls — all assets must be emoji, SVG, or inline data URLs
`;
