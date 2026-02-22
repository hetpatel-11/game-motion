import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";
import { startGame, step, saveGame, loadGame, listGames, type GameState } from "./src/jericho-bridge.js";

const server = new MCPServer({
  name: "retro-games",
  title: "Retro Games",
  version: "1.0.0",
  description: "Classic text adventures as pixel RPG worlds",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  icons: [{ src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] }],
});

interface WidgetProps {
  observation: string;
  location: { num: number; name: string } | null;
  objects: { num: number; name: string; parent: number }[];
  inventory: { num: number; name: string }[];
  validActions: string[];
  score: number;
  moves: number;
  maxScore?: number;
  reward?: number;
  done: boolean;
}

function toWidgetProps(state: GameState): WidgetProps {
  return {
    observation: state.observation,
    location: state.location,
    objects: state.objects,
    inventory: state.inventory,
    validActions: state.valid_actions,
    score: state.info?.score ?? 0,
    moves: state.info?.moves ?? 0,
    maxScore: state.max_score,
    reward: state.reward,
    done: state.done ?? false,
  };
}

function formatState(state: GameState): string {
  const loc = state.location?.name ?? "Unknown";
  const objs = state.objects.map((o) => o.name).join(", ") || "nothing";
  const inv = state.inventory.map((i) => i.name).join(", ") || "empty";
  const actions = state.valid_actions;
  const exits = actions.filter((a) => ["north", "south", "east", "west", "up", "down", "northeast", "northwest", "southeast", "southwest"].includes(a)).join(", ") || "none";
  const score = state.info?.score ?? 0;
  const moves = state.info?.moves ?? 0;

  return [
    `Location: ${loc}`,
    `You see: ${objs}`,
    `Exits: ${exits}`,
    `Inventory: ${inv}`,
    `Score: ${score} | Moves: ${moves}`,
    "",
    state.observation,
  ].join("\n");
}

const GAME_WIDGET = {
  name: "game-world",
  invoking: "Loading world...",
  invoked: "World loaded",
} as const;

server.tool(
  {
    name: "start-game",
    description: "Start a new interactive fiction game and display the world",
    schema: z.object({
      game: z.string().optional().describe("Game to play (default: zork1)"),
    }),
    widget: GAME_WIDGET,
  },
  async ({ game }) => {
    const state = await startGame(game ?? "zork1");
    return widget({
      props: toWidgetProps(state),
      output: text(formatState(state)),
    });
  }
);

server.tool(
  {
    name: "act",
    description: "Perform an action in the game world",
    schema: z.object({
      command: z.string().describe("The action to perform (e.g. 'open mailbox', 'go north')"),
    }),
    widget: { ...GAME_WIDGET, invoking: "Acting...", invoked: "Action complete" },
  },
  async ({ command }) => {
    const state = await step(command);
    return widget({
      props: toWidgetProps(state),
      output: text(formatState(state)),
    });
  }
);

server.tool(
  {
    name: "valid-actions",
    description: "Get the list of valid actions at the current location",
    schema: z.object({}),
  },
  async () => {
    const state = await step("look");
    return text(state.valid_actions.join(", "));
  }
);

server.tool(
  {
    name: "save-game",
    description: "Save the current game state",
    schema: z.object({}),
  },
  async () => {
    const encoded = await saveGame();
    return text(encoded);
  }
);

server.tool(
  {
    name: "load-game",
    description: "Restore a previously saved game state",
    schema: z.object({
      state: z.string().describe("Encoded game state from save-game"),
    }),
    widget: { ...GAME_WIDGET, invoking: "Restoring...", invoked: "Game restored" },
  },
  async ({ state }) => {
    const gameState = await loadGame(state);
    return widget({
      props: toWidgetProps(gameState),
      output: text(formatState(gameState)),
    });
  }
);

server.tool(
  {
    name: "list-games",
    description: "Browse all available text adventure games",
    schema: z.object({}),
    widget: { name: "game-catalog", invoking: "Loading catalog...", invoked: "Catalog loaded" },
  },
  async () => {
    const games = await listGames();
    return widget({
      props: { games },
      output: text(games.join(", ")),
    });
  }
);

server.listen().then(() => {
  console.log("Game Motion server running");
});
