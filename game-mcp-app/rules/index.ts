export const RULE_INDEX = `# AI Game Engine — MCP Tools

Play any game against Claude directly in chat.

## Tools

- **read_me** — Call first. Returns game state format for all game types.
- **list_games** — List available game types and example prompts.
- **start_game** — Start a new game session with initial state.
- **update_game_state** — Update the game after every turn.

## Quick Start

1. Call **read_me** to get the game state format.
2. Call **start_game** with gameType and initialState JSON.
3. After every player action, call **update_game_state** with the full updated state.
4. For two-step turns (player move + CPU counter), call **update_game_state** twice.

## Supported game types

- **pokemon** — Pokemon-style turn-based battle with HP bars and move animations
- **chess** — Full chess game on an 8×8 animated board
- **dungeon** — Dungeon crawler RPG with exploration, combat, and loot
- **generic** — Any other game (tic-tac-toe, card games, trivia, etc.)
`;
