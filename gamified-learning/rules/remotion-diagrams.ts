export const RULE_REMOTION_DIAGRAMS = `# Remotion Diagrams & Explainer Videos

Build animated diagrams, flowcharts, architecture diagrams, and text+visual explainer videos using pure React/SVG and frame-driven Remotion animations.

---

## 1. Animated Flowchart / Node Graph

Nodes and arrows animate in sequentially using staggered Sequences.

\`\`\`tsx
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";

// Reusable animated box node
function Node({ label, x, y, color, delay = 0 }: {
  label: string; x: number; y: number; color: string; delay?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  return (
    <g transform={\`translate(\${x}, \${y})\`} opacity={progress} style={{ transform: \`translate(\${x}px, \${y}px) scale(\${progress})\`, transformOrigin: \`\${x}px \${y}px\` }}>
      <rect x={-70} y={-22} width={140} height={44} rx={8} fill={color} />
      <text x={0} y={5} textAnchor="middle" fill="white" fontSize={13} fontWeight={600} fontFamily="Inter, sans-serif">{label}</text>
    </g>
  );
}

// Animated arrow between two points
function Arrow({ x1, y1, x2, y2, delay = 0, color = "#ffffff" }: {
  x1: number; y1: number; x2: number; y2: number; delay?: number; color?: string;
}) {
  const frame = useCurrentFrame();
  const progress = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  // Lerp endpoint so line draws from start to end
  const ex = x1 + (x2 - x1) * progress;
  const ey = y1 + (y2 - y1) * progress;
  return (
    <line x1={x1} y1={y1} x2={ex} y2={ey} stroke={color} strokeWidth={2} strokeOpacity={0.7} markerEnd="url(#arrow)" />
  );
}

export default function FlowChart() {
  return (
    <AbsoluteFill style={{ background: "#0f1117" }}>
      <svg width="100%" height="100%" viewBox="0 0 960 540">
        <defs>
          <marker id="arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
            <path d="M0,0 L0,6 L8,3 z" fill="rgba(255,255,255,0.6)" />
          </marker>
        </defs>
        {/* Arrows first (behind nodes) */}
        <Arrow x1={480} y1={80} x2={300} y2={200} delay={15} />
        <Arrow x1={480} y1={80} x2={660} y2={200} delay={15} />
        <Arrow x1={300} y1={244} x2={300} y2={340} delay={35} />
        <Arrow x1={660} y1={244} x2={660} y2={340} delay={35} />
        <Arrow x1={300} y1={384} x2={480} y2={460} delay={55} />
        <Arrow x1={660} y1={384} x2={480} y2={460} delay={55} />
        {/* Nodes */}
        <Node label="Start" x={480} y={80} color="#6366F1" delay={0} />
        <Node label="Process A" x={300} y={222} color="#8B5CF6" delay={20} />
        <Node label="Process B" x={660} y={222} color="#EC4899" delay={20} />
        <Node label="Result A" x={300} y={362} color="#06B6D4" delay={40} />
        <Node label="Result B" x={660} y={362} color="#10B981" delay={40} />
        <Node label="End" x={480} y={480} color="#F59E0B" delay={60} />
      </svg>
    </AbsoluteFill>
  );
}
\`\`\`

---

## 2. Text + Diagram Split Layout (Explainer Style)

Left: animated body text with staggered lines. Right: animated visual/diagram.

\`\`\`tsx
import { AbsoluteFill, useCurrentFrame, interpolate, spring, useVideoConfig, Sequence } from "remotion";

function TextBlock({ lines, startFrame = 0 }: { lines: string[]; startFrame?: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: "0 48px" }}>
      {lines.map((line, i) => {
        const delay = startFrame + i * 8;
        const opacity = interpolate(frame - delay, [0, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        const x = interpolate(frame - delay, [0, 20], [-24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
        return (
          <div key={i} style={{ opacity, transform: \`translateX(\${x}px)\`, color: "white", fontSize: i === 0 ? 28 : 18, fontWeight: i === 0 ? 700 : 400, fontFamily: "Inter, system-ui, sans-serif", lineHeight: 1.5, opacity: i === 0 ? opacity : opacity * 0.8 }}>
            {line}
          </div>
        );
      })}
    </div>
  );
}

function DiagramPanel({ children }: { children: React.ReactNode }) {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [10, 35], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return (
    <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity }}>
      {children}
    </div>
  );
}

export default function SplitExplainer() {
  return (
    <AbsoluteFill style={{ background: "#0d1117", display: "flex", flexDirection: "row", alignItems: "center" }}>
      {/* Left: text */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", borderRight: "1px solid rgba(255,255,255,0.08)" }}>
        <TextBlock lines={[
          "How it works",
          "Step 1: Input is received and parsed",
          "Step 2: Core algorithm runs in O(n log n)",
          "Step 3: Results are returned to caller",
        ]} />
      </div>
      {/* Right: diagram */}
      <DiagramPanel>
        <svg width="400" height="300" viewBox="0 0 400 300">
          {/* your diagram here */}
        </svg>
      </DiagramPanel>
    </AbsoluteFill>
  );
}
\`\`\`

---

## 3. Bar Chart / Data Visualization

Bars animate up from zero with spring physics.

\`\`\`tsx
function Bar({ value, maxValue, label, color, delay, barWidth = 60 }: {
  value: number; maxValue: number; label: string; color: string; delay: number; barWidth?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const CHART_HEIGHT = 280;
  const progress = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 80 } });
  const barH = (value / maxValue) * CHART_HEIGHT * progress;
  return (
    <g>
      <rect x={0} y={CHART_HEIGHT - barH} width={barWidth} height={barH} rx={4} fill={color} />
      <text x={barWidth / 2} y={CHART_HEIGHT + 20} textAnchor="middle" fill="rgba(255,255,255,0.6)" fontSize={12} fontFamily="Inter, sans-serif">{label}</text>
      <text x={barWidth / 2} y={CHART_HEIGHT - barH - 8} textAnchor="middle" fill="white" fontSize={13} fontWeight={600} fontFamily="Inter, sans-serif" opacity={progress}>{value}</text>
    </g>
  );
}

// Usage inside a composition:
// <svg viewBox="0 0 500 360">
//   <Bar value={80} maxValue={100} label="Jan" color="#6366F1" delay={0} />
//   <Bar value={65} maxValue={100} label="Feb" color="#8B5CF6" delay={8} />
//   ...
// </svg>
\`\`\`

---

## 4. Animated Circle / Donut / Pie

\`\`\`tsx
function DonutRing({ percent, color, delay = 0, r = 80, strokeWidth = 16 }: {
  percent: number; color: string; delay?: number; r?: number; strokeWidth?: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 20, stiffness: 60 } });
  const circumference = 2 * Math.PI * r;
  const dashOffset = circumference * (1 - percent / 100 * progress);
  return (
    <circle
      cx={0} cy={0} r={r}
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      strokeDasharray={circumference}
      strokeDashoffset={dashOffset}
      strokeLinecap="round"
      transform="rotate(-90)"
    />
  );
}
\`\`\`

---

## 5. Timeline / Roadmap Diagram

Horizontal timeline with milestone dots animating in.

\`\`\`tsx
function Milestone({ x, label, date, color, delay }: {
  x: number; label: string; date: string; color: string; delay: number;
}) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - delay, fps, config: { damping: 14, stiffness: 120 } });
  const Y = 270; // center Y of timeline
  return (
    <g opacity={progress} style={{ transform: \`scaleY(\${progress})\`, transformOrigin: \`\${x}px \${Y}px\` }}>
      <circle cx={x} cy={Y} r={10} fill={color} />
      <line x1={x} y1={Y - 10} x2={x} y2={Y - 70} stroke={color} strokeWidth={1.5} strokeOpacity={0.5} />
      <text x={x} y={Y - 82} textAnchor="middle" fill="white" fontSize={13} fontWeight={600} fontFamily="Inter, sans-serif">{label}</text>
      <text x={x} y={Y + 28} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize={11} fontFamily="Inter, sans-serif">{date}</text>
    </g>
  );
}
\`\`\`

---

## 6. Explainer Video Scene Structure

For multi-scene explainer videos, use this pattern:

\`\`\`tsx
// Scene durations
const INTRO = 90;       // 3s
const DIAGRAM = 150;    // 5s
const TEXT_REVEAL = 120; // 4s
const OUTRO = 60;       // 2s
const TOTAL = INTRO + DIAGRAM + TEXT_REVEAL + OUTRO;

export const calculateMetadata = () => ({ durationInFrames: TOTAL, fps: 30 });

export default function Explainer() {
  return (
    <AbsoluteFill>
      <Sequence from={0} durationInFrames={INTRO}><IntroScene /></Sequence>
      <Sequence from={INTRO} durationInFrames={DIAGRAM}><DiagramScene /></Sequence>
      <Sequence from={INTRO + DIAGRAM} durationInFrames={TEXT_REVEAL}><TextScene /></Sequence>
      <Sequence from={INTRO + DIAGRAM + TEXT_REVEAL} durationInFrames={OUTRO}><OutroScene /></Sequence>
    </AbsoluteFill>
  );
}
\`\`\`

---

## 7. Animated Code Block

Typewriter-style code reveal, useful for technical explainer videos.

\`\`\`tsx
function CodeBlock({ code, startFrame = 0, color = "#98C379" }: { code: string; startFrame?: number; color?: string }) {
  const frame = useCurrentFrame();
  const charsToShow = Math.floor(interpolate(frame - startFrame, [0, 60], [0, code.length], {
    extrapolateLeft: "clamp", extrapolateRight: "clamp",
  }));
  return (
    <div style={{
      background: "#1e2127", borderRadius: 8, padding: "24px 32px",
      fontFamily: "'Fira Code', 'Courier New', monospace", fontSize: 16,
      color, lineHeight: 1.7, whiteSpace: "pre",
    }}>
      {code.slice(0, charsToShow)}
      <span style={{ opacity: frame % 30 < 15 ? 1 : 0, color: "white" }}>|</span>
    </div>
  );
}
\`\`\`

---

## Key Tips for Diagrams

- Use SVG for all diagram shapes (nodes, arrows, lines, arcs) — it scales perfectly to any resolution
- Stagger node entrance delays by 10–20 frames each for visual flow
- Use \`spring()\` for node pop-ins, \`interpolate()\` for line draws and opacity
- Keep SVG \`viewBox\` fixed (e.g. "0 0 960 540") and use \`width="100%" height="100%"\` to fill the frame
- For arrow/line draw-on effects: animate \`strokeDashoffset\` from circumference → 0
- Always define \`<defs><marker>\` for arrowheads inside the SVG
- Split-layout videos: left text + right diagram is the most readable format at 1920x1080
`;
