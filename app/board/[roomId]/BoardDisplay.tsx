"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useQuestionDisplayText } from "@/hooks/useQuestionDisplayText";
import { PanelGrid } from "@/app/components/PanelGrid";
import type { QuestionState } from "@/types/game";

type Props = { roomId: string };

const SCORE_CARD: Record<
  string,
  { bg: string; border: string; text: string; accent: string }
> = {
  red: {
    bg: "var(--panel-red)",
    border: "var(--panel-red-dark)",
    text: "#fff",
    accent: "#ffaaaa",
  },
  green: {
    bg: "var(--panel-green)",
    border: "var(--panel-green-dark)",
    text: "#fff",
    accent: "#aaffcc",
  },
  white: {
    bg: "var(--panel-white)",
    border: "var(--panel-white-dark)",
    text: "#111",
    accent: "#555",
  },
  blue: {
    bg: "var(--panel-blue)",
    border: "var(--panel-blue-dark)",
    text: "#fff",
    accent: "#aad4ff",
  },
};

export function BoardDisplay({ roomId }: Props) {
  const { socket, gameState, setGameState, connected } = useSocket(roomId);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || joined) return;
    socket.emit("join_room_as_board", { roomId }, (result) => {
      if (result.ok) {
        setGameState(result.gameState);
        setJoined(true);
      } else setError("ルームが見つかりません");
    });
  }, [connected, joined, roomId, socket, setGameState]);

  useEffect(() => {
    socket.on("room_not_found", () => setError("ルームが見つかりません"));
    return () => {
      socket.off("room_not_found");
    };
  }, [socket]);

  /* ── States ── */
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--atk-orange)" }}
      >
        <p className="text-2xl font-black text-white">{error}</p>
      </div>
    );
  }

  if (!joined || !gameState) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-4"
        style={{ background: "var(--atk-orange)" }}
      >
        <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin" />
        <p className="font-bold text-white">接続中...</p>
      </div>
    );
  }

  const q = gameState.currentQuestion;
  const activePlayers = gameState.players.filter((p) => p.status === "active");
  const currentAnswerer = gameState.players.find(
    (p) => p.id === q.currentAnswerPlayerId,
  );

  const STATUS_CFG: Record<
    string,
    { label: string; bg: string; color: string; anim?: string }
  > = {
    waiting: { label: "待機中", bg: "rgba(0,0,0,0.25)", color: "#fff" },
    open: {
      label: "回答受付中",
      bg: "#43a047",
      color: "#fff",
      anim: "animate-atk-flicker",
    },
    answering: {
      label: "回答中",
      bg: "var(--atk-gold)",
      color: "#000",
      anim: "animate-atk-pulse",
    },
    judged: { label: "判定済み", bg: "var(--panel-blue)", color: "#fff" },
  };
  const sc = STATUS_CFG[q.status];

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-6 gap-5 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 120% 80% at 50% 100%, var(--atk-orange-deep) 0%, var(--atk-orange) 35%, var(--atk-orange-light) 80%)`,
      }}
    >
      {/* Subtle vertical stripe texture */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 40px)",
        }}
      />

      {/* ── Title ── */}
      <div className="relative flex flex-col items-center gap-2">
        <h1
          className="font-[family-name:var(--font-bebas-neue)] leading-none tracking-widest drop-shadow-lg"
          style={{
            fontSize: "clamp(48px, 8vw, 96px)",
            color: "#fff",
            textShadow:
              "0 4px 12px rgba(0,0,0,0.35), 0 0 40px var(--atk-gold-glow)",
            WebkitTextStroke: "1px rgba(0,0,0,0.1)",
          }}
        >
          ATTACK{" "}
          <span
            style={{
              color: "var(--atk-gold)",
              textShadow:
                "0 4px 12px rgba(0,0,0,0.4), 0 0 60px var(--atk-gold-glow)",
            }}
          >
            25
          </span>
        </h1>

        {/* Status + answerer row */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <span
            className={`px-5 py-1.5 rounded-full text-sm font-black tracking-wide shadow-md ${sc.anim ?? ""}`}
            style={{ background: sc.bg, color: sc.color }}
          >
            {sc.label}
          </span>
          {currentAnswerer && (
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-white/90 text-gray-900 shadow-md animate-atk-slide-up">
              {currentAnswerer.name}&nbsp;
              <span className="font-normal text-gray-600">が回答中</span>
            </span>
          )}
        </div>
      </div>

      <BoardQuestionDisplay q={q} />

      {/* ── Panel board with gold frame ── */}
      <div
        className="relative rounded-2xl p-1"
        style={{
          width: "min(90vw, 560px)",
          background: "var(--atk-gold)",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.4), 0 0 0 4px var(--atk-gold-dark), inset 0 2px 0 rgba(255,255,255,0.3)",
        }}
      >
        {/* Inner white mat */}
        <div className="rounded-xl p-2" style={{ background: "#fff" }}>
          <PanelGrid
            panels={gameState.panels}
            players={gameState.players}
            interactive={false}
          />
        </div>

        {/* Corner decorations */}
        {["top-left", "top-right", "bottom-left", "bottom-right"].map((pos) => (
          <div
            key={pos}
            className={`absolute w-5 h-5 rounded-full border-2 border-[var(--atk-gold-dark)] bg-white
              ${pos.includes("top") ? "-top-2.5" : "-bottom-2.5"}
              ${pos.includes("left") ? "-left-2.5" : "-right-2.5"}
            `}
          />
        ))}
      </div>

      {/* ── Scoreboard ── */}
      {activePlayers.length > 0 && (
        <div className="flex gap-3 flex-wrap justify-center">
          {activePlayers.map((player) => {
            const card = SCORE_CARD[player.color];
            const isActive = player.id === q.currentAnswerPlayerId;
            return (
              <div
                key={player.id}
                className="flex items-center gap-2.5 px-5 py-3 rounded-2xl border-2 shadow-lg transition-all duration-300 relative overflow-hidden"
                style={{
                  background: card.bg,
                  borderColor: card.border,
                  color: card.text,
                  transform: isActive ? "scale(1.1)" : "scale(1)",
                  boxShadow: isActive
                    ? `0 0 0 3px var(--atk-gold), 0 8px 24px rgba(0,0,0,0.3)`
                    : "0 4px 12px rgba(0,0,0,0.2)",
                }}
              >
                {/* Shine */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      "linear-gradient(135deg, rgba(255,255,255,0.2) 0%, transparent 50%)",
                  }}
                />
                <span className="font-black text-sm relative">
                  {player.name}
                </span>
                <span
                  className="font-[family-name:var(--font-bebas-neue)] leading-none relative"
                  style={{ fontSize: "clamp(32px, 5vw, 52px)" }}
                >
                  {player.score}
                </span>
                <span className="text-xs opacity-70 relative">枚</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BoardQuestionDisplay({ q }: { q: QuestionState }) {
  const { displayText, isTyping, isStopped } = useQuestionDisplayText(q);

  return (
    <div
      className="relative w-full rounded-2xl border-2 px-6 py-4 shadow-2xl"
      style={{
        maxWidth: "min(92vw, 860px)",
        background: "rgba(255,255,255,0.92)",
        borderColor: "var(--atk-gold)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-black tracking-[0.3em] uppercase text-gray-500">
          Question
        </p>
        {isStopped && (
          <span className="text-xs font-black px-3 py-1 rounded-full bg-[var(--atk-gold)] text-black">
            早押し
          </span>
        )}
      </div>
      <p
        className="min-h-16 font-black leading-relaxed text-gray-950 whitespace-pre-wrap"
        style={{ fontSize: "clamp(22px, 3.2vw, 38px)" }}
      >
        {displayText || "問題を待っています"}
        {isTyping && <span className="animate-atk-pulse">▌</span>}
      </p>
    </div>
  );
}
