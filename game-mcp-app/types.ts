export type GameType = "pokemon" | "chess" | "dungeon" | "generic";

// ── Pokemon battle ──────────────────────────────────────────────────────────
export type PokemonFighter = {
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  sprite: string; // emoji
  moves?: string[];
  status?: "poisoned" | "burned" | "paralyzed" | "frozen" | "asleep" | null;
};

export type PokemonState = {
  player: PokemonFighter;
  enemy: PokemonFighter;
  message: string;
  phase: "player_turn" | "enemy_turn" | "animating" | "victory" | "defeat";
  lastMove?: string | null;
  lastAttacker?: "player" | "enemy" | null;
  effectiveness?: "super" | "not_very" | "no_effect" | "normal" | null;
  turn: number;
};

// ── Chess ────────────────────────────────────────────────────────────────────
export type ChessState = {
  // 8x8 board. Empty = "". Pieces: "wK","wQ","wR","wB","wN","wP","bK","bQ","bR","bB","bN","bP"
  board: string[][];
  turn: "white" | "black";
  lastMove?: { from: string; to: string } | null;
  check: boolean;
  checkmate: boolean;
  stalemate: boolean;
  message: string;
  capturedByWhite: string[];
  capturedByBlack: string[];
};

// ── Dungeon crawler ──────────────────────────────────────────────────────────
export type DungeonPlayer = {
  hp: number;
  maxHp: number;
  level: number;
  xp: number;
  xpToNext: number;
  gold: number;
  inventory: string[];
  attack: number;
  defense: number;
};

export type DungeonEnemy = {
  name: string;
  hp: number;
  maxHp: number;
  sprite: string; // emoji
  attack: number;
};

export type DungeonState = {
  player: DungeonPlayer;
  enemy?: DungeonEnemy | null;
  room: {
    name: string;
    description: string;
    exits: string[];
    items?: string[];
    danger?: "safe" | "low" | "medium" | "high";
  };
  message: string;
  phase: "explore" | "battle" | "victory" | "game_over" | "loot" | "shop";
  floor: number;
  turn: number;
};

// ── Generic / custom game ────────────────────────────────────────────────────
export type GenericState = {
  title?: string;
  description?: string;
  // Key/value pairs of any game state Claude wants to display
  fields?: Array<{ label: string; value: string; color?: string }>;
  message?: string;
  actions?: string[];
  phase?: string;
  // Optional visual: emoji + label pairs for "characters" in the scene
  scene?: Array<{ sprite: string; name: string; hp?: number; maxHp?: number; subtitle?: string }>;
};

// ── Top-level wrapper ────────────────────────────────────────────────────────
export type GameState = {
  gameType: GameType;
  title?: string;
  state: PokemonState | ChessState | DungeonState | GenericState;
};
