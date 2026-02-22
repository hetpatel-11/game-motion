export const RULE_INDEX = `# Remotion MCP — Project-Based Video Creation

Create videos using multi-file React/Remotion projects.

## Available Rules

Call these tools to learn specific Remotion topics:

- **rule_react_code** — Project file structure, imports, composition exports, props
- **rule_remotion_animations** — useCurrentFrame, frame-driven animations
- **rule_remotion_timing** — interpolate, spring, Easing, spring configs
- **rule_remotion_sequencing** — Sequence, durationInFrames, scene management
- **rule_remotion_transitions** — TransitionSeries, fade, slide, wipe, flip
- **rule_remotion_text_animations** — Typewriter effect, word highlighting
- **rule_remotion_trimming** — Trim start/end of animations with Sequence
- **rule_remotion_diagrams** — Animated diagrams: flowcharts, node graphs, bar/donut charts, timelines, split text+diagram explainer layouts, animated code blocks

## Quick Start

1. Call **rule_react_code** for the project format reference and exact tool call shape
2. If the user provides a URL, call **scrape_url** FIRST — it returns extracted content + a full brand theme (colors, fonts, mood). Use these exact colors and style in the video.
3. Build your project as a **files** map: { "/src/Video.tsx": "source code..." }
4. Call **create_video** with files (and optionally entryFile, title, fps, etc.)
5. For edits, call **create_video** again with only the changed files — previous files are preserved automatically

## URL-Based Video Creation (Thematic Design)

When creating a video from a URL:
- The theme object from **scrape_url** contains primaryColor, secondaryColor, accentColor, backgroundColor, fontStyle, mood
- Apply the exact brand colors throughout the video — backgrounds, text, accents, gradients
- Use the theme's mood and keywords to guide animation style and typography choices
- Reference the keyPoints as the actual content/narrative for each scene
- Example: paulgraham.com → YC orange (#FF6600) theme, serif typewriter feel, intellectual founder energy

## Diagram & Explainer Video Requests

When the user asks for a diagram, flowchart, explainer video, chart, or visualization:
- Call **rule_remotion_diagrams** to get ready-to-use patterns for nodes/arrows/bars/donuts/timelines
- Use SVG for all shapes — it scales perfectly and supports draw-on animations via strokeDashoffset
- Use split layout (left text + right diagram) for "explain X" style requests
- Stagger node/element entrance delays by 10–20 frames for visual flow
- Combine with scrape_url for URL-based explainer videos with on-brand theming

## Important Rules

1. Use standard module imports (remotion and installed @remotion/* packages are supported)
2. Entry module must export a default React component
3. You may export calculateMetadata() to derive duration/fps/dimensions from props
4. Keep video-level fallback metadata in tool params (width, height, fps, durationInFrames)
5. Every Sequence must include durationInFrames to avoid scene stacking
6. Do not use CSS animations/transitions for timing; use frame-driven Remotion APIs
7. Default quality bar unless user asks otherwise: multi-scene structure, animated transitions, clear typography hierarchy, and purposeful motion (not static slides)
8. For edit requests, only send changed files — unchanged files are kept from the previous call
9. For edit requests, patch the existing project and keep unrelated scenes/styles unless user asks for a full redesign
`;
