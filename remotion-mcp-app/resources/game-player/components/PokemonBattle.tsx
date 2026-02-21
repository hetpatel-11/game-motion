import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { PokemonState, PokemonFighter } from "../../../types";

// ── Colours ──────────────────────────────────────────────────────────────────
const C = {
  bg:       "#1a1a2e",
  panel:    "#16213e",
  panelAlt: "#0f3460",
  border:   "#e94560",
  hpGreen:  "#4ade80",
  hpYellow: "#facc15",
  hpRed:    "#f87171",
  text:     "#e2e8f0",
  textDim:  "#94a3b8",
  accent:   "#7c3aed",
  super:    "#fbbf24",
  notVery:  "#60a5fa",
  noEffect: "#6b7280",
  white:    "#fff",
};

function hpColor(ratio: number) {
  if (ratio > 0.5) return C.hpGreen;
  if (ratio > 0.25) return C.hpYellow;
  return C.hpRed;
}

function effectivenessText(e?: string | null) {
  if (e === "super")    return { text: "It's super effective!", color: C.super };
  if (e === "not_very") return { text: "It's not very effective…", color: C.notVery };
  if (e === "no_effect") return { text: "It had no effect.", color: C.noEffect };
  return null;
}

// ── HP Bar ───────────────────────────────────────────────────────────────────
function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  return (
    <div style={{ width: "100%", height: 10, background: "#1e293b", borderRadius: 5, overflow: "hidden", border: "1px solid #334155" }}>
      <motion.div
        animate={{ width: `${ratio * 100}%` }}
        transition={{ duration: 0.7, ease: [0.25, 0.1, 0.25, 1] }}
        style={{ height: "100%", borderRadius: 5, background: hpColor(ratio) }}
      />
    </div>
  );
}

// ── Fighter stat card ────────────────────────────────────────────────────────
function FighterCard({
  fighter,
  side,
  isAttacking,
  isFainting,
}: {
  fighter: PokemonFighter;
  side: "player" | "enemy";
  isAttacking: boolean;
  isFainting: boolean;
}) {
  const hp = Math.max(0, fighter.hp);
  return (
    <motion.div
      animate={
        isFainting
          ? { opacity: 0, y: 20 }
          : isAttacking
          ? side === "player"
            ? { x: [0, 18, 0] }
            : { x: [0, -18, 0] }
          : { opacity: 1, y: 0, x: 0 }
      }
      transition={isFainting ? { duration: 0.6 } : { duration: 0.3 }}
      style={{
        background: C.panel,
        border: `1px solid #334155`,
        borderRadius: 10,
        padding: "10px 14px",
        minWidth: 190,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.text, letterSpacing: 0.5 }}>
          {fighter.name}
        </span>
        <span style={{ fontSize: 11, color: C.textDim }}>Lv.{fighter.level}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: C.textDim, width: 18 }}>HP</span>
        <HpBar hp={hp} maxHp={fighter.maxHp} />
      </div>
      <div style={{ fontSize: 11, color: C.textDim, textAlign: "right" }}>
        {hp}/{fighter.maxHp}
        {fighter.status && (
          <span style={{ marginLeft: 6, color: "#fb923c", fontWeight: 600 }}>
            [{fighter.status.toUpperCase()}]
          </span>
        )}
      </div>
    </motion.div>
  );
}

// ── Sprite ───────────────────────────────────────────────────────────────────
function Sprite({
  emoji,
  side,
  isAttacking,
  isFainting,
  isHit,
}: {
  emoji: string;
  side: "player" | "enemy";
  isAttacking: boolean;
  isFainting: boolean;
  isHit: boolean;
}) {
  return (
    <motion.div
      animate={
        isFainting
          ? { opacity: 0, y: 30, scale: 0.7 }
          : isHit
          ? { x: [0, side === "player" ? -8 : 8, 0], filter: ["none", "brightness(3) saturate(0)", "none"] }
          : isAttacking
          ? side === "player"
            ? { x: [0, 30, 0] }
            : { x: [0, -30, 0] }
          : {
              y: [0, -6, 0],
              transition: { duration: 2, repeat: Infinity, ease: "easeInOut" },
            }
      }
      transition={isFainting ? { duration: 0.6 } : isHit ? { duration: 0.4 } : { duration: 0.35 }}
      style={{ fontSize: side === "enemy" ? 80 : 64, lineHeight: 1, userSelect: "none" }}
    >
      {emoji}
    </motion.div>
  );
}

// ── Dialog box ───────────────────────────────────────────────────────────────
function DialogBox({ message, effectiveness }: { message: string; effectiveness?: string | null }) {
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
    }, 22);
    return () => clearInterval(interval);
  }, [message]);

  const eff = effectivenessText(effectiveness);

  return (
    <div
      style={{
        background: C.panel,
        border: `2px solid #334155`,
        borderRadius: 10,
        padding: "12px 16px",
        minHeight: 56,
        fontFamily: "monospace",
        fontSize: 14,
        color: C.text,
        position: "relative",
      }}
    >
      {eff && (
        <div style={{ fontSize: 12, fontWeight: 700, color: eff.color, marginBottom: 4 }}>
          {eff.text}
        </div>
      )}
      <span>{displayed}</span>
      <span style={{ opacity: 0.4 }}>{displayed.length < message.length ? "▋" : ""}</span>
    </div>
  );
}

// ── Move buttons ─────────────────────────────────────────────────────────────
function MoveButtons({ moves, disabled }: { moves: string[]; disabled: boolean }) {
  const displayMoves = moves.slice(0, 4);
  while (displayMoves.length < 4) displayMoves.push("—");

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {displayMoves.map((move, i) => (
        <motion.div
          key={i}
          whileHover={disabled || move === "—" ? {} : { scale: 1.03, background: "#1e3a5f" }}
          whileTap={disabled || move === "—" ? {} : { scale: 0.97 }}
          style={{
            background: move === "—" ? "#1e293b" : C.panelAlt,
            border: `1px solid ${move === "—" ? "#1e293b" : "#334155"}`,
            borderRadius: 8,
            padding: "10px 14px",
            cursor: disabled || move === "—" ? "default" : "pointer",
            fontFamily: "monospace",
            fontSize: 13,
            fontWeight: 600,
            color: move === "—" ? "#334155" : C.text,
            textAlign: "center",
            opacity: disabled ? 0.5 : 1,
          }}
        >
          {move}
        </motion.div>
      ))}
    </div>
  );
}

// ── Flash overlay (attack effect) ────────────────────────────────────────────
function AttackFlash({ trigger }: { trigger: number }) {
  const [visible, setVisible] = useState(false);
  const prevTrigger = useRef(0);

  useEffect(() => {
    if (trigger !== prevTrigger.current && trigger > 0) {
      prevTrigger.current = trigger;
      setVisible(true);
      const t = setTimeout(() => setVisible(false), 160);
      return () => clearTimeout(t);
    }
  }, [trigger]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0.7 }}
          animate={{ opacity: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
          style={{
            position: "absolute", inset: 0, background: "#fff",
            pointerEvents: "none", borderRadius: 10, zIndex: 10,
          }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Victory / Defeat overlay ─────────────────────────────────────────────────
function ResultOverlay({ phase }: { phase: string }) {
  if (phase !== "victory" && phase !== "defeat") return null;
  const isVictory = phase === "victory";
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.7 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", damping: 14, stiffness: 200 }}
      style={{
        position: "absolute", inset: 0,
        background: isVictory ? "rgba(74,222,128,0.18)" : "rgba(248,113,113,0.18)",
        borderRadius: 10, zIndex: 20,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexDirection: "column", gap: 8,
      }}
    >
      <div style={{ fontSize: 56 }}>{isVictory ? "🏆" : "💀"}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: isVictory ? C.hpGreen : C.hpRed,
        textShadow: "0 2px 16px rgba(0,0,0,0.5)", fontFamily: "monospace" }}>
        {isVictory ? "Victory!" : "Defeated!"}
      </div>
    </motion.div>
  );
}

// ── Main Pokemon Battle component ─────────────────────────────────────────────
export default function PokemonBattle({ state: rawState, title }: { state: PokemonState; title?: string }) {
  // Guard against malformed state
  const state: PokemonState = {
    player: rawState?.player ?? { name: "???", hp: 0, maxHp: 1, level: 1, sprite: "❓", moves: [] },
    enemy:  rawState?.enemy  ?? { name: "???", hp: 0, maxHp: 1, level: 1, sprite: "❓" },
    message: rawState?.message ?? "…",
    phase: rawState?.phase ?? "player_turn",
    lastMove: rawState?.lastMove,
    lastAttacker: rawState?.lastAttacker,
    effectiveness: rawState?.effectiveness,
    turn: rawState?.turn ?? 1,
  };
  const [flashCount, setFlashCount] = useState(0);
  const [playerAttacking, setPlayerAttacking] = useState(false);
  const [enemyAttacking, setEnemyAttacking] = useState(false);
  const [playerHit, setPlayerHit] = useState(false);
  const [enemyHit, setEnemyHit] = useState(false);
  const prevAttacker = useRef<string | null>(null);
  const prevMove = useRef<string | null>(null);

  useEffect(() => {
    const moveChanged = state.lastMove !== prevMove.current;
    const attackerChanged = state.lastAttacker !== prevAttacker.current;

    if (moveChanged || attackerChanged) {
      prevMove.current = state.lastMove ?? null;
      prevAttacker.current = state.lastAttacker ?? null;

      if (!state.lastAttacker) return;

      if (state.lastAttacker === "player") {
        setPlayerAttacking(true);
        setTimeout(() => {
          setPlayerAttacking(false);
          setEnemyHit(true);
          setFlashCount((n) => n + 1);
          setTimeout(() => setEnemyHit(false), 400);
        }, 350);
      } else {
        setEnemyAttacking(true);
        setTimeout(() => {
          setEnemyAttacking(false);
          setPlayerHit(true);
          setFlashCount((n) => n + 1);
          setTimeout(() => setPlayerHit(false), 400);
        }, 350);
      }
    }
  }, [state.lastMove, state.lastAttacker]);

  const playerFainted = state.player.hp <= 0;
  const enemyFainted = state.enemy.hp <= 0;
  const isOver = state.phase === "victory" || state.phase === "defeat";
  const isPlayerTurn = state.phase === "player_turn";

  return (
    <div style={{
      background: `linear-gradient(135deg, ${C.bg} 0%, #0f172a 100%)`,
      borderRadius: 10, overflow: "hidden", fontFamily: "system-ui, sans-serif",
      position: "relative", minHeight: 480,
    }}>
      <AttackFlash trigger={flashCount} />

      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid #1e293b`,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>
          ⚔️ {title ?? "Pokemon Battle"}
        </span>
        <span style={{ fontSize: 11, color: C.textDim }}>Turn {state.turn}</span>
      </div>

      {/* Battle arena */}
      <div style={{ padding: "16px 20px", display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Enemy row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <FighterCard fighter={state.enemy} side="enemy" isAttacking={enemyAttacking} isFainting={enemyFainted} />
          <Sprite emoji={state.enemy.sprite} side="enemy" isAttacking={enemyAttacking} isFainting={enemyFainted} isHit={enemyHit} />
        </div>

        {/* Player row */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
          <Sprite emoji={state.player.sprite} side="player" isAttacking={playerAttacking} isFainting={playerFainted} isHit={playerHit} />
          <FighterCard fighter={state.player} side="player" isAttacking={playerAttacking} isFainting={playerFainted} />
        </div>

        {/* Dialog box */}
        <DialogBox message={state.message} effectiveness={state.effectiveness} />

        {/* Move buttons */}
        {!isOver && (
          <div>
            <div style={{ fontSize: 11, color: C.textDim, marginBottom: 6, fontWeight: 600 }}>
              {isPlayerTurn ? "▶ YOUR MOVE" : "⏳ WAITING…"}
            </div>
            <MoveButtons
              moves={state.player.moves ?? ["Attack", "Item", "Pokemon", "Run"]}
              disabled={!isPlayerTurn}
            />
          </div>
        )}
      </div>

      {/* Victory/Defeat overlay */}
      <ResultOverlay phase={state.phase} />
    </div>
  );
}
