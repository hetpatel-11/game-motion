export const RULE_CUSTOM_RENDERER = `
# Custom Game Renderer — Pixi.js v8 Format

Use gameType="custom" when you want a fully custom visual layout.
You write a JavaScript renderer function. The widget executes it in the browser.

## AVAILABLE GLOBALS (always present, no imports needed)
- PIXI  — Pixi.js v8
- gsap  — GSAP 3 animation library
- app   — PIXI.Application (already initialized, app.stage ready)
- W     — canvas width (default 460)
- H     — canvas height (default 480)

## REQUIRED EXPORT FORMAT
Your rendererCode must be a string containing a function called createRenderer:

\`\`\`javascript
function createRenderer(app, W, H) {
  // ── SETUP (runs once, SYNC only — no await, no async) ──────────────────
  const stage = app.stage;

  // Draw background
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, W, H).fill(0x1a1a2e);
  stage.addChild(bg);

  // Create display objects
  const title = new PIXI.Text({ text: "My Game", style: { fill: 0xffffff, fontSize: 24 } });
  title.x = W / 2 - title.width / 2;
  title.y = 20;
  stage.addChild(title);

  // ── UPDATE (called on every state change) ──────────────────────────────
  function update(state, prev) {
    // Mutate display objects based on state
    title.text = state.title ?? "My Game";
  }

  return { update };
}
\`\`\`

## PIXI.js v8 API RULES (v8 is different from v7 — follow exactly)

### Graphics (shapes)
\`\`\`javascript
const g = new PIXI.Graphics();
// Chain .fill() or .stroke() AFTER the shape method:
g.rect(x, y, w, h).fill(0xff0000);
g.circle(cx, cy, r).fill(0x00ff00).stroke({ color: 0xffffff, width: 2 });
g.roundRect(x, y, w, h, radius).fill(0x0000ff);
g.moveTo(x1, y1).lineTo(x2, y2).stroke({ color: 0xffffff, width: 1 });
\`\`\`

### Text
\`\`\`javascript
// Constructor takes an options object:
const t = new PIXI.Text({ text: "Hello", style: { fill: 0xffffff, fontSize: 18, fontFamily: "Arial" } });
// Change text:
t.text = "New text";
\`\`\`

### Container
\`\`\`javascript
const c = new PIXI.Container();
c.x = 10; c.y = 10;
c.addChild(someSprite);
stage.addChild(c);
// Remove a child:
c.removeChild(someSprite);
\`\`\`

### Sprites from color/shapes (no external URLs — CSP blocks them)
Use Graphics shapes instead of images. For icons use Unicode characters in PIXI.Text.
\`\`\`javascript
// Card suit icons:
const suit = new PIXI.Text({ text: "♠", style: { fill: 0x000000, fontSize: 32 } });
// Piece icons:
const piece = new PIXI.Text({ text: "♟", style: { fill: 0xffffff, fontSize: 28, fontFamily: "serif" } });
\`\`\`

### GSAP animations
\`\`\`javascript
// Animate alpha:
gsap.to(someObject, { alpha: 0, duration: 0.3, onComplete: () => stage.removeChild(someObject) });
// Animate position:
gsap.fromTo(obj, { y: obj.y - 20 }, { y: obj.y, duration: 0.4, ease: "back.out" });
// Tween a value:
gsap.to(barObj, { width: targetWidth, duration: 0.5, ease: "power2.out" });
\`\`\`

## DESIGN GUIDELINES

### Canvas size
Default is 460×480. Request larger with width/height params if needed.
Design for 460px width.

### Fonts
ONLY use system fonts: "Arial", "Helvetica", "Georgia", "serif", "monospace", "sans-serif"
Do NOT use Google Fonts or any external font URL — they hang forever in the sandbox.

### Colors
Use hex numbers: 0xff0000 (red), 0xffffff (white), 0x000000 (black)
Dark theme recommended: background 0x0d1117 or 0x1a1a2e

### Animations in update()
When a value changes between state and prev, trigger a GSAP animation:
\`\`\`javascript
function update(state, prev) {
  if (prev && state.score !== prev.score) {
    gsap.fromTo(scoreText, { alpha: 0, y: scoreText.y - 10 }, { alpha: 1, y: scoreText.y, duration: 0.3 });
  }
  scoreText.text = String(state.score);
}
\`\`\`

### Always show player instructions
Include an actions or instructions panel showing what the player can do:
\`\`\`javascript
// Action buttons panel at bottom
const actions = state.actions ?? [];
actions.forEach((action, i) => {
  const btn = new PIXI.Graphics();
  btn.roundRect(10 + i * 110, H - 45, 100, 35, 6).fill(0x2d3748);
  const label = new PIXI.Text({ text: action, style: { fill: 0xe2e8f0, fontSize: 12 } });
  label.x = 10 + i * 110 + 50 - label.width / 2;
  label.y = H - 45 + 10;
  stage.addChild(btn);
  stage.addChild(label);
});
\`\`\`

## FULL EXAMPLE: Tic-Tac-Toe

State shape for tic-tac-toe:
{
  "board": [null, null, null, null, null, null, null, null, null],
  "turn": "X",
  "message": "Your turn! You are X.",
  "winner": null,
  "gameOver": false
}

\`\`\`javascript
function createRenderer(app, W, H) {
  const stage = app.stage;
  const PAD = 30;
  const BOARD_SIZE = W - PAD * 2;
  const CELL = BOARD_SIZE / 3;

  // Background
  const bg = new PIXI.Graphics();
  bg.rect(0, 0, W, H).fill(0x0d1117);
  stage.addChild(bg);

  // Title
  const titleText = new PIXI.Text({ text: "Tic-Tac-Toe", style: { fill: 0xe2e8f0, fontSize: 22, fontFamily: "Arial" } });
  titleText.x = W / 2 - titleText.width / 2;
  titleText.y = 12;
  stage.addChild(titleText);

  // Grid lines
  const grid = new PIXI.Graphics();
  for (let i = 1; i < 3; i++) {
    grid.moveTo(PAD + CELL * i, 60).lineTo(PAD + CELL * i, 60 + BOARD_SIZE).stroke({ color: 0x4a5568, width: 3 });
    grid.moveTo(PAD, 60 + CELL * i).lineTo(PAD + BOARD_SIZE, 60 + CELL * i).stroke({ color: 0x4a5568, width: 3 });
  }
  stage.addChild(grid);

  // Cell containers
  const cells = Array.from({ length: 9 }, (_, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const c = new PIXI.Container();
    c.x = PAD + col * CELL + CELL / 2;
    c.y = 60 + row * CELL + CELL / 2;
    stage.addChild(c);
    return c;
  });

  // Message text
  const msgText = new PIXI.Text({ text: "", style: { fill: 0xa0aec0, fontSize: 14, fontFamily: "Arial", wordWrap: true, wordWrapWidth: W - 20 } });
  msgText.x = W / 2 - msgText.width / 2;
  msgText.y = 60 + BOARD_SIZE + 14;
  stage.addChild(msgText);

  // Turn indicator
  const turnText = new PIXI.Text({ text: "", style: { fill: 0x68d391, fontSize: 13, fontFamily: "Arial" } });
  turnText.x = 10;
  turnText.y = H - 30;
  stage.addChild(turnText);

  function update(state, prev) {
    // Update board cells
    state.board.forEach((val, i) => {
      const c = cells[i];
      c.removeChildren();
      if (val) {
        const t = new PIXI.Text({ text: val, style: { fill: val === "X" ? 0x63b3ed : 0xfc8181, fontSize: 48, fontFamily: "Arial" } });
        t.x = -t.width / 2;
        t.y = -t.height / 2;
        c.addChild(t);
        // Animate new pieces
        if (!prev || prev.board[i] !== val) {
          gsap.fromTo(t, { alpha: 0 }, { alpha: 1, duration: 0.25 });
        }
      }
    });

    msgText.text = state.message ?? "";
    msgText.x = W / 2 - msgText.width / 2;
    turnText.text = state.gameOver ? (state.winner ? state.winner + " wins!" : "Draw!") : ("Turn: " + state.turn);
  }

  return { update };
}
\`\`\`

## SUMMARY
1. Call get_custom_renderer_rules (you are doing that now)
2. Design your game's state shape
3. Write createRenderer(app, W, H) — all SYNC, no async/await at top level
4. Call start_game with gameType="custom", rendererCode=<your function string>, initialState=<your state JSON>
5. Call update_game_state with complete state JSON after every turn
`;
