import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React, { useEffect, useRef, useState } from "react";
import Phaser from "phaser";
import "../styles.css";
import type { GameWorldProps } from "./types";
import { propSchema } from "./types";
import { createGameConfig } from "./phaser/config";

export const widgetMetadata: WidgetMetadata = {
  description: "GameBoy-style text display for interactive fiction game state",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading game world...",
    invoked: "Game world loaded",
  },
};

// Score popup that fades out
const ScorePopup: React.FC<{ reward: number }> = ({ reward }) => {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 1500);
    return () => clearTimeout(t);
  }, []);
  if (!visible || reward <= 0) return null;
  return (
    <span style={styles.scorePopup}>+{reward}</span>
  );
};

const GameWorld: React.FC = () => {
  const { props, isPending, requestDisplayMode } = useWidget<GameWorldProps>();
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [popupKey, setPopupKey] = useState(0);

  const {
    observation = "",
    location = null,
    objects = [],
    inventory = [],
    validActions = [],
    score = 0,
    moves = 0,
    maxScore,
    reward = 0,
    done = false,
  } = isPending ? {} as Partial<GameWorldProps> : props;

  const roomObjects = objects.filter(
    (o) => location && o.parent === location.num
  );

  const exits = validActions.filter((a) =>
    ["north", "south", "east", "west", "up", "down"].includes(a.toLowerCase())
  );

  // Trigger popup on reward change
  const prevReward = useRef(0);
  useEffect(() => {
    if (reward > 0 && reward !== prevReward.current) {
      setPopupKey((k) => k + 1);
    }
    prevReward.current = reward;
  }, [reward]);

  // Phaser scene data updates
  useEffect(() => {
    if (!containerRef.current || isPending) return;

    if (gameRef.current) {
      const scene = gameRef.current.scene.getScene("GameScene");
      if (scene) {
        scene.scene.restart({
          locationName: location?.name ?? "",
          observation,
          objects: roomObjects,
          validActions,
        });
      }
    } else {
      const config = createGameConfig(containerRef.current);
      const game = new Phaser.Game(config);
      game.scene.start("GameScene", {
        locationName: location?.name ?? "",
        observation,
        objects: roomObjects,
        validActions,
      });
      gameRef.current = game;
    }
  }, [observation, location?.name, JSON.stringify(roomObjects), JSON.stringify(validActions)]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  if (isPending) {
    return (
      <McpUseProvider>
        <div style={styles.shell}>
          <div style={styles.header}>
            <span style={styles.textGreen}>Loading...</span>
          </div>
          <div style={styles.screen}>
            <div style={{ ...styles.textGreen, opacity: 0.5 }}>
              Booting up...
            </div>
          </div>
        </div>
      </McpUseProvider>
    );
  }

  return (
    <McpUseProvider>
      <div style={styles.shell}>
        {/* Header */}
        <div style={styles.header}>
          <span style={styles.textGreen}>
            {location?.name ?? "Unknown"}
          </span>
          <span style={styles.headerRight}>
            <span style={styles.textSecondary}>
              Score: {score}{maxScore != null ? `/${maxScore}` : ""}
              {reward > 0 && <ScorePopup key={popupKey} reward={reward} />}
              {" "}| Moves: {moves}
            </span>
            <button
              style={styles.fullscreenBtn}
              onClick={() => requestDisplayMode("fullscreen")}
              title="Fullscreen"
            >
              &#x26F6;
            </button>
          </span>
        </div>

        {/* Phaser canvas */}
        <div
          ref={containerRef}
          style={styles.screen}
        />

        {/* Observation — RPG text box */}
        <div style={styles.rpgBox}>
          <div style={styles.rpgBoxInner}>
            <div style={styles.textBody}>{observation}</div>
          </div>
        </div>

        {/* Objects in room */}
        {roomObjects.length > 0 && (
          <div style={styles.section}>
            <div style={styles.label}>Objects:</div>
            <div style={styles.textBody}>
              {roomObjects.map((o) => o.name).join(", ")}
            </div>
          </div>
        )}

        {/* Exits */}
        {exits.length > 0 && (
          <div style={styles.section}>
            <div style={styles.label}>Exits:</div>
            <div style={styles.textBody}>{exits.join(", ")}</div>
          </div>
        )}

        {/* Inventory bar */}
        {inventory.length > 0 && (
          <div style={styles.section}>
            <div style={styles.label}>Inventory:</div>
            <div style={styles.inventoryBar}>
              {inventory.map((item) => (
                <div key={item.num} style={styles.inventorySlot}>
                  <div style={styles.inventoryIcon} />
                  <span style={styles.inventoryLabel}>{item.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Game over */}
        {done && (
          <div style={{ ...styles.section, textAlign: "center" as const }}>
            <span style={styles.gameOver}>GAME OVER</span>
          </div>
        )}

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.textSecondary}>
            Type commands in chat to play
          </span>
        </div>
      </div>
    </McpUseProvider>
  );
};

const styles = {
  shell: {
    maxWidth: 480,
    margin: "0 auto",
    background: "#0f0f23",
    fontFamily: "monospace",
    fontSize: 12,
    borderRadius: 8,
    overflow: "hidden",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#1a1a2e",
    borderBottom: "1px solid #306230",
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: 6,
  },
  screen: {
    margin: 12,
    borderRadius: 4,
    overflow: "hidden",
    border: "2px solid #0f380f",
    height: 240,
    background: "#0f380f",
  },
  section: {
    padding: "4px 12px",
  },
  rpgBox: {
    margin: "4px 12px",
    border: "2px solid #306230",
    borderRadius: 4,
    padding: 2,
    background: "#0f0f23",
  },
  rpgBoxInner: {
    border: "1px solid #1a4a1a",
    borderRadius: 2,
    padding: "6px 8px",
  },
  label: {
    color: "#88c070",
    fontSize: 11,
    fontWeight: 600,
    marginBottom: 2,
  },
  textGreen: {
    color: "#88c070",
    fontWeight: 600,
  },
  textSecondary: {
    color: "#a0a0b0",
    fontSize: 11,
  },
  textBody: {
    color: "#c8c8d8",
    lineHeight: 1.5,
  },
  scorePopup: {
    color: "#a8e080",
    fontWeight: 700,
    fontSize: 13,
    marginLeft: 4,
    animation: "fadeOut 1.5s ease-out forwards",
  },
  fullscreenBtn: {
    background: "none",
    border: "1px solid #306230",
    color: "#88c070",
    borderRadius: 3,
    padding: "1px 5px",
    cursor: "pointer",
    fontSize: 11,
    lineHeight: 1,
  },
  inventoryBar: {
    display: "flex",
    gap: 4,
    flexWrap: "wrap" as const,
    marginTop: 2,
  },
  inventorySlot: {
    display: "flex",
    alignItems: "center",
    gap: 3,
    border: "1px solid #306230",
    borderRadius: 2,
    padding: "2px 6px",
    background: "#1a1a2e",
  },
  inventoryIcon: {
    width: 8,
    height: 8,
    background: "#d4af37",
    borderRadius: 1,
    flexShrink: 0,
  },
  inventoryLabel: {
    color: "#c8c8d8",
    fontSize: 10,
  },
  gameOver: {
    color: "#ff6b6b",
    fontSize: 16,
    fontWeight: 700,
    letterSpacing: 2,
  },
  footer: {
    padding: "8px 12px",
    background: "#1a1a2e",
    borderTop: "1px solid #306230",
    textAlign: "center" as const,
    marginTop: 8,
  },
} as const;

export default GameWorld;
