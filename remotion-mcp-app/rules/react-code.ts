export const RULE_REACT_CODE = `# Project Code Reference

## create_video — Start a new project

Only one field is required: **files**.

\`\`\`json
{
  "files": {
    "/src/Video.tsx": "import {AbsoluteFill, useCurrentFrame, interpolate} from \\"remotion\\";\\n\\nexport default function Video() {\\n  const frame = useCurrentFrame();\\n  const opacity = interpolate(frame, [0, 30], [0, 1], {extrapolateRight: \\"clamp\\"});\\n  return (\\n    <AbsoluteFill style={{backgroundColor: \\"#0a0a0a\\", justifyContent: \\"center\\", alignItems: \\"center\\"}}>\\n      <div style={{color: \\"white\\", fontSize: 72, opacity}}>Hello World</div>\\n    </AbsoluteFill>\\n  );\\n}"
  },
  "durationInFrames": 150,
  "fps": 30
}
\`\`\`

Optional fields: entryFile (default: "/src/Video.tsx"), title, durationInFrames, fps, width, height.

For follow-up edits, call **create_video** again with only the changed files — previous files are preserved automatically.

Strict contract:
- Do not send wrapper keys like \`input\`, \`project\`, \`arguments\`, \`params\`, \`payload\`
- Do not send legacy aliases like \`code\`, \`jsx\`, \`tsx\`, \`source\`, \`fileMap\`, \`projectFiles\`

## Supported Imports

Use normal imports inside files:
- remotion
- any @remotion/* package installed in this MCP app
- any other npm package installed in this MCP app

You can also import other files from your own files map using relative imports.

## Entry File Contract

The entry file must export a default React component:

\`\`\`tsx
// /src/Video.tsx
import {AbsoluteFill, useCurrentFrame, interpolate} from "remotion";

export default function Video() {
  const frame = useCurrentFrame();
  const opacity = interpolate(frame, [0, 20], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill style={{backgroundColor: "#0a0a0a", justifyContent: "center", alignItems: "center"}}>
      <div style={{color: "white", fontSize: 72, opacity}}>Hello World</div>
    </AbsoluteFill>
  );
}
\`\`\`

## Optional calculateMetadata

You may export calculateMetadata() from the entry file to derive width/height/fps/duration from props.

\`\`\`tsx
export const calculateMetadata = ({props}) => {
  const sceneCount = Array.isArray(props.scenes) ? props.scenes.length : 1;
  return {
    durationInFrames: Math.max(60, sceneCount * 90),
    fps: 30,
  };
};
\`\`\`

## Multi-file Example

\`\`\`tsx
// /src/Video.tsx
import {AbsoluteFill} from "remotion";
import {Title} from "./components/Title";

export default function Video(props) {
  return (
    <AbsoluteFill style={{backgroundColor: "black", justifyContent: "center", alignItems: "center"}}>
      <Title text={props.title} />
    </AbsoluteFill>
  );
}

// /src/components/Title.tsx
export function Title({text}) {
  return <div style={{color: "white", fontSize: 72}}>{text}</div>;
}
\`\`\`

## Scene Management (Critical)

Every Sequence must have durationInFrames to avoid scene overlap:

\`\`\`tsx
<Sequence from={0} durationInFrames={60}><Scene1 /></Sequence>
<Sequence from={60} durationInFrames={60}><Scene2 /></Sequence>
\`\`\`

## Common Pitfalls

1. Missing default export in entry file
2. Importing unsupported npm packages
3. Forgetting durationInFrames on Sequence
4. Using CSS transitions instead of frame-driven Remotion logic
5. Returning invalid metadata values (non-positive width/height/fps/duration)

## Default Quality Bar

Unless the user explicitly asks for minimal output:
1. Use at least 3 scenes with intentional progression
2. Add at least one transition between scenes
3. Animate 2+ visual properties per scene (for example: opacity + translateY)
4. Include text hierarchy (headline, supporting line, optional accent)
5. Avoid flat placeholder slides and static centered text-only layouts
6. Vary visual direction (palette, layout rhythm, typography scale) across unrelated requests instead of reusing one template
7. For modification requests, preserve the existing structure and only change what the user asked for
`;
