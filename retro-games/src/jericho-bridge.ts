const BRIDGE_URL = process.env.JERICHO_URL || "http://localhost:5001";

export interface GameState {
  observation: string;
  location: { num: number; name: string } | null;
  inventory: { num: number; name: string }[];
  objects: { num: number; name: string; parent: number }[];
  valid_actions: string[];
  info?: { score: number; moves: number };
  reward?: number;
  done?: boolean;
  max_score?: number;
}

async function call(endpoint: string, body?: Record<string, unknown>): Promise<GameState> {
  const res = await fetch(`${BRIDGE_URL}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || `Bridge error: ${res.status}`);
  }
  return res.json();
}

export async function startGame(game = "zork1"): Promise<GameState> {
  return call("/start", { game });
}

export async function step(command: string): Promise<GameState> {
  return call("/step", { command });
}

export async function saveGame(): Promise<string> {
  const res = await call("/save");
  return (res as unknown as { state: string }).state;
}

export async function loadGame(state: string): Promise<GameState> {
  return call("/load", { state });
}

export async function listGames(): Promise<string[]> {
  const res = await fetch(`${BRIDGE_URL}/games`);
  if (!res.ok) throw new Error(`Bridge error: ${res.status}`);
  const data: { games: string[] } = await res.json();
  return data.games;
}
