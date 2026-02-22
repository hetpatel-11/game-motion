# Game Motion

<p align="center">
  <img src="Screenshot 2026-02-21 at 5.30.11 PM.png" alt="ZORK in ChatGPT — retro games widget" width="100%"/>
</p>

**Three MCP apps for games and learning — build custom games, play classics in chat, or turn complex topics into interactive, gamified explanations.**

---

## The three apps

| App | What it does |
|-----|----------------|
| **[game-mcp-app](./game-mcp-app)** | **Build custom games.** The model generates pixel-perfect game UIs (Pixi.js + GSAP), compiles them on the server, and a live player renders the game directly inside ChatGPT or Claude. Create and iterate on games in conversation. |
| **[retro-games](./retro-games)** | **Pre-built games in chat.** Classic text adventures (Interactive Fiction) reimagined as pixel RPG worlds. Play them right inside ChatGPT — no setup, no new tab. |
| **[gamified-learning](./gamified-learning)** | **Explain complex stuff, easily.** Turns dense topics into gamified, visual explanations. Uses Remotion for diagrams and animations so the model can teach hard concepts in an engaging, step-by-step way. |

---

## Quick links

- **game-mcp-app** — [README](./game-mcp-app/README.md) · Custom game builder (Pixi.js, live in chat)
- **retro-games** — Pre-built pixel RPG adventures in ChatGPT
- **gamified-learning** — [README](./gamified-learning/README.md) · Gamified learning with Remotion diagrams

---

## Repo layout

```
.
├── game-mcp-app/       # Build custom games (MCP server + game player widget)
├── retro-games/        # Pre-built games playable in ChatGPT
├── gamified-learning/  # Gamified explanations (Remotion diagrams + rules)
├── dist/               # Build output
└── Dockerfile
```

Each app is an [MCP](https://modelcontextprotocol.io) (or [MCP App](https://mcp-use.com)) and can be run or deployed on its own. See each app’s directory for setup and run instructions.

---

## License

MIT. See individual app directories for details.
