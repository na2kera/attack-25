"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { usePlayerId } from "@/hooks/usePlayerId";
import { useQuestionDisplayText } from "@/hooks/useQuestionDisplayText";
import type { Player, QuestionState } from "@/types/game";

type Props = { roomId: string };

const PLAYER_THEME: Record<
  string,
  {
    bgGrad: string;
    btn: string;
    btnBorder: string;
    btnText: string;
    btnGlow: string;
    accent: string;
    accentDark: string;
    headerBg: string;
    headerText: string;
  }
> = {
  red: {
    bgGrad:
      "radial-gradient(ellipse 100% 80% at 50% 100%, #7f1d1d, var(--panel-red) 50%, #fca5a5 90%)",
    btn: "var(--panel-red)",
    btnBorder: "var(--panel-red-dark)",
    btnText: "#fff",
    btnGlow: "0 0 40px rgba(229,57,53,0.6), 0 8px 24px rgba(0,0,0,0.4)",
    accent: "var(--panel-red)",
    accentDark: "var(--panel-red-dark)",
    headerBg: "rgba(0,0,0,0.25)",
    headerText: "#fff",
  },
  green: {
    bgGrad:
      "radial-gradient(ellipse 100% 80% at 50% 100%, #14532d, var(--panel-green) 50%, #86efac 90%)",
    btn: "var(--panel-green)",
    btnBorder: "var(--panel-green-dark)",
    btnText: "#fff",
    btnGlow: "0 0 40px rgba(67,160,71,0.6), 0 8px 24px rgba(0,0,0,0.4)",
    accent: "var(--panel-green)",
    accentDark: "var(--panel-green-dark)",
    headerBg: "rgba(0,0,0,0.25)",
    headerText: "#fff",
  },
  white: {
    bgGrad:
      "radial-gradient(ellipse 100% 80% at 50% 100%, #6b7280, #d1d5db 50%, #f9fafb 90%)",
    btn: "#e5e7eb",
    btnBorder: "#9ca3af",
    btnText: "#111",
    btnGlow: "0 0 40px rgba(156,163,175,0.5), 0 8px 24px rgba(0,0,0,0.3)",
    accent: "#9ca3af",
    accentDark: "#6b7280",
    headerBg: "rgba(0,0,0,0.2)",
    headerText: "#111",
  },
  blue: {
    bgGrad:
      "radial-gradient(ellipse 100% 80% at 50% 100%, #1e3a5f, var(--panel-blue) 50%, #93c5fd 90%)",
    btn: "var(--panel-blue)",
    btnBorder: "var(--panel-blue-dark)",
    btnText: "#fff",
    btnGlow: "0 0 40px rgba(30,136,229,0.6), 0 8px 24px rgba(0,0,0,0.4)",
    accent: "var(--panel-blue)",
    accentDark: "var(--panel-blue-dark)",
    headerBg: "rgba(0,0,0,0.25)",
    headerText: "#fff",
  },
};

export function PlayerScreen({ roomId }: Props) {
  const { socket, gameState, setGameState, connected } = useSocket(roomId);
  const { playerId, setPlayerId, clearPlayerId } = usePlayerId(roomId);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [joinPhase, setJoinPhase] = useState<
    "loading" | "form" | "joined" | "full" | "error"
  >("loading");
  const [nameInput, setNameInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [buzzed, setBuzzed] = useState(false);

  const attemptJoin = useCallback(
    (name: string, existingPlayerId?: string) => {
      socket.emit(
        "join_room_as_player",
        { roomId, name, playerId: existingPlayerId },
        (result) => {
          if (result.ok) {
            setMyPlayer(result.player);
            setPlayerId(result.player.id);
            setGameState(result.gameState);
            setJoinPhase("joined");
          } else {
            if (result.reason === "room_full") setJoinPhase("full");
            else if (result.reason === "room_not_found") {
              setJoinPhase("error");
              setError("ルームが見つかりません");
            } else setError("名前を入力してください");
          }
        },
      );
    },
    [socket, roomId, setPlayerId, setGameState],
  );

  useEffect(() => {
    if (!connected) return;
    if (myPlayer) return;
    if (playerId) {
      const existing = gameState?.players.find((p) => p.id === playerId);
      if (existing?.name) attemptJoin(existing.name, playerId);
      else queueMicrotask(() => setJoinPhase("form"));
    } else {
      queueMicrotask(() => setJoinPhase("form"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected]);

  useEffect(() => {
    if (!myPlayer || !gameState) return;
    const updated = gameState.players.find((p) => p.id === myPlayer.id);
    if (updated) queueMicrotask(() => setMyPlayer(updated));
  }, [gameState, myPlayer]);

  useEffect(() => {
    queueMicrotask(() => setBuzzed(false));
  }, [gameState?.currentQuestion.id]);

  useEffect(() => {
    socket.on("room_not_found", () => {
      setJoinPhase("error");
      setError("ルームが見つかりません");
    });
    socket.on("player_kicked", ({ playerId: id }) => {
      if (id === myPlayer?.id) {
        clearPlayerId();
        setMyPlayer(null);
        setJoinPhase("form");
      }
    });
    return () => {
      socket.off("room_not_found");
      socket.off("player_kicked");
    };
  }, [socket, myPlayer, clearPlayerId]);

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    const name = nameInput.trim();
    if (!name) {
      setError("名前を入力してください");
      return;
    }
    setError(null);
    attemptJoin(name);
  };

  const handleBuzz = () => {
    if (!myPlayer || buzzed) return;
    socket.emit("press_buzzer", { roomId, playerId: myPlayer.id }, (result) => {
      if (result.ok) {
        setBuzzed(true);
        setGameState(result.gameState);
      }
    });
  };

  const handleLeave = () => {
    if (!myPlayer) return;
    socket.emit("leave_player", { roomId, playerId: myPlayer.id }, () => {});
    clearPlayerId();
    setMyPlayer(null);
    setJoinPhase("form");
  };

  /* ── Loading ── */
  if (!connected || joinPhase === "loading") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--atk-orange)" }}
      >
        <div className="w-10 h-10 rounded-full border-4 border-white border-t-transparent animate-spin" />
      </div>
    );
  }

  if (joinPhase === "error") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--atk-orange)" }}
      >
        <p className="text-xl font-black text-white">{error}</p>
      </div>
    );
  }

  if (joinPhase === "full") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 gap-4"
        style={{ background: "var(--atk-orange)" }}
      >
        <div
          className="w-24 h-24 rounded-full flex items-center justify-center text-4xl font-black text-white border-4 border-white/50"
          style={{ background: "var(--atk-orange-deep)" }}
        >
          満員
        </div>
        <p className="text-xl font-black text-white">このルームは満員です</p>
        <p className="text-sm text-white/70">既に4人参加しています</p>
      </div>
    );
  }

  /* ── Join form ── */
  if (joinPhase === "form") {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
        style={{
          background: `radial-gradient(ellipse 100% 80% at 50% 100%, var(--atk-orange-deep), var(--atk-orange) 40%, var(--atk-orange-light) 85%)`,
        }}
      >
        <div className="relative w-full max-w-xs space-y-8">
          <div className="text-center">
            <h1
              className="font-[family-name:var(--font-bebas-neue)] leading-none tracking-widest"
              style={{
                fontSize: "clamp(72px, 18vw, 120px)",
                color: "#fff",
                textShadow: "0 4px 16px rgba(0,0,0,0.25)",
              }}
            >
              ATTACK{" "}
              <span
                style={{
                  color: "var(--atk-gold)",
                  textShadow: "0 4px 16px rgba(0,0,0,0.3)",
                }}
              >
                25
              </span>
            </h1>
            <p
              className="font-bold text-sm tracking-[0.25em] uppercase mt-1"
              style={{ color: "rgba(255,255,255,0.75)" }}
            >
              PLAYER JOIN
            </p>
          </div>

          <form onSubmit={handleJoin} className="space-y-3">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              placeholder="名前を入力"
              maxLength={20}
              autoFocus
              className="w-full px-4 py-4 rounded-2xl text-center text-lg font-black outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.9)",
                border: "2px solid rgba(255,255,255,0.5)",
                color: "#111",
              }}
            />
            {error && (
              <p className="text-sm font-bold text-center bg-white/20 py-1.5 rounded-lg text-white">
                {error}
              </p>
            )}
            <button
              type="submit"
              className="w-full py-4 rounded-2xl font-black text-xl transition-all hover:scale-[1.02] active:scale-[0.97]"
              style={{
                background: "var(--atk-gold)",
                color: "#000",
                boxShadow:
                  "0 4px 0 var(--atk-gold-dark), 0 8px 20px rgba(0,0,0,0.2)",
              }}
            >
              参加する
            </button>
          </form>
        </div>
      </div>
    );
  }

  /* ── Game screen ── */
  if (!myPlayer || !gameState) return null;

  const theme = PLAYER_THEME[myPlayer.color] ?? PLAYER_THEME.red;
  const q = gameState.currentQuestion;
  const myBuzzerEvent = q.buzzerEvents.find((e) => e.playerId === myPlayer.id);
  const isAnswering = q.currentAnswerPlayerId === myPlayer.id;
  const isPenalized = myPlayer.penaltyRemainingTurns > 0;
  const canBuzz = (q.status === "open" || q.status === "answering") && !myBuzzerEvent && !isPenalized;

  // Status text
  let statusLabel = "待機中";
  let statusStyle = { bg: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.6)" };
  if (isPenalized) {
    statusLabel = `お手つき ${myPlayer.penaltyRemainingTurns}回休み`;
    statusStyle = { bg: "var(--atk-error)", color: "#fff" };
  } else if (q.status === "open") {
    if (myBuzzerEvent) {
      statusLabel = "押下済み";
      statusStyle = { bg: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.7)" };
    } else {
      statusLabel = "回答受付中！";
      statusStyle = { bg: "rgba(255,255,255,0.25)", color: "#fff" };
    }
  } else if (q.status === "answering") {
    if (isAnswering) {
      statusLabel = "回答権あり！";
      statusStyle = { bg: "var(--atk-gold)", color: "#000" };
    } else if (myBuzzerEvent) {
      statusLabel = "押下済み";
      statusStyle = { bg: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.6)" };
    } else {
      statusLabel = "早押し受付中";
      statusStyle = { bg: "rgba(255,255,255,0.2)", color: "#fff" };
    }
  } else if (!isPenalized && q.status === "judged") {
    if (myBuzzerEvent?.status === "correct") {
      statusLabel = "🎉 正解！";
      statusStyle = { bg: "var(--atk-gold)", color: "#000" };
    } else if (myBuzzerEvent?.status === "incorrect") {
      statusLabel = "✗ 不正解";
      statusStyle = { bg: "rgba(0,0,0,0.25)", color: "rgba(255,255,255,0.7)" };
    } else {
      statusLabel = "判定済み";
      statusStyle = { bg: "rgba(0,0,0,0.2)", color: "rgba(255,255,255,0.6)" };
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{ background: theme.bgGrad }}
    >
      {/* Header */}
      <header
        className="px-5 pt-5 pb-4 flex items-start justify-between"
        style={{ background: theme.headerBg, backdropFilter: "blur(4px)" }}
      >
        <div>
          <p
            className="text-xs font-bold uppercase tracking-widest opacity-70"
            style={{ color: theme.headerText }}
          >
            PLAYER {myPlayer.number}
          </p>
          <p
            className="text-2xl font-black mt-0.5"
            style={{ color: theme.headerText }}
          >
            {myPlayer.name}
          </p>
        </div>
        <div className="text-right">
          <p
            className="text-xs uppercase tracking-widest opacity-70"
            style={{ color: theme.headerText }}
          >
            獲得
          </p>
          <p
            className="font-[family-name:var(--font-bebas-neue)] leading-none"
            style={{
              fontSize: "clamp(36px, 10vw, 56px)",
              color: theme.headerText,
              textShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}
          >
            {myPlayer.score}
          </p>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-8">
        {/* Status badge */}
        <div
          className="px-6 py-2 rounded-full font-black text-sm tracking-wide shadow-md transition-all"
          style={{ background: statusStyle.bg, color: statusStyle.color }}
        >
          {statusLabel}
        </div>

        <PlayerQuestionDisplay q={q} />

        {/* Buzzer */}
        <div className="relative flex items-center justify-center">
          {/* Ping ring when answering */}
          {isAnswering && (
            <div
              className="absolute rounded-full animate-atk-ping"
              style={{
                inset: -12,
                background: "transparent",
                border: `4px solid ${theme.btn}`,
              }}
            />
          )}

          <button
            onClick={handleBuzz}
            disabled={!canBuzz}
            className="relative rounded-full font-[family-name:var(--font-bebas-neue)] transition-all duration-100"
            style={{
              width: "min(64vw, 250px)",
              height: "min(64vw, 250px)",
              background: canBuzz
                ? `radial-gradient(circle at 38% 32%, color-mix(in srgb, ${theme.btn} 80%, white), ${theme.btn})`
                : "rgba(0,0,0,0.2)",
              border: `4px solid ${canBuzz ? theme.btnBorder : "rgba(255,255,255,0.2)"}`,
              boxShadow: canBuzz
                ? theme.btnGlow
                : "inset 0 2px 8px rgba(0,0,0,0.3)",
              cursor: canBuzz ? "pointer" : "not-allowed",
              opacity: canBuzz ? 1 : 0.5,
              animation:
                canBuzz && !isAnswering
                  ? "atk-glow-pulse 2s ease-in-out infinite"
                  : undefined,
            }}
            onMouseDown={(e) =>
              canBuzz &&
              ((e.currentTarget as HTMLElement).style.transform = "scale(0.93)")
            }
            onMouseUp={(e) =>
              canBuzz && ((e.currentTarget as HTMLElement).style.transform = "")
            }
          >
            {/* Inner shine */}
            <div
              className="absolute inset-0 rounded-full pointer-events-none"
              style={{
                background:
                  "radial-gradient(circle at 35% 30%, rgba(255,255,255,0.3) 0%, transparent 55%)",
              }}
            />
            <span
              className="relative font-[family-name:var(--font-bebas-neue)] leading-none select-none"
              style={{
                display: "block",
                fontSize: myBuzzerEvent
                  ? "clamp(24px, 8vw, 40px)"
                  : "clamp(40px, 12vw, 64px)",
                color: canBuzz ? theme.btnText : "rgba(255,255,255,0.5)",
                textShadow: canBuzz ? "0 2px 6px rgba(0,0,0,0.3)" : "none",
              }}
            >
              {myBuzzerEvent ? `${myBuzzerEvent.order}番目` : "PUSH"}
            </span>
            {!myBuzzerEvent && canBuzz && (
              <span
                className="relative text-sm font-bold block opacity-70 leading-none mt-1"
                style={{ color: theme.btnText }}
              >
                押す！
              </span>
            )}
          </button>
        </div>

        {isAnswering && (
          <p
            className="text-base font-black animate-atk-pulse"
            style={{ color: "#fff", textShadow: "0 2px 8px rgba(0,0,0,0.3)" }}
          >
            口頭で回答してください！
          </p>
        )}
      </div>

      {/* Footer */}
      <footer className="pb-6 text-center">
        <button
          onClick={handleLeave}
          className="text-xs transition-opacity hover:opacity-80"
          style={{ color: "rgba(255,255,255,0.4)" }}
        >
          退出する
        </button>
      </footer>
    </div>
  );
}

function PlayerQuestionDisplay({ q }: { q: QuestionState }) {
  const { displayText, isTyping, isStopped } = useQuestionDisplayText(q);

  return (
    <div
      className="w-full max-w-xl rounded-3xl border p-5 shadow-xl"
      style={{
        background: "rgba(255,255,255,0.16)",
        borderColor: "rgba(255,255,255,0.28)",
        backdropFilter: "blur(8px)",
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-xs font-black tracking-[0.25em] uppercase text-white/65">
          Question
        </p>
        {isStopped && (
          <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-white/20 text-white/80">
            停止
          </span>
        )}
      </div>
      <p className="min-h-20 text-xl sm:text-2xl leading-relaxed font-black text-white whitespace-pre-wrap">
        {displayText || "問題を待っています"}
        {isTyping && <span className="animate-atk-pulse">▌</span>}
      </p>
    </div>
  );
}
