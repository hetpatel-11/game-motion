import Phaser from "phaser";
import { mapRoomToLayout, type TileType } from "./tile-mapper";

const TILE = 16;
const MAP = 10;

const TILE_COLORS: Record<TileType, number> = {
  grass:  0x306230,
  forest: 0x1a4a1a,
  house:  0x8b6914,
  cave:   0x3a3a3a,
  water:  0x2060a0,
  path:   0xc8b060,
  indoor: 0x705030,
  dark:   0x101010,
};

// Seeded pseudo-random for deterministic tile decoration
function tileSeed(x: number, y: number): number {
  let h = (x * 374761393 + y * 668265263 + 1274126177) | 0;
  h = ((h ^ (h >> 13)) * 1274126177) | 0;
  return (h >>> 0) / 4294967296;
}

export class GameScene extends Phaser.Scene {
  private waterTimer?: Phaser.Time.TimerEvent;

  constructor() {
    super({ key: "GameScene" });
  }

  create(data: {
    locationName: string;
    observation: string;
    objects: { name: string }[];
    validActions: string[];
  }) {
    this.children.removeAll(true);
    if (this.waterTimer) this.waterTimer.destroy();

    const layout = mapRoomToLayout(
      data.locationName,
      data.observation,
      data.objects,
      data.validActions
    );

    this.cameras.main.setBackgroundColor(0x0f380f);
    const base = TILE_COLORS[layout.tileType];

    // --- Transition flash ---
    const flash = this.add.rectangle(80, 80, 160, 160, 0x0f380f).setDepth(100);
    this.tweens.add({ targets: flash, alpha: { from: 1, to: 0 }, duration: 200, onComplete: () => flash.destroy() });

    // --- Tile grid with texture ---
    const gfx = this.add.graphics();
    this.drawTiles(gfx, layout.tileType, base);

    // --- Water animation ---
    if (layout.tileType === "water") {
      let frame = 0;
      this.waterTimer = this.time.addEvent({
        delay: 500,
        loop: true,
        callback: () => {
          frame++;
          gfx.clear();
          this.drawTiles(gfx, "water", base, frame);
        },
      });
    }

    // --- Exit indicators ---
    this.drawExits(layout.exits);

    // --- Objects ---
    for (const obj of layout.objectPositions) {
      this.drawObject(obj.name, obj.x, obj.y);
    }

    // --- Player ---
    this.drawPlayer(5, 5);
  }

  // ─── Tile rendering ──────────────────────────────────────────

  private drawTiles(gfx: Phaser.GameObjects.Graphics, type: TileType, base: number, frame = 0) {
    for (let y = 0; y < MAP; y++) {
      for (let x = 0; x < MAP; x++) {
        const px = x * TILE;
        const py = y * TILE;
        const r = tileSeed(x, y);

        switch (type) {
          case "grass": {
            const shade = (x + y) % 2 === 0 ? base : base + 0x081008;
            gfx.fillStyle(shade); gfx.fillRect(px, py, TILE, TILE);
            if (r < 0.2) { gfx.fillStyle(0x1a4a1a); gfx.fillRect(px + 4 + (r * 8 | 0), py + 6 + (r * 6 | 0), 2, 3); }
            break;
          }
          case "forest": {
            const shade = (x + y) % 2 === 0 ? 0x1a4a1a : 0x224e22;
            gfx.fillStyle(shade); gfx.fillRect(px, py, TILE, TILE);
            if (r < 0.35) {
              // tree: trunk + canopy
              gfx.fillStyle(0x5a3a1a); gfx.fillRect(px + 7, py + 10, 2, 5);
              gfx.fillStyle(0x0f380f); gfx.fillRect(px + 4, py + 3, 8, 8);
              gfx.fillStyle(0x143e14); gfx.fillRect(px + 5, py + 4, 6, 6);
            }
            break;
          }
          case "indoor": case "house": {
            const shade = type === "indoor" ? 0x705030 : 0x8b6914;
            gfx.fillStyle(shade); gfx.fillRect(px, py, TILE, TILE);
            // wood grain lines
            gfx.fillStyle(shade - 0x101008);
            for (let ly = 3; ly < TILE; ly += 5) gfx.fillRect(px, py + ly, TILE, 1);
            break;
          }
          case "cave": case "dark": {
            gfx.fillStyle(type === "dark" ? 0x080808 : 0x2a2a2a); gfx.fillRect(px, py, TILE, TILE);
            if (r < 0.25) { gfx.fillStyle(0x4a4a4a); gfx.fillRect(px + (r * 10 | 0), py + (r * 12 | 0), 2, 2); }
            if (r > 0.8) { gfx.fillStyle(0x3a3a3a); gfx.fillRect(px + 2, py + 8, 3, 2); }
            break;
          }
          case "water": {
            const waveShift = ((frame + x + y) % 3);
            const shade = waveShift === 0 ? 0x2060a0 : waveShift === 1 ? 0x2870b0 : 0x185090;
            gfx.fillStyle(shade); gfx.fillRect(px, py, TILE, TILE);
            // ripple highlight
            const rippleX = ((frame * 3 + x * 7 + y * 5) % 12);
            gfx.fillStyle(0x50a0e0); gfx.fillRect(px + rippleX, py + 4 + (frame % 3) * 3, 3, 1);
            break;
          }
          case "path": {
            gfx.fillStyle((x + y) % 2 === 0 ? 0xc8b060 : 0xb8a050); gfx.fillRect(px, py, TILE, TILE);
            if (r < 0.15) { gfx.fillStyle(0xa09040); gfx.fillRect(px + 5, py + 5, 2, 2); }
            break;
          }
        }
      }
    }
  }

  // ─── Exit arrows ─────────────────────────────────────────────

  private drawExits(exits: Record<string, boolean>) {
    const arrowGfx = this.add.graphics();

    const drawArrow = (cx: number, cy: number, dir: string) => {
      // path-colored background
      arrowGfx.fillStyle(0xc8b060, 0.7);
      arrowGfx.fillRect(cx - TILE / 2, cy - TILE / 2, TILE, TILE);
      // arrow triangle
      arrowGfx.fillStyle(0x0f380f);
      const s = 4;
      switch (dir) {
        case "north": arrowGfx.fillTriangle(cx, cy - s, cx - s, cy + s, cx + s, cy + s); break;
        case "south": arrowGfx.fillTriangle(cx, cy + s, cx - s, cy - s, cx + s, cy - s); break;
        case "east":  arrowGfx.fillTriangle(cx + s, cy, cx - s, cy - s, cx - s, cy + s); break;
        case "west":  arrowGfx.fillTriangle(cx - s, cy, cx + s, cy - s, cx + s, cy + s); break;
      }
    };

    const positions: Record<string, [number, number][]> = {
      north: [[4, 0], [5, 0]],
      south: [[4, 9], [5, 9]],
      east:  [[9, 4], [9, 5]],
      west:  [[0, 4], [0, 5]],
    };

    for (const [dir, open] of Object.entries(exits)) {
      if (!open || !positions[dir]) continue;
      for (const [gx, gy] of positions[dir]) {
        drawArrow(gx * TILE + TILE / 2, gy * TILE + TILE / 2, dir);
      }
    }
  }

  // ─── Object sprites ──────────────────────────────────────────

  private drawObject(name: string, gx: number, gy: number) {
    const cx = gx * TILE + TILE / 2;
    const cy = gy * TILE + TILE / 2;
    const g = this.add.graphics();
    const lower = name.toLowerCase();

    if (lower.includes("mail") || lower.includes("box")) {
      // mailbox: box + flag
      g.fillStyle(0x705030); g.fillRect(cx - 3, cy - 2, 6, 7);
      g.fillStyle(0xd44040); g.fillRect(cx + 3, cy - 4, 2, 5);
      g.fillStyle(0xd44040); g.fillRect(cx + 3, cy - 4, 4, 2);
    } else if (lower.includes("door") || lower.includes("gate")) {
      // door: tall rectangle with knob
      g.fillStyle(0x8b6914); g.fillRect(cx - 4, cy - 6, 8, 12);
      g.fillStyle(0xd4af37); g.fillCircle(cx + 2, cy, 1.5);
    } else if (lower.includes("sword") || lower.includes("knife") || lower.includes("blade")) {
      // sword: diagonal with crossguard
      g.lineStyle(2, 0xc0c0c0);
      g.lineBetween(cx - 5, cy + 5, cx + 5, cy - 5);
      g.lineStyle(2, 0x8b6914);
      g.lineBetween(cx - 2, cy - 2, cx + 2, cy + 2);
    } else if (lower.includes("lamp") || lower.includes("lantern") || lower.includes("light")) {
      // lantern: circle glow on stick
      g.fillStyle(0x705030); g.fillRect(cx - 1, cy, 2, 6);
      g.fillStyle(0xe8c840); g.fillCircle(cx, cy - 1, 4);
      g.fillStyle(0xfff0a0); g.fillCircle(cx, cy - 1, 2);
    } else if (lower.includes("key")) {
      // key shape
      g.fillStyle(0xd4af37); g.fillCircle(cx - 2, cy - 2, 3);
      g.fillStyle(0x0f380f); g.fillCircle(cx - 2, cy - 2, 1.5);
      g.fillStyle(0xd4af37); g.fillRect(cx, cy - 1, 6, 2);
      g.fillStyle(0xd4af37); g.fillRect(cx + 4, cy + 1, 2, 2);
    } else if (lower.includes("bottle") || lower.includes("potion") || lower.includes("water")) {
      // bottle
      g.fillStyle(0x4080d0); g.fillRect(cx - 2, cy - 2, 4, 6);
      g.fillStyle(0x705030); g.fillRect(cx - 1, cy - 4, 2, 3);
    } else {
      // default: chest shape
      g.fillStyle(0x8b6914); g.fillRect(cx - 5, cy - 3, 10, 7);
      g.fillStyle(0xd4af37); g.fillRect(cx - 1, cy - 1, 2, 2);
      g.lineStyle(1, 0x5a3a0a); g.lineBetween(cx - 5, cy, cx + 5, cy);
    }

    // label below
    this.add.text(cx, gy * TILE + TILE + 2, name, {
      fontSize: "6px", color: "#88c070", fontFamily: "monospace",
    }).setOrigin(0.5, 0);
  }

  // ─── Player sprite ───────────────────────────────────────────

  private drawPlayer(gx: number, gy: number) {
    const cx = gx * TILE + TILE / 2;
    const cy = gy * TILE + TILE / 2;
    const g = this.add.graphics();

    // head
    g.fillStyle(0xa8e080); g.fillCircle(cx, cy - 4, 3);
    // body
    g.fillStyle(0x88c070); g.fillRect(cx - 3, cy - 1, 6, 6);
    // legs
    g.fillStyle(0x306230); g.fillRect(cx - 3, cy + 5, 2, 3);
    g.fillStyle(0x306230); g.fillRect(cx + 1, cy + 5, 2, 3);
    // eyes
    g.fillStyle(0x0f380f); g.fillRect(cx - 2, cy - 5, 1, 1);
    g.fillStyle(0x0f380f); g.fillRect(cx + 1, cy - 5, 1, 1);

    this.add.text(cx, gy * TILE + TILE + 2, "you", {
      fontSize: "6px", color: "#88c070", fontFamily: "monospace",
    }).setOrigin(0.5, 0);
  }
}
