import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { DungeonState, DungeonPlayer, DungeonEnemy } from "../../../types";

const C = {
  bg:      "#0d0d0d",
  panel:   "#141414",
  border:  "#2a2a2a",
  text:    "#d4c5a9",
  dim:     "#6b6b6b",
  gold:    "#f59e0b",
  hp:      "#4ade80",
  hpLow:   "#f87171",
  xp:      "#818cf8",
  danger:  { safe: "#4ade80", low: "#facc15", medium: "#fb923c", high: "#f87171" },
  accent:  "#9333ea",
};

// ── Mini HP bar ───────────────────────────────────────────────────────────────
function MiniBar({ value, max, color, label }: { value: number; max: number; color: string; label: string }) {
  const ratio = Math.max(0, Math.min(1, value / max));
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      <span style={{ fontSize: 10, color: C.dim, width: 24, fontWeight: 600 }}>{label}</span>
      <div style={{ flex: 1, height: 6, background: "#1e1e1e", borderRadius: 3, overflow: "hidden" }}>
        <motion.div
          animate={{ width: `${ratio * 100}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          style={{ height: "100%", background: color, borderRadius: 3 }}
        />
      </div>
      <span style={{ fontSize: 10, color: C.dim, minWidth: 42, textAlign: "right" }}>
        {value}/{max}
      </span>
    </div>
  );
}

// ── Player stats panel ────────────────────────────────────────────────────────
function PlayerStats({ player }: { player: DungeonPlayer }) {
  const hpColor = player.hp / player.maxHp > 0.4 ? C.hp : C.hpLow;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "10px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: C.text }}>⚔️ Adventurer  Lv.{player.level}</span>
        <span style={{ fontSize: 11, color: C.gold }}>🪙 {player.gold}</span>
      </div>
      <MiniBar value={player.hp} max={player.maxHp} color={hpColor} label="HP" />
      <div style={{ marginTop: 4 }}>
        <MiniBar value={player.xp} max={player.xpToNext} color={C.xp} label="XP" />
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
        <span style={{ fontSize: 11, color: C.dim }}>ATK <span style={{ color: C.text }}>{player.attack}</span></span>
        <span style={{ fontSize: 11, color: C.dim }}>DEF <span style={{ color: C.text }}>{player.defense}</span></span>
      </div>
    </div>
  );
}

// ── Enemy card ────────────────────────────────────────────────────────────────
function EnemyCard({ enemy, isAttacking, isHit }: {
  enemy: DungeonEnemy; isAttacking: boolean; isHit: boolean;
}) {
  const ratio = Math.max(0, Math.min(1, enemy.hp / enemy.maxHp));
  const color = ratio > 0.5 ? C.hp : ratio > 0.25 ? "#facc15" : C.hpLow;
  return (
    <motion.div
      animate={
        isHit
          ? { x: [0, 10, -10, 0], filter: ["none", "brightness(4) saturate(0)", "none"] }
          : isAttacking
          ? { x: [0, -20, 0] }
          : { x: 0 }
      }
      transition={{ duration: 0.4 }}
      style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
        padding: "12px 16px", display: "flex", gap: 16, alignItems: "center" }}
    >
      <motion.div
        animate={{ y: [0, -4, 0] }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        style={{ fontSize: 52, lineHeight: 1 }}
      >
        {enemy.sprite}
      </motion.div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: C.text, marginBottom: 6 }}>
          {enemy.name}
          <span style={{ fontSize: 11, color: C.dim, marginLeft: 6 }}>ATK {enemy.attack}</span>
        </div>
        <div style={{ height: 10, background: "#1e1e1e", borderRadius: 5, overflow: "hidden", border: `1px solid ${C.border}` }}>
          <motion.div
            animate={{ width: `${ratio * 100}%` }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            style={{ height: "100%", background: color, borderRadius: 5 }}
          />
        </div>
        <div style={{ fontSize: 10, color: C.dim, marginTop: 3, textAlign: "right" }}>
          {Math.max(0, enemy.hp)}/{enemy.maxHp}
        </div>
      </div>
    </motion.div>
  );
}

// ── Room view ────────────────────────────────────────────────────────────────
function RoomView({ room }: { room: DungeonState["room"] }) {
  const danger = room.danger ?? "safe";
  const dangerColor = C.danger[danger] ?? C.dim;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "12px 14px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text }}>🗺 {room.name}</span>
        <span style={{ fontSize: 10, fontWeight: 600, color: dangerColor }}>
          ● {danger.toUpperCase()}
        </span>
      </div>
      <p style={{ fontSize: 12, color: C.dim, margin: 0, lineHeight: 1.5 }}>
        {room.description}
      </p>
      {room.exits.length > 0 && (
        <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
          {room.exits.map((exit, i) => (
            <span key={i} style={{ fontSize: 11, background: "#1e1e1e", border: `1px solid ${C.border}`,
              borderRadius: 4, padding: "2px 8px", color: C.text }}>
              ↗ {exit}
            </span>
          ))}
        </div>
      )}
      {room.items && room.items.length > 0 && (
        <div style={{ marginTop: 6, fontSize: 11, color: C.gold }}>
          Items: {room.items.join(", ")}
        </div>
      )}
    </div>
  );
}

// ── Inventory ─────────────────────────────────────────────────────────────────
function Inventory({ items }: { items: string[] }) {
  if (!items.length) return null;
  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8, padding: "8px 12px" }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: C.dim, marginBottom: 5 }}>🎒 INVENTORY</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
        {items.map((item, i) => (
          <span key={i} style={{ fontSize: 11, background: "#1e1e1e", border: `1px solid ${C.border}`,
            borderRadius: 4, padding: "3px 8px", color: C.text }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Dialog box ────────────────────────────────────────────────────────────────
function DialogBox({ message }: { message: string }) {
  const [displayed, setDisplayed] = useState("");
  const prevMsg = useRef("");

  useEffect(() => {
    if (message === prevMsg.current) return;
    prevMsg.current = message;
    setDisplayed("");
    let i = 0;
    const interval = setInterval(() => {
      i++;
      setDisplayed(message.slice(0, i));
      if (i >= message.length) clearInterval(interval);
    }, 20);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <div style={{ background: "#0a0a0a", border: `1px solid ${C.border}`,
      borderRadius: 8, padding: "10px 14px", fontFamily: "monospace",
      fontSize: 13, color: C.text, minHeight: 48 }}>
      {displayed}
      <span style={{ opacity: 0.4 }}>{displayed.length < message.length ? "▋" : ""}</span>
    </div>
  );
}

// ── Game over overlay ─────────────────────────────────────────────────────────
function GameOverOverlay({ phase }: { phase: string }) {
  if (phase !== "game_over" && phase !== "victory") return null;
  const isWin = phase === "victory";
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.85)", zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10,
        borderRadius: 10 }}
    >
      <div style={{ fontSize: 60 }}>{isWin ? "🏆" : "☠️"}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: isWin ? "#4ade80" : "#f87171",
        fontFamily: "monospace" }}>
        {isWin ? "Dungeon Cleared!" : "You Died."}
      </div>
    </motion.div>
  );
}

// ── Main DungeonCrawler ───────────────────────────────────────────────────────
export default function DungeonCrawler({ state: rawState, title }: { state: DungeonState; title?: string }) {
  const rp = rawState?.player;
  const re = rawState?.enemy;
  const rr = rawState?.room;
  const state: DungeonState = {
    player: {
      hp:       typeof rp?.hp       === "number" ? rp.hp       : 100,
      maxHp:    typeof rp?.maxHp    === "number" ? rp.maxHp    : 100,
      level:    typeof rp?.level    === "number" ? rp.level    : 1,
      xp:       typeof rp?.xp       === "number" ? rp.xp       : 0,
      xpToNext: typeof rp?.xpToNext === "number" ? rp.xpToNext : 100,
      gold:     typeof rp?.gold     === "number" ? rp.gold     : 0,
      inventory: Array.isArray(rp?.inventory) ? rp.inventory : [],
      attack:   typeof rp?.attack   === "number" ? rp.attack   : 10,
      defense:  typeof rp?.defense  === "number" ? rp.defense  : 5,
    },
    enemy: re ? {
      name:   typeof re.name   === "string" ? re.name   : "Enemy",
      hp:     typeof re.hp     === "number" ? re.hp     : 30,
      maxHp:  typeof re.maxHp  === "number" ? re.maxHp  : 30,
      sprite: typeof re.sprite === "string" ? re.sprite : "👺",
      attack: typeof re.attack === "number" ? re.attack : 8,
    } : null,
    room: {
      name:        typeof rr?.name        === "string" ? rr.name        : "Unknown Room",
      description: typeof rr?.description === "string" ? rr.description : "…",
      exits:       Array.isArray(rr?.exits) ? rr.exits : [],
      items:       Array.isArray(rr?.items) ? rr.items : [],
      danger:      rr?.danger ?? "safe",
    },
    message: typeof rawState?.message === "string" ? rawState.message : "…",
    phase:   rawState?.phase ?? "explore",
    floor:   typeof rawState?.floor === "number" ? rawState.floor : 1,
    turn:    typeof rawState?.turn  === "number" ? rawState.turn  : 1,
  };
  const [enemyHit, setEnemyHit] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const prevHp = useRef({ player: state.player.hp, enemy: state.enemy?.hp ?? 0 });

  useEffect(() => {
    const enemyNowHp = state.enemy?.hp ?? 0;
    if (state.enemy && enemyNowHp < (prevHp.current.enemy ?? Infinity)) {
      setEnemyHit(true);
      setTimeout(() => setEnemyHit(false), 400);
    }
    if (state.player.hp < prevHp.current.player) {
      setEnemyAttacking(true);
      setTimeout(() => setEnemyAttacking(false), 400);
    }
    prevHp.current = { player: state.player.hp, enemy: enemyNowHp };
  }, [state.player.hp, state.enemy?.hp]);

  return (
    <div style={{ background: `linear-gradient(180deg, #0d0d0d 0%, #0a0a0f 100%)`,
      borderRadius: 10, overflow: "hidden", fontFamily: "system-ui, sans-serif",
      position: "relative", minHeight: 400 }}>

      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
          ⚔️ {title ?? "Dungeon Crawler"}
        </span>
        <span style={{ fontSize: 11, color: C.dim }}>Floor {state.floor} · Turn {state.turn}</span>
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
        {/* Player stats */}
        <PlayerStats player={state.player} />

        {/* Enemy (if in battle) */}
        <AnimatePresence>
          {state.enemy && (
            <motion.div
              key={state.enemy.name}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
            >
              <EnemyCard enemy={state.enemy} isHit={enemyHit} isAttacking={enemyAttacking} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room view (explore phase) */}
        {state.phase === "explore" && <RoomView room={state.room} />}

        {/* Inventory */}
        <Inventory items={state.player.inventory} />

        {/* Message */}
        <DialogBox message={state.message} />
      </div>

      <GameOverOverlay phase={state.phase} />
    </div>
  );
}
