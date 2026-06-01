"use client";

import type { Player } from "@/types/game";

const PLAYER_CFG: Record<string, {
  bg: string; border: string; text: string; avatar: string; avatarText: string;
}> = {
  red:   { bg: "rgba(229,57,53,0.08)",   border: "var(--panel-red)",   text: "var(--panel-red)",   avatar: "var(--panel-red)",   avatarText: "#fff" },
  green: { bg: "rgba(67,160,71,0.08)",   border: "var(--panel-green)", text: "var(--panel-green)", avatar: "var(--panel-green)", avatarText: "#fff" },
  white: { bg: "rgba(189,189,189,0.1)",  border: "var(--panel-white-dark)", text: "#555",          avatar: "var(--panel-white)", avatarText: "#111" },
  blue:  { bg: "rgba(30,136,229,0.08)",  border: "var(--panel-blue)",  text: "var(--panel-blue)",  avatar: "var(--panel-blue)",  avatarText: "#fff" },
};

type Props = {
  players: Player[];
  currentAnswerPlayerId?: string | null;
  correctPlayerId?: string | null;
  onResetPenalty?: (playerId: string) => void;
};

export function PlayerList({ players, currentAnswerPlayerId, correctPlayerId, onResetPenalty }: Props) {
  const active = players.filter((p) => p.status === "active");
  if (active.length === 0) {
    return (
      <p className="text-sm py-2" style={{ color: "var(--ctrl-muted)" }}>
        プレイヤーが参加していません
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {active.map((player) => {
        const cfg = PLAYER_CFG[player.color];
        const isAnswering = player.id === currentAnswerPlayerId;
        const isCorrect   = player.id === correctPlayerId;
        const isPenalized = player.penaltyRemainingTurns > 0;

        return (
          <div
            key={player.id}
            className="flex items-center gap-2.5 p-2.5 rounded-xl border-2 transition-all duration-200 relative overflow-hidden"
            style={{
              background: isAnswering ? cfg.bg : "var(--ctrl-card)",
              borderColor: isAnswering ? cfg.border : (isCorrect ? "var(--atk-success)" : "var(--ctrl-border)"),
              boxShadow: isAnswering ? `0 0 12px ${cfg.border}40` : "none",
            }}
          >
            {/* Left color stripe */}
            <div
              className="absolute left-0 top-0 bottom-0 w-1 rounded-l-xl"
              style={{ background: cfg.avatar }}
            />

            {/* Avatar */}
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center font-[family-name:var(--font-bebas-neue)] text-lg leading-none ml-1 shrink-0 border"
              style={{
                background: cfg.avatar,
                color: cfg.avatarText,
                borderColor: cfg.border,
              }}
            >
              {player.number}
            </div>

            {/* Name + score */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold truncate leading-tight" style={{ color: "var(--ctrl-text)" }}>
                {player.name}
              </p>
              <p className="text-xs leading-none mt-0.5" style={{ color: "var(--ctrl-dim)" }}>
                <span className="font-[family-name:var(--font-bebas-neue)] text-base leading-none" style={{ color: cfg.text }}>
                  {player.score}
                </span>
                {" "}枚
              </p>
            </div>

            {/* Badge */}
            {isAnswering && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0 animate-atk-pulse"
                style={{
                  background: "var(--atk-gold)",
                  borderColor: "var(--atk-gold-dark)",
                  color: "#000",
                }}
              >
                回答中
              </span>
            )}
            {isCorrect && !isAnswering && (
              <span
                className="text-[10px] font-bold px-1.5 py-0.5 rounded border shrink-0"
                style={{
                  background: "var(--atk-success)",
                  borderColor: "var(--panel-green-dark)",
                  color: "#fff",
                }}
              >
                正解
              </span>
            )}
            {isPenalized && !isAnswering && !isCorrect && (
              <div className="flex items-center gap-1 shrink-0">
                <span
                  className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                  style={{
                    background: "var(--atk-error)",
                    borderColor: "var(--panel-red-dark)",
                    color: "#fff",
                  }}
                >
                  {player.penaltyRemainingTurns}回休み
                </span>
                {onResetPenalty && (
                  <button
                    className="text-[10px] font-bold w-4 h-4 rounded flex items-center justify-center leading-none transition-all hover:brightness-110 active:scale-95"
                    style={{
                      background: "var(--atk-error)",
                      borderColor: "var(--panel-red-dark)",
                      color: "#fff",
                      border: "1px solid var(--panel-red-dark)",
                    }}
                    onClick={() => onResetPenalty(player.id)}
                  >
                    ×
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
