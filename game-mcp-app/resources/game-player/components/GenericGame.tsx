import React, { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import type { GenericState } from "../../../types";

const C = {
  bg:     "#0f172a",
  panel:  "#1e293b",
  border: "#334155",
  text:   "#e2e8f0",
  dim:    "#64748b",
  accent: "#7c3aed",
};

function HpBar({ hp, maxHp }: { hp: number; maxHp: number }) {
  const ratio = Math.max(0, Math.min(1, hp / maxHp));
  const color = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#facc15" : "#f87171";
  return (
    <div style={{ height: 6, background: "#0f172a", borderRadius: 3, overflow: "hidden", marginTop: 4 }}>
      <motion.div
        animate={{ width: `${ratio * 100}%` }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ height: "100%", background: color, borderRadius: 3 }}
      />
    </div>
  );
}

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
    }, 18);
    return () => clearInterval(interval);
  }, [message]);

  return (
    <div style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
      padding: "10px 14px", fontFamily: "monospace", fontSize: 13, color: C.text, minHeight: 48 }}>
      {displayed}
      <span style={{ opacity: 0.4 }}>{displayed.length < message.length ? "▋" : ""}</span>
    </div>
  );
}

export default function GenericGame({ state, title }: { state: GenericState; title?: string }) {
  const gameTitle = title ?? state.title ?? "Game";

  return (
    <div style={{ background: `linear-gradient(135deg, ${C.bg} 0%, #0c1322 100%)`,
      borderRadius: 10, overflow: "hidden", fontFamily: "system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: `1px solid ${C.border}`,
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: C.accent }}>🎮 {gameTitle}</span>
        {state.phase && (
          <span style={{ fontSize: 11, color: C.dim }}>{state.phase.replace(/_/g, " ")}</span>
        )}
      </div>

      <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Scene: emoji characters with HP bars */}
        {state.scene && state.scene.length > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {state.scene.map((char, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                style={{ background: C.panel, border: `1px solid ${C.border}`, borderRadius: 8,
                  padding: "10px 14px", flex: "1 1 120px", minWidth: 120, textAlign: "center" }}
              >
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut", delay: i * 0.3 }}
                  style={{ fontSize: 40, lineHeight: 1, marginBottom: 6 }}
                >
                  {char.sprite}
                </motion.div>
                <div style={{ fontSize: 12, fontWeight: 700, color: C.text }}>{char.name}</div>
                {char.subtitle && <div style={{ fontSize: 10, color: C.dim, marginTop: 2 }}>{char.subtitle}</div>}
                {char.hp != null && char.maxHp != null && (
                  <HpBar hp={char.hp} maxHp={char.maxHp} />
                )}
              </motion.div>
            ))}
          </div>
        )}

        {/* Description */}
        {state.description && (
          <p style={{ margin: 0, fontSize: 13, color: C.dim, lineHeight: 1.5 }}>{state.description}</p>
        )}

        {/* Key/value fields */}
        {state.fields && state.fields.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {state.fields.map((field, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: C.dim, minWidth: 60, paddingTop: 1 }}>
                  {field.label}
                </span>
                <pre style={{ margin: 0, fontSize: 12, color: field.color ?? C.text,
                  fontFamily: "monospace", whiteSpace: "pre-wrap", lineHeight: 1.5, flex: 1 }}>
                  {field.value}
                </pre>
              </div>
            ))}
          </div>
        )}

        {/* Message */}
        {state.message && <DialogBox message={state.message} />}

        {/* Available actions */}
        {state.actions && state.actions.length > 0 && (
          <div>
            <div style={{ fontSize: 10, color: C.dim, marginBottom: 5, fontWeight: 600 }}>ACTIONS</div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {state.actions.map((action, i) => (
                <div key={i} style={{ background: C.panel, border: `1px solid ${C.border}`,
                  borderRadius: 6, padding: "6px 12px", fontSize: 12, color: C.text,
                  fontFamily: "monospace", cursor: "default" }}>
                  {action}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
