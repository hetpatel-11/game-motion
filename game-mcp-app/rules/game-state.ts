export const RULE_GAME_STATE = `
# AI Game Engine — How to Use

You play as the CPU opponent in any game. Use the tools below in order.

## TOOL ORDER
1. read_me — you are doing this now
2. start_game — choose gameType, write initialState JSON
3. update_game_state — call after EVERY turn (player move + CPU response = 2 calls)

## GAME TYPES

### gameType: "pokemon"
Pokemon FireRed-style battle. Widget renders HP bars, sprites, move buttons, dialog.

initialState shape:
{
  "player": {
    "name": "Pikachu",
    "level": 50,
    "hp": 35,
    "maxHp": 35,
    "moves": ["Thunderbolt", "Quick Attack", "Iron Tail", "Volt Tackle"]
  },
  "enemy": {
    "name": "Charizard",
    "level": 50,
    "hp": 78,
    "maxHp": 78
  },
  "phase": "player_turn",
  "message": "A wild CHARIZARD appeared!"
}

phase values: "player_turn" | "enemy_turn" | "game_over"
Set winner: "player" or "enemy" when phase is "game_over".
Always include all 4 moves in player.moves.

### gameType: "chess"
Full chess game. Widget renders 8x8 board with unicode pieces, highlights, status.

initialState shape:
{
  "board": [
    ["bR","bN","bB","bQ","bK","bB","bN","bR"],
    ["bP","bP","bP","bP","bP","bP","bP","bP"],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    [null,null,null,null,null,null,null,null],
    ["wP","wP","wP","wP","wP","wP","wP","wP"],
    ["wR","wN","wB","wQ","wK","wB","wN","wR"]
  ],
  "turn": "white",
  "message": "Your turn. You play White.",
  "lastMove": null,
  "inCheck": false,
  "gameOver": false
}

Piece codes: wK wQ wR wB wN wP (white) | bK bQ bR bB bN bP (black)
board[0] = rank 8 (black back rank), board[7] = rank 1 (white back rank)
lastMove: {"from": [row, col], "to": [row, col]} or null

### gameType: "sudoku"
9x9 Sudoku puzzle. Widget renders the grid, highlights selected cell and errors.

initialState shape:
{
  "board": [
    [{"value":5,"given":true,"error":false},{"value":3,"given":true,"error":false},{"value":0,"given":false,"error":false},...],
    ...9 rows of 9 cells
  ],
  "selected": null,
  "message": "Fill in the grid. Each row, column, and 3x3 box must contain 1-9.",
  "solved": false
}

given:true = pre-filled clue (grey, cannot change)
given:false, value>0 = player-entered number (blue)
error:true = conflicts with another cell in same row/col/box (red)
When player says "put 7 in row 3 col 5": update that cell, check for errors, update message.
When all cells filled with no errors: set solved:true.

### gameType: "generic"
Flexible renderer for any other game (blackjack, trivia, RPG, etc.)

initialState shape:
{
  "message": "Welcome! The dealer has a 7 showing.",
  "scene": "🃏 Your hand: A♠ K♥ (21)",
  "fields": [
    {"label": "Your Hand", "value": "A♠ K♥ = 21"},
    {"label": "Dealer", "value": "7♦ [hidden]"},
    {"label": "Bet", "value": "$50"}
  ],
  "actions": ["Hit", "Stand", "Double Down"],
  "phase": "player_turn"
}

All fields are optional except message. Use scene for a big visual text display.
actions list shows what the player can do right now.

## CPU BEHAVIOR
- After player's move: compute result, call update_game_state with updated state
- Then compute CPU counter-move, call update_game_state again
- Always include a clear message describing what happened
- For Pokemon: use real damage formulas with type effectiveness
- For chess: play at a reasonable skill level, describe your move
- For sudoku: you fill in numbers when asked, check for validity

## IMPORTANT
- Always pass the COMPLETE state object, not just changed fields
- message field should always describe what just happened or what the player should do
- phase should always reflect whose turn it is
`;
