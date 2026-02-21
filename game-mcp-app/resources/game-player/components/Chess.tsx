import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import type { ChessState } from "../../../types";

// ── Piece rendering ───────────────────────────────────────────────────────────
const PIECE_UNICODE: Record<string, string> = {
  wK: "♔", wQ: "♕", wR: "♖", wB: "♗", wN: "♘", wP: "♙",
  bK: "♚", bQ: "♛", bR: "♜", bB: "♝", bN: "♞", bP: "♟",
};

// Algebraic to [row, col]: a8=[0,0], h1=[7,7]
function algToRC(alg: string): [number, number] | null {
  if (!alg || alg.length < 2) return null;
  const col = alg.charCodeAt(0) - 97; // a=0
  const row = 8 - parseInt(alg[1], 10); // 8=0, 1=7
  if (col < 0 || col > 7 || row < 0 || row > 7) return null;
  return [row, col];
}

// ── Board square ─────────────────────────────────────────────────────────────
function Square({
  piece,
  light,
  isLastFrom,
  isLastTo,
  row,
  col,
}: {
  piece: string;
  light: boolean;
  isLastFrom: boolean;
  isLastTo: boolean;
  row: number;
  col: number;
}) {
  let bg = light ? "#f0d9b5" : "#b58863";
  if (isLastFrom) bg = light ? "#cdd16f" : "#aaa23a";
  if (isLastTo) bg = light ? "#cdd16f" : "#aaa23a";

  const unicode = PIECE_UNICODE[piece] ?? "";
  const isWhite = piece.startsWith("w");

  return (
    <div
      style={{
        width: "12.5%",
        paddingBottom: "12.5%",
        background: bg,
        position: "relative",
        boxSizing: "border-box",
      }}
    >
      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
        {unicode && (
          <motion.span
            initial={{ scale: 0.7, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            key={`${row}-${col}-${piece}`}
            style={{
              fontSize: "clamp(14px, 2.8vw, 32px)",
              lineHeight: 1,
              color: isWhite ? "#fff" : "#1a1a1a",
              textShadow: isWhite
                ? "0 1px 2px rgba(0,0,0,0.8), 0 0 4px rgba(0,0,0,0.4)"
                : "0 1px 2px rgba(255,255,255,0.3)",
              userSelect: "none",
              cursor: "default",
            }}
          >
            {unicode}
          </motion.span>
        )}
        {/* Rank/file labels */}
        {col === 0 && (
          <span style={{ position: "absolute", top: 2, left: 3, fontSize: 9,
            color: light ? "#b58863" : "#f0d9b5", fontWeight: 700, lineHeight: 1 }}>
            {8 - row}
          </span>
        )}
        {row === 7 && (
          <span style={{ position: "absolute", bottom: 2, right: 3, fontSize: 9,
            color: light ? "#b58863" : "#f0d9b5", fontWeight: 700, lineHeight: 1 }}>
            {String.fromCharCode(97 + col)}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Captured pieces ───────────────────────────────────────────────────────────
function CapturedPieces({ pieces, label }: { pieces: string[]; label: string }) {
  if (!pieces.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
      <span style={{ fontSize: 10, color: "#94a3b8", fontWeight: 600, minWidth: 50 }}>{label}</span>
      {pieces.map((p, i) => (
        <span key={i} style={{ fontSize: 16, lineHeight: 1 }}>{PIECE_UNICODE[p] ?? p}</span>
      ))}
    </div>
  );
}

// ── Main Chess component ──────────────────────────────────────────────────────
const INITIAL_BOARD: string[][] = [
  ["bR","bN","bB","bQ","bK","bB","bN","bR"],
  ["bP","bP","bP","bP","bP","bP","bP","bP"],
  ["","","","","","","",""],["","","","","","","",""],
  ["","","","","","","",""],["","","","","","","",""],
  ["wP","wP","wP","wP","wP","wP","wP","wP"],
  ["wR","wN","wB","wQ","wK","wB","wN","wR"],
];

export default function Chess({ state: rawState, title }: { state: ChessState; title?: string }) {
  const rawBoard = rawState?.board;
  const state: ChessState = {
    board: Array.isArray(rawBoard) && rawBoard.length === 8
      ? rawBoard.map(row => Array.isArray(row) ? row : Array(8).fill(""))
      : INITIAL_BOARD,
    turn:       rawState?.turn === "black" ? "black" : "white",
    lastMove:   rawState?.lastMove ?? null,
    check:      rawState?.check    === true,
    checkmate:  rawState?.checkmate === true,
    stalemate:  rawState?.stalemate === true,
    message:    typeof rawState?.message === "string" ? rawState.message : "Your move.",
    capturedByWhite: Array.isArray(rawState?.capturedByWhite) ? rawState.capturedByWhite : [],
    capturedByBlack: Array.isArray(rawState?.capturedByBlack) ? rawState.capturedByBlack : [],
  };
  const lastFromRC = state.lastMove ? algToRC(state.lastMove.from) : null;
  const lastToRC = state.lastMove ? algToRC(state.lastMove.to) : null;

  const isGameOver = state.checkmate || state.stalemate;
  const statusColor = state.check ? "#f87171" : state.turn === "white" ? "#f0d9b5" : "#1a1a1a";

  return (
    <div style={{
      background: "#1a1a2e",
      borderRadius: 10,
      overflow: "hidden",
      fontFamily: "system-ui, sans-serif",
    }}>
      {/* Header */}
      <div style={{ padding: "10px 16px", borderBottom: "1px solid #1e293b",
        display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#7c3aed" }}>♟ {title ?? "Chess"}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {state.check && !state.checkmate && (
            <motion.span
              animate={{ opacity: [1, 0.4, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
              style={{ fontSize: 11, fontWeight: 700, color: "#f87171" }}
            >
              CHECK!
            </motion.span>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: "50%",
              background: state.turn === "white" ? "#f0d9b5" : "#1a1a1a",
              border: "2px solid #94a3b8" }} />
            <span style={{ fontSize: 11, color: "#94a3b8" }}>
              {state.turn === "white" ? "White" : "Black"} to move
            </span>
          </div>
        </div>
      </div>

      {/* Board */}
      <div style={{ padding: "12px 12px 8px" }}>
        <div style={{ position: "relative", width: "100%", maxWidth: 440, margin: "0 auto" }}>
          <div style={{ display: "flex", flexWrap: "wrap", border: "2px solid #334155", borderRadius: 4, overflow: "hidden" }}>
            {state.board.map((row, r) =>
              row.map((piece, c) => (
                <Square
                  key={`${r}-${c}`}
                  piece={piece}
                  light={(r + c) % 2 === 0}
                  isLastFrom={!!(lastFromRC && lastFromRC[0] === r && lastFromRC[1] === c)}
                  isLastTo={!!(lastToRC && lastToRC[0] === r && lastToRC[1] === c)}
                  row={r}
                  col={c}
                />
              ))
            )}
          </div>

          {/* Game over overlay */}
          <AnimatePresence>
            {isGameOver && (
              <motion.div
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: "spring", damping: 14 }}
                style={{
                  position: "absolute", inset: 0,
                  background: "rgba(0,0,0,0.75)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexDirection: "column", gap: 8, borderRadius: 4,
                }}
              >
                <div style={{ fontSize: 48 }}>{state.checkmate ? "♚" : "🤝"}</div>
                <div style={{ fontSize: 22, fontWeight: 800, color: "#e2e8f0" }}>
                  {state.checkmate
                    ? `${state.turn === "white" ? "Black" : "White"} wins!`
                    : "Stalemate — Draw!"}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Captured + message */}
      <div style={{ padding: "4px 12px 12px", display: "flex", flexDirection: "column", gap: 6 }}>
        <CapturedPieces pieces={state.capturedByWhite ?? []} label="White took:" />
        <CapturedPieces pieces={state.capturedByBlack ?? []} label="Black took:" />

        {state.lastMove && (
          <div style={{ fontSize: 11, color: "#64748b" }}>
            Last move: {state.lastMove.from} → {state.lastMove.to}
          </div>
        )}

        <div style={{ background: "#16213e", border: "1px solid #1e293b",
          borderRadius: 8, padding: "10px 14px", fontFamily: "monospace",
          fontSize: 13, color: "#e2e8f0" }}>
          {state.message}
        </div>
      </div>
    </div>
  );
}
