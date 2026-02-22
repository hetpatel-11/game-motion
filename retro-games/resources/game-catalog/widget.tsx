import { McpUseProvider, useWidget, type WidgetMetadata } from "mcp-use/react";
import React, { useState } from "react";
import "../styles.css";
import type { GameCatalogProps } from "./types";
import { propSchema } from "./types";

export const widgetMetadata: WidgetMetadata = {
  description: "Retro catalog of available text adventure games",
  props: propSchema,
  exposeAsTool: false,
  metadata: {
    prefersBorder: false,
    invoking: "Loading catalog...",
    invoked: "Catalog loaded",
  },
};

// Pixel-art genre icons as tiny SVGs
const GENRE_ICONS: Record<string, { color: string; path: string }> = {
  adventure: { color: "#d4af37", path: "M4 1L7 5H1L4 1ZM3 5H5V8H3V5Z" },      // sword
  horror:    { color: "#ff6b6b", path: "M2 2C2 1 6 1 6 2L7 5L4 7L1 5L2 2Z" },  // skull
  mystery:   { color: "#a8e080", path: "M3 0A3 3 0 016 3L5 6H3L2 3A3 3 0 013 0Z" }, // magnifier
  scifi:     { color: "#70d0e0", path: "M4 0L6 3L8 2L6 5L4 8L2 5L0 2L2 3Z" },  // star
  fantasy:   { color: "#c890ff", path: "M4 0L5 3L8 4L5 5L4 8L3 5L0 4L3 3Z" },  // sparkle
};

const HORROR_GAMES = new Set(["horror", "lurking", "theatre", "moonmist", "suspect", "deadline", "witness"]);
const SCIFI_GAMES = new Set(["planetfall", "stationfall", "hitchhike", "hhgg", "suspended", "starcross"]);
const MYSTERY_GAMES = new Set(["sherlock", "detective", "moonmist", "suspect", "deadline", "witness", "ballyhoo"]);
const FANTASY_GAMES = new Set(["enchanter", "sorcerer", "spellbrkr", "wishbringer", "beyondzo", "spirit"]);

function genreFor(game: string): string {
  const g = game.toLowerCase();
  if (HORROR_GAMES.has(g)) return "horror";
  if (SCIFI_GAMES.has(g)) return "scifi";
  if (MYSTERY_GAMES.has(g)) return "mystery";
  if (FANTASY_GAMES.has(g)) return "fantasy";
  return "adventure";
}

const GenreIcon: React.FC<{ genre: string }> = ({ genre }) => {
  const icon = GENRE_ICONS[genre] ?? GENRE_ICONS.adventure;
  return (
    <svg width={16} height={16} viewBox="0 0 8 8" style={{ imageRendering: "pixelated" }}>
      <path d={icon.path} fill={icon.color} />
    </svg>
  );
};

const GameCard: React.FC<{ name: string }> = ({ name }) => {
  const [hovered, setHovered] = useState(false);
  const genre = genreFor(name);
  return (
    <div
      style={{
        ...styles.card,
        borderColor: hovered ? "#88c070" : "#306230",
        boxShadow: hovered ? "0 0 6px #306230" : "none",
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <GenreIcon genre={genre} />
      <span style={styles.cardName}>{name}</span>
    </div>
  );
};

const GameCatalog: React.FC = () => {
  const { props, isPending } = useWidget<GameCatalogProps>();
  const { games = [] } = isPending ? {} as Partial<GameCatalogProps> : props;

  if (isPending) {
    return (
      <McpUseProvider>
        <div style={styles.shell}>
          <div style={styles.header}>
            <span style={styles.textGreen}>Loading...</span>
          </div>
          <div style={styles.body}>
            <div style={{ ...styles.textGreen, opacity: 0.5 }}>
              Scanning library...
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
          <span style={styles.textGreen}>Game Catalog</span>
          <span style={styles.textSecondary}>{games.length} games</span>
        </div>

        {/* Game grid */}
        <div style={styles.body}>
          <div style={styles.rpgBox}>
            <div style={styles.rpgBoxInner}>
              <div style={styles.grid}>
                {games.map((name) => (
                  <GameCard key={name} name={name} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={styles.footer}>
          <span style={styles.textSecondary}>
            Ask Claude to start any game
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
  body: {
    padding: 12,
    maxHeight: 400,
    overflowY: "auto" as const,
  },
  rpgBox: {
    border: "2px solid #306230",
    borderRadius: 4,
    padding: 2,
    background: "#0f0f23",
  },
  rpgBoxInner: {
    border: "1px solid #1a4a1a",
    borderRadius: 2,
    padding: 8,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))",
    gap: 6,
  },
  card: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    padding: "5px 8px",
    border: "1px solid #306230",
    borderRadius: 3,
    background: "#1a1a2e",
    cursor: "default",
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  cardName: {
    color: "#c8c8d8",
    fontSize: 11,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap" as const,
  },
  textGreen: {
    color: "#88c070",
    fontWeight: 600,
  },
  textSecondary: {
    color: "#a0a0b0",
    fontSize: 11,
  },
  footer: {
    padding: "8px 12px",
    background: "#1a1a2e",
    borderTop: "1px solid #306230",
    textAlign: "center" as const,
  },
} as const;

export default GameCatalog;
