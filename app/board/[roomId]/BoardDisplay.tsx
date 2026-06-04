"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useQuestionDisplayText } from "@/hooks/useQuestionDisplayText";
import { useAnswerTimer } from "@/hooks/useAnswerTimer";
import { PanelGrid } from "@/app/components/PanelGrid";
import type { QuestionState } from "@/types/game";
import { getValidPlacementPanelNumbers } from "@/types/panel-flip";

type Props = { roomId: string };

const PODIUM_CFG: Record<
  string,
  { bg: string; bgDark: string; bgLight: string; text: string; glowColor: string }
> = {
  red: {
    bg: "var(--panel-red)",
    bgDark: "var(--panel-red-dark)",
    bgLight: "var(--panel-red-light)",
    text: "#fff",
    glowColor: "rgba(211, 47, 47, 0.5)",
  },
  green: {
    bg: "var(--panel-green)",
    bgDark: "var(--panel-green-dark)",
    bgLight: "var(--panel-green-light)",
    text: "#fff",
    glowColor: "rgba(46, 125, 50, 0.5)",
  },
  white: {
    bg: "var(--panel-white)",
    bgDark: "var(--panel-white-dark)",
    bgLight: "var(--panel-white-light)",
    text: "#222",
    glowColor: "rgba(207, 216, 220, 0.5)",
  },
  blue: {
    bg: "var(--panel-blue)",
    bgDark: "var(--panel-blue-dark)",
    bgLight: "var(--panel-blue-light)",
    text: "#fff",
    glowColor: "rgba(21, 101, 192, 0.5)",
  },
};

export function BoardDisplay({ roomId }: Props) {
  const { socket, gameState, setGameState, connected } = useSocket(roomId);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const { secondsLeft, isTimeUp, isPaused } = useAnswerTimer(
    gameState?.currentQuestion ?? null,
  );

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

  useEffect(() => {
    socket.on("question_answer_updated", ({ roomId: updatedRoomId, answer }) => {
      if (updatedRoomId === roomId) setCurrentAnswer(answer);
    });
    return () => {
      socket.off("question_answer_updated");
    };
  }, [roomId, socket]);

  /* ── Finished ── */
  if (gameState?.status === "finished") {
    const ranked = [...gameState.players]
      .filter((p) => p.status === "active")
      .sort((a, b) => b.score - a.score);
    const winner = ranked[0];
    const PODIUM_COLORS: Record<string, string> = {
      red: "var(--panel-red)",
      green: "var(--panel-green)",
      white: "#9ca3af",
      blue: "var(--panel-blue)",
    };
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden"
        style={{
          background: `radial-gradient(ellipse 120% 80% at 50% 100%, var(--atk-orange-deep) 0%, var(--atk-orange) 35%, var(--atk-orange-light) 80%)`,
        }}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage:
              "repeating-linear-gradient(90deg, rgba(255,200,100,0.07) 0px, rgba(255,200,100,0.07) 3px, transparent 3px, transparent 50px)",
          }}
        />
        <div className="relative z-10 flex flex-col items-center gap-8 p-8 w-full max-w-2xl">
          <h1
            className="font-[family-name:var(--font-bebas-neue)] leading-none tracking-widest text-center"
            style={{
              fontSize: "clamp(48px, 8vw, 96px)",
              color: "#fff",
              textShadow: "0 4px 12px rgba(0,0,0,0.35), 0 0 60px var(--atk-gold-glow)",
            }}
          >
            ATTACK <span style={{ color: "var(--atk-gold)" }}>25</span>
          </h1>
          <p
            className="font-[family-name:var(--font-bebas-neue)] tracking-[0.3em]"
            style={{
              fontSize: "clamp(20px, 3vw, 32px)",
              color: "var(--atk-gold)",
              textShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            GAME SET
          </p>
          {winner && (
            <div
              className="px-8 py-4 rounded-3xl text-center shadow-2xl"
              style={{
                background: PODIUM_COLORS[winner.color] ?? "var(--atk-gold)",
                boxShadow: `0 0 40px ${PODIUM_COLORS[winner.color] ?? "var(--atk-gold)"}80, 0 8px 24px rgba(0,0,0,0.4)`,
              }}
            >
              <p className="text-white/80 font-bold text-sm tracking-widest uppercase mb-1">
                Winner
              </p>
              <p
                className="font-[family-name:var(--font-bebas-neue)] leading-none text-white"
                style={{ fontSize: "clamp(36px, 6vw, 64px)" }}
              >
                {winner.name}
              </p>
              <p
                className="font-[family-name:var(--font-bebas-neue)] text-white/90"
                style={{ fontSize: "clamp(28px, 4vw, 48px)" }}
              >
                {winner.score} パネル
              </p>
            </div>
          )}
          <div className="w-full space-y-3">
            {ranked.map((player, i) => (
              <div
                key={player.id}
                className="flex items-center gap-4 px-5 py-3 rounded-2xl"
                style={{
                  background: "rgba(255,255,255,0.15)",
                  border: "1px solid rgba(255,255,255,0.25)",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span
                  className="font-[family-name:var(--font-bebas-neue)] text-3xl leading-none w-8 text-center"
                  style={{ color: i === 0 ? "var(--atk-gold)" : "rgba(255,255,255,0.5)" }}
                >
                  {i + 1}
                </span>
                <div
                  className="w-4 h-4 rounded-full shrink-0"
                  style={{ background: PODIUM_COLORS[player.color] ?? "#fff" }}
                />
                <span className="flex-1 font-black text-white text-lg truncate">
                  {player.name}
                </span>
                <span
                  className="font-[family-name:var(--font-bebas-neue)] text-2xl"
                  style={{ color: i === 0 ? "var(--atk-gold)" : "#fff" }}
                >
                  {player.score}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

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
  const panelOperationPlayer = gameState.players.find(
    (p) => p.id === gameState.selectedPlayerIdForPanelOperation,
  );
  const isAttackChance = q.isAttackChance;
  const isAcRemovalPending = gameState.attackChancePanelRemovalPending;

  const showValidMoves =
    gameState.panelOperationMode === "set_owner" &&
    gameState.selectedPlayerIdForPanelOperation !== null;
  const validPanelNumbers = isAcRemovalPending
    ? gameState.panels
        .filter((p) => p.ownerPlayerId !== null)
        .map((p) => p.number)
    : showValidMoves
      ? getValidPlacementPanelNumbers(
          gameState.panels,
          gameState.selectedPlayerIdForPanelOperation!,
        )
      : undefined;
  const STATUS_CFG: Record<
    string,
    { label: string; bg: string; color: string; anim?: string }
  > = {
    waiting: { label: isAttackChance ? "アタックチャンス待機" : "待機中", bg: isAttackChance ? "rgba(139,0,0,0.5)" : "rgba(0,0,0,0.25)", color: "#fff" },
    open: {
      label: isAttackChance ? "アタックチャンス！" : "回答受付中",
      bg: isAttackChance ? "rgba(139,0,0,0.7)" : "#43a047",
      color: "#fff",
      anim: isAttackChance ? "animate-atk-ac-flash" : "animate-atk-flicker",
    },
    answering: {
      label: isAttackChance ? "アタックチャンス — 回答中" : "回答中",
      bg: isAttackChance ? "rgba(180,0,0,0.75)" : "var(--atk-gold)",
      color: isAttackChance ? "#fff" : "#000",
      anim: "animate-atk-pulse",
    },
    judged: { label: isAcRemovalPending ? "AC — パネル消去フェーズ" : "判定済み", bg: isAcRemovalPending ? "rgba(139,0,0,0.7)" : "var(--panel-blue)", color: "#fff", anim: isAcRemovalPending ? "animate-atk-pulse" : undefined },
  };
  const sc = STATUS_CFG[q.status];

  return (
    <div
      className="h-screen flex flex-col items-center relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 120% 80% at 50% 100%, var(--atk-orange-deep) 0%, var(--atk-orange) 35%, var(--atk-orange-light) 80%)`,
      }}
    >
      {/* Decorative vertical stripe columns on sides */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,200,100,0.07) 0px, rgba(255,200,100,0.07) 3px, transparent 3px, transparent 50px)",
        }}
      />

      {/* Decorative side pillars */}
      <div className="absolute left-0 top-0 bottom-0 w-[8vw] pointer-events-none"
        style={{
          background: "linear-gradient(90deg, rgba(234,88,12,0.4) 0%, transparent 100%)",
        }}
      />
      <div className="absolute right-0 top-0 bottom-0 w-[8vw] pointer-events-none"
        style={{
          background: "linear-gradient(-90deg, rgba(234,88,12,0.4) 0%, transparent 100%)",
        }}
      />

      {/* ── Attack Chance dramatic overlay ── */}
      {isAttackChance && (
        <div
          className="absolute inset-0 pointer-events-none animate-atk-ac-bg-pulse z-0"
          style={{
            background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(180,0,0,0.35) 0%, transparent 70%)",
          }}
        />
      )}

      {/* ── Top section: Title + Status ── */}
      <div className="relative flex flex-col items-center gap-2 pt-4 z-10 shrink-0">
        {isAttackChance ? (
          <div className="flex flex-col items-center gap-0">
            <h1
              className="font-[family-name:var(--font-bebas-neue)] leading-none tracking-widest drop-shadow-lg animate-atk-ac-entrance"
              style={{
                fontSize: "clamp(28px, 4.5vw, 54px)",
                color: "#fff",
                textShadow: "0 4px 12px rgba(0,0,0,0.35)",
                WebkitTextStroke: "1px rgba(0,0,0,0.1)",
              }}
            >
              ATTACK{" "}
              <span style={{ color: "var(--atk-gold)", textShadow: "0 4px 12px rgba(0,0,0,0.4), 0 0 60px var(--atk-gold-glow)" }}>
                25
              </span>
            </h1>
            <p
              className="font-[family-name:var(--font-bebas-neue)] tracking-[0.2em] animate-atk-ac-flash"
              style={{
                fontSize: "clamp(32px, 6vw, 80px)",
                color: "#fff",
                textShadow: "0 0 30px rgba(251,191,36,0.8), 0 4px 16px rgba(0,0,0,0.5)",
                letterSpacing: "0.15em",
              }}
            >
              {isAcRemovalPending ? "パネル消去フェーズ" : "アタックチャ〜ンス！"}
            </p>
          </div>
        ) : (
          <h1
            className="font-[family-name:var(--font-bebas-neue)] leading-none tracking-widest drop-shadow-lg"
            style={{
              fontSize: "clamp(36px, 6vw, 72px)",
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
        )}

        {/* Status + answerer row */}
        <div className="flex items-center gap-3 flex-wrap justify-center">
          <span
            className={`px-5 py-1.5 rounded-full text-sm font-black tracking-wide shadow-md ${sc.anim ?? ""}`}
            style={{ background: sc.bg, color: sc.color }}
          >
            {sc.label}
          </span>
          {secondsLeft != null && (
            <span
              className={`px-5 py-1.5 rounded-full text-sm font-black tracking-wide shadow-md${!isTimeUp && !isPaused && secondsLeft <= 3 ? " animate-atk-pulse" : ""}`}
              style={{
                background: isTimeUp
                  ? "var(--atk-error)"
                  : isPaused
                    ? "rgba(0,0,0,0.4)"
                    : "rgba(0,0,0,0.55)",
                color: isTimeUp
                  ? "#fff"
                  : secondsLeft <= 3 && !isPaused
                    ? "#ef5350"
                    : "var(--atk-gold)",
                border: isTimeUp
                  ? "2px solid rgba(255,255,255,0.5)"
                  : "2px solid var(--atk-gold)",
              }}
            >
              {isTimeUp ? "終了" : `残り ${secondsLeft}秒`}
            </span>
          )}
          {currentAnswerer && (
            <span className="px-4 py-1.5 rounded-full text-sm font-bold bg-white/90 text-gray-900 shadow-md animate-atk-slide-up">
              {currentAnswerer.name}&nbsp;
              <span className="font-normal text-gray-600">が回答中</span>
            </span>
          )}
          {isAcRemovalPending && panelOperationPlayer && (
            <span className="px-4 py-1.5 rounded-full text-sm font-bold shadow-md animate-atk-pulse"
              style={{ background: "rgba(0,0,0,0.6)", border: "2px solid var(--atk-gold)", color: "var(--atk-gold)" }}>
              {panelOperationPlayer.name} がパネルを消去
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 min-h-0 w-full flex items-center justify-center z-10 px-4 py-2">
        <BoardQuestionDisplay q={q} answer={currentAnswer} />
      </div>


      {/* ── Panel board info bar ── */}
      {isAcRemovalPending && panelOperationPlayer ? (
        <div
          className="relative z-10 px-5 py-2.5 rounded-full text-center shadow-lg animate-atk-slide-up shrink-0"
          style={{
            background: "rgba(80,0,0,0.75)",
            border: "2px solid var(--atk-gold)",
            maxWidth: "min(92vw, 580px)",
          }}
        >
          <p
            className="font-black text-white animate-atk-ac-flash"
            style={{ fontSize: "clamp(14px, 2.2vw, 20px)" }}
          >
            {panelOperationPlayer.name}
            <span className="font-bold text-white/80"> — 消去したいパネルを選んでください</span>
          </p>
        </div>
      ) : null}

      <div
        className="relative z-10 shrink-0"
        style={{
          width: "min(88vw, 520px)",
          padding: "6px",
          background: "linear-gradient(135deg, #ffd54f 0%, #ffb300 30%, #ff8f00 60%, #ffd54f 100%)",
          borderRadius: "8px",
          boxShadow:
            "0 8px 40px rgba(0,0,0,0.45), 0 0 0 3px #b8860b, 0 0 0 6px rgba(255,193,7,0.3), inset 0 2px 0 rgba(255,255,255,0.3)",
        }}
      >
        {/* Ornate frame inner border */}
        <div
          style={{
            padding: "4px",
            background: "linear-gradient(135deg, #fff8e1 0%, #ffe082 50%, #fff8e1 100%)",
            borderRadius: "4px",
          }}
        >
          <div style={{ borderRadius: "2px", overflow: "hidden" }}>
            <PanelGrid
              panels={gameState.panels}
              players={gameState.players}
              interactive={false}
              validPanelNumbers={validPanelNumbers}
              selectedPanelNumbers={isAcRemovalPending ? validPanelNumbers : undefined}
            />
          </div>
        </div>

        {/* Corner decorations - ornate bolts */}
        {["top-left", "top-right", "bottom-left", "bottom-right"].map((pos) => (
          <div
            key={pos}
            className={`absolute w-4 h-4 rounded-full
              ${pos.includes("top") ? "-top-2" : "-bottom-2"}
              ${pos.includes("left") ? "-left-2" : "-right-2"}
            `}
            style={{
              background: "radial-gradient(circle, #ffd54f 30%, #b8860b 100%)",
              border: "2px solid #8b6914",
              boxShadow: "0 1px 3px rgba(0,0,0,0.4)",
            }}
          />
        ))}
      </div>

      {/* ── Podium Stations (TV-show style) ── */}
      {activePlayers.length > 0 && (
        <div
          className="relative z-10 flex justify-center items-end w-full pb-2 shrink-0"
          style={{ gap: "clamp(8px, 3vw, 24px)" }}
        >
          {activePlayers.map((player) => {
            const podium = PODIUM_CFG[player.color];
            const isActive = player.id === q.currentAnswerPlayerId;
            const isPenalized = player.penaltyRemainingTurns > 0;
            return (
              <div
                key={player.id}
                className={`podium-station ${isActive ? "podium-active" : ""}`}
              >
                {/* Penalty badge above name */}
                {isPenalized && (
                  <div
                    className="text-xs font-black text-center mb-0.5 px-2 py-0.5 rounded-full"
                    style={{
                      background: "var(--atk-error)",
                      color: "#fff",
                      fontSize: "clamp(8px, 1.3vw, 11px)",
                    }}
                  >
                    {player.penaltyRemainingTurns}回休み
                  </div>
                )}
                {/* Player name label above podium */}
                <div
                  className="text-xs font-black text-center mb-1 px-2 py-0.5 rounded-full truncate"
                  style={{
                    background: isPenalized ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.4)",
                    color: isPenalized ? "rgba(255,255,255,0.5)" : "#fff",
                    maxWidth: "clamp(80px, 16vw, 140px)",
                    fontSize: "clamp(9px, 1.5vw, 12px)",
                  }}
                >
                  {player.name}
                </div>

                {/* Buzzer elapsed time */}
                {(() => {
                  const ev = q.buzzerEvents.find((e) => e.playerId === player.id);
                  if (!ev || !q.startedAt) return null;
                  const elapsed = ((ev.pressedAt - q.startedAt) / 1000).toFixed(2);
                  return (
                    <div
                      className="font-mono font-bold text-center mb-1"
                      style={{
                        color: "var(--atk-gold)",
                        fontSize: "clamp(9px, 1.3vw, 12px)",
                      }}
                    >
                      {elapsed}s
                    </div>
                  );
                })()}

                {/* Podium body */}
                <div
                  className="podium-body"
                  style={{
                    background: `linear-gradient(180deg, ${podium.bgLight} 0%, ${podium.bg} 50%, ${podium.bgDark} 100%)`,
                    boxShadow: isActive
                      ? `0 0 20px ${podium.glowColor}, 0 4px 12px rgba(0,0,0,0.3)`
                      : "0 4px 12px rgba(0,0,0,0.3)",
                  }}
                >
                  {/* Shine overlay */}
                  <div
                    className="absolute inset-0 pointer-events-none"
                    style={{
                      background: "linear-gradient(90deg, rgba(255,255,255,0.15) 0%, transparent 30%, transparent 70%, rgba(255,255,255,0.08) 100%)",
                      clipPath: "polygon(10% 0%, 90% 0%, 100% 100%, 0% 100%)",
                    }}
                  />

                  {/* Vertical light stripe accent */}
                  <div
                    className="absolute pointer-events-none"
                    style={{
                      top: "10%",
                      bottom: "10%",
                      left: "50%",
                      transform: "translateX(-50%)",
                      width: "3px",
                      background: "rgba(255,255,255,0.15)",
                      borderRadius: "2px",
                    }}
                  />

                  {/* Score screen */}
                  <div className="podium-screen relative">
                    <span className="podium-score">{player.score}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function BoardQuestionDisplay({
  q,
  answer,
}: {
  q: QuestionState;
  answer: string | null;
}) {
  const { displayText, isTyping, isStopped } = useQuestionDisplayText(q);
  const showAnswer =
    Boolean(answer) &&
    Boolean(q.text) &&
    (q.status === "waiting" || q.status === "judged");

  return (
    <div
      className="relative w-full rounded-2xl border-2 px-6 py-4 shadow-2xl z-10"
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
        className="font-black leading-relaxed text-gray-950 whitespace-pre-wrap"
        style={{ fontSize: "clamp(13px, min(3.2vw, 2.8vh), 34px)" }}
      >
        {displayText || "問題を待っています"}
        {isTyping && <span className="animate-atk-pulse">▌</span>}
      </p>
      {showAnswer && (
        <div
          className="mt-3 pt-3 border-t"
          style={{ borderColor: "rgba(0,0,0,0.1)" }}
        >
          <p
            className="text-xs font-black tracking-[0.3em] uppercase"
            style={{ color: "var(--atk-gold)" }}
          >
            Answer
          </p>
          <p
            className="font-black leading-relaxed text-gray-950 mt-0.5"
            style={{ fontSize: "clamp(14px, min(3.5vw, 3vh), 38px)" }}
          >
            {answer}
          </p>
        </div>
      )}
    </div>
  );
}
