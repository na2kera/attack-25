"use client";

import { useEffect, useState, useCallback } from "react";
import { useSocket } from "@/hooks/useSocket";
import { useQuestionDisplayText } from "@/hooks/useQuestionDisplayText";
import { PanelGrid } from "@/app/components/PanelGrid";
import { PlayerList } from "@/app/components/PlayerList";
import { QrCode } from "@/app/components/QrCode";
import type { Player, PanelOperationMode, QuestionState } from "@/types/game";
import {
  getPlacementRuleKindForPlayer,
  getValidPlacementPanelNumbers,
} from "@/types/panel-flip";

type Props = { roomId: string };

export function MasterPanel({ roomId }: Props) {
  const { socket, gameState, setGameState, connected } = useSocket(roomId);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState<string | null>(null);
  const [panelError, setPanelError] = useState<string | null>(null);

  useEffect(() => {
    if (!connected || joined) return;
    socket.emit("join_room_as_master", { roomId }, (result) => {
      if (result.ok) {
        setGameState(result.gameState);
        setJoined(true);
      } else setError("ルームが見つかりません");
    });
  }, [connected, joined, roomId, socket, setGameState]);

  useEffect(() => {
    socket.on(
      "question_answer_updated",
      ({ roomId: updatedRoomId, answer }) => {
        if (updatedRoomId === roomId) setCurrentAnswer(answer);
      },
    );
    return () => {
      socket.off("question_answer_updated");
    };
  }, [roomId, socket]);

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const emit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (event: string, payload: any, cb?: (r: any) => void) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).emit(event, payload, (result: any) => {
        if (result?.ok && result.gameState) {
          setGameState(result.gameState);
          if (event === "set_panel_owner") setPanelError(null);
        } else if (event === "set_panel_owner" && result?.error) {
          const messages: Record<string, string> = {
            invalid_placement: "ルール上、このパネルは取得できません",
            panel_already_owned: "すでに取得済みのパネルです",
          };
          setPanelError(messages[result.error] ?? "パネル操作に失敗しました");
        }
        cb?.(result);
      });
    },
    [socket, setGameState],
  );

  /* ── States ── */
  if (error) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ctrl-bg)" }}
      >
        <p className="text-lg font-bold" style={{ color: "var(--atk-error)" }}>
          {error}
        </p>
      </div>
    );
  }
  if (!joined || !gameState) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ctrl-bg)" }}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-full border-2 border-[var(--atk-gold)] border-t-transparent animate-spin" />
          <p className="text-sm" style={{ color: "var(--ctrl-dim)" }}>
            接続中...
          </p>
        </div>
      </div>
    );
  }

  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const playerUrl = `${origin}/player/${roomId}`;
  const boardUrl = `${origin}/board/${roomId}`;

  const q = gameState.currentQuestion;
  const activePlayers = gameState.players.filter((p) => p.status === "active");
  const selectedPlayer = gameState.players.find(
    (p) => p.id === gameState.selectedPlayerIdForPanelOperation,
  );
  const currentAnswerer = gameState.players.find(
    (p) => p.id === q.currentAnswerPlayerId,
  );

  const isSetOwnerMode = gameState.panelOperationMode === "set_owner";
  const validPanelNumbers =
    isSetOwnerMode && gameState.selectedPlayerIdForPanelOperation
      ? getValidPlacementPanelNumbers(
          gameState.panels,
          gameState.selectedPlayerIdForPanelOperation,
        )
      : undefined;
  const placementRuleKind =
    isSetOwnerMode && gameState.selectedPlayerIdForPanelOperation
      ? getPlacementRuleKindForPlayer(
          gameState.panels,
          gameState.selectedPlayerIdForPanelOperation,
        )
      : null;
  const PLACEMENT_RULE_LABEL: Record<
    NonNullable<typeof placementRuleKind>,
    string
  > = {
    first_move: "初手: 13 のみ取得可",
    sandwich_required: "挟み必須: 相手パネルを挟めるマスのみ",
    adjacent_only: "隣接のみ: 取得済みパネルに隣接する空きマス",
  };

  const handlePanelClick = (panelNumber: number) => {
    if (gameState.panelOperationMode === "clear_owner") {
      emit("clear_panel_owner", { roomId, panelNumber });
    } else if (gameState.selectedPlayerIdForPanelOperation) {
      emit("set_panel_owner", {
        roomId,
        panelNumber,
        playerId: gameState.selectedPlayerIdForPanelOperation,
      });
    }
  };

  const Q_STATUS: Record<string, { label: string; bg: string; color: string }> =
    {
      waiting: {
        label: "待機中",
        bg: "var(--ctrl-card)",
        color: "var(--ctrl-dim)",
      },
      open: { label: "回答受付中", bg: "var(--atk-success)", color: "#fff" },
      answering: { label: "回答中", bg: "var(--atk-gold)", color: "#000" },
      judged: { label: "判定済み", bg: "var(--panel-blue)", color: "#fff" },
    };
  const qs = Q_STATUS[q.status];

  return (
    <div
      className="min-h-screen text-[var(--ctrl-text)]"
      style={{ background: "var(--ctrl-bg)" }}
    >
      <div className="max-w-5xl mx-auto p-4 space-y-4">
        {/* ── Header ── */}
        <header
          className="flex items-center justify-between py-3 px-4 rounded-xl border"
          style={{
            background: "var(--ctrl-surface)",
            borderColor: "var(--ctrl-border)",
          }}
        >
          <div className="flex items-center gap-3">
            <span
              className="font-[family-name:var(--font-bebas-neue)] text-3xl leading-none tracking-widest"
              style={{
                color: "var(--ctrl-text)",
                textShadow: "0 0 20px var(--atk-gold-glow)",
              }}
            >
              ATTACK <span style={{ color: "var(--atk-gold)" }}>25</span>
            </span>
            <span
              className="text-xs font-bold px-2 py-1 rounded border"
              style={{
                background: "var(--ctrl-card)",
                borderColor: "var(--ctrl-border2)",
                color: "var(--ctrl-dim)",
              }}
            >
              MASTER
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--atk-success)] animate-atk-pulse" />
            <span
              className="text-xs font-mono"
              style={{ color: "var(--ctrl-dim)" }}
            >
              {roomId.toUpperCase()}
            </span>
          </div>
        </header>

        {/* ── URL / QR ── */}
        <section
          className="rounded-xl border p-4"
          style={{
            background: "var(--ctrl-surface)",
            borderColor: "var(--ctrl-border)",
          }}
        >
          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-start">
            <div className="space-y-2">
              <h2
                className="text-xs font-bold uppercase tracking-widest mb-3"
                style={{ color: "var(--ctrl-dim)" }}
              >
                共有URL
              </h2>
              {[
                { label: "プレイヤー", url: playerUrl },
                { label: "ボード", url: boardUrl },
              ].map(({ label, url }) => (
                <div key={label} className="flex items-center gap-2">
                  <span
                    className="text-xs w-16 shrink-0"
                    style={{ color: "var(--ctrl-dim)" }}
                  >
                    {label}
                  </span>
                  <span
                    className="flex-1 text-xs font-mono truncate px-2.5 py-1.5 rounded-lg border"
                    style={{
                      background: "var(--ctrl-bg)",
                      borderColor: "var(--ctrl-border)",
                      color: "var(--ctrl-text)",
                    }}
                  >
                    {url}
                  </span>
                  <button
                    className="text-xs px-2.5 py-1.5 rounded-lg border font-bold transition-all shrink-0"
                    style={{
                      background:
                        copied === label
                          ? "var(--atk-success)"
                          : "var(--ctrl-card)",
                      borderColor:
                        copied === label
                          ? "var(--panel-green-dark)"
                          : "var(--ctrl-border2)",
                      color: copied === label ? "#fff" : "var(--ctrl-dim)",
                    }}
                    onClick={() => handleCopy(url, label)}
                  >
                    {copied === label ? "✓ コピー済" : "コピー"}
                  </button>
                </div>
              ))}
            </div>

            <div
              className="flex items-center gap-3 rounded-xl p-3 sm:flex-col border"
              style={{
                background: "var(--ctrl-bg)",
                borderColor: "var(--ctrl-border)",
              }}
            >
              <QrCode
                value={playerUrl}
                label="プレイヤー参加URLのQRコード"
                size={168}
              />
              <div className="min-w-0 text-xs sm:text-center">
                <p className="font-bold" style={{ color: "var(--ctrl-text)" }}>
                  プレイヤー参加QR
                </p>
                <p style={{ color: "var(--ctrl-dim)" }}>
                  スマホで読み取って参加
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Main grid ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Left column */}
          <div className="space-y-4">
            {/* Players */}
            <Card title={`プレイヤー ${activePlayers.length}/4`}>
              <PlayerList
                players={gameState.players}
                currentAnswerPlayerId={q.currentAnswerPlayerId}
                correctPlayerId={q.correctPlayerId}
              />
            </Card>

            {/* Question */}
            <Card
              title="問題進行"
              badge={
                <StatusBadge label={qs.label} bg={qs.bg} color={qs.color} />
              }
            >
              <div className="flex gap-2">
                {q.status === "waiting" && (
                  <Btn
                    label="▶ 回答受付開始"
                    bg="var(--atk-success)"
                    border="var(--panel-green-dark)"
                    color="#fff"
                    onClick={() => emit("start_question", { roomId })}
                  />
                )}
                {(q.status === "open" || q.status === "answering") && (
                  <Btn
                    label="■ 回答受付停止"
                    bg="var(--atk-error)"
                    border="var(--panel-red-dark)"
                    color="#fff"
                    onClick={() => emit("stop_question", { roomId })}
                  />
                )}
                {(q.status === "judged" || q.status === "waiting") && (
                  <Btn
                    label="▷ 次の問題へ"
                    bg="var(--panel-blue)"
                    border="var(--panel-blue-dark)"
                    color="#fff"
                    onClick={() => emit("next_question", { roomId })}
                  />
                )}
              </div>

              <MasterQuestionDisplay q={q} answer={currentAnswer} />

              {/* Judge */}
              {q.status === "answering" && currentAnswerer && (
                <div className="space-y-2 mt-1 animate-atk-slide-up">
                  <p
                    className="text-sm text-center py-1.5 rounded-lg font-bold"
                    style={{ background: "var(--atk-gold)", color: "#000" }}
                  >
                    {currentAnswerer.name}&nbsp;が回答中
                  </p>
                  <div className="grid grid-cols-3 gap-1.5">
                    <Btn
                      label="✓ 正解"
                      bg="var(--atk-success)"
                      border="var(--panel-green-dark)"
                      color="#fff"
                      onClick={() =>
                        emit("judge_answer", {
                          roomId,
                          playerId: currentAnswerer.id,
                          result: "correct",
                        })
                      }
                    />
                    <Btn
                      label="✗ 不正解"
                      bg="var(--atk-error)"
                      border="var(--panel-red-dark)"
                      color="#fff"
                      onClick={() =>
                        emit("judge_answer", {
                          roomId,
                          playerId: currentAnswerer.id,
                          result: "incorrect",
                        })
                      }
                    />
                    <Btn
                      label="— 無効"
                      bg="var(--ctrl-card)"
                      border="var(--ctrl-border2)"
                      color="var(--ctrl-dim)"
                      onClick={() =>
                        emit("judge_answer", {
                          roomId,
                          playerId: currentAnswerer.id,
                          result: "invalid",
                        })
                      }
                    />
                  </div>
                </div>
              )}
            </Card>

            {/* Buzzer history */}
            {q.buzzerEvents.length > 0 && (
              <Card title="早押し順">
                <div className="space-y-1">
                  {q.buzzerEvents
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((ev, i) => {
                      const player = gameState.players.find(
                        (p) => p.id === ev.playerId,
                      );
                      const STATUS_COLOR: Record<string, string> = {
                        current: "var(--atk-gold)",
                        correct: "var(--atk-success)",
                        incorrect: "var(--atk-error)",
                        invalid: "var(--ctrl-muted)",
                        pending: "var(--ctrl-dim)",
                      };
                      const STATUS_LABEL: Record<string, string> = {
                        current: "回答中",
                        correct: "正解",
                        incorrect: "不正解",
                        invalid: "無効",
                        pending: "",
                      };
                      const c = STATUS_COLOR[ev.status];
                      return (
                        <div
                          key={ev.id}
                          className="flex items-center gap-2 px-2 py-1.5 rounded-lg"
                          style={{
                            background:
                              ev.status === "current"
                                ? "rgba(251,191,36,0.1)"
                                : "transparent",
                          }}
                        >
                          <span
                            className="font-[family-name:var(--font-bebas-neue)] text-xl leading-none w-6 text-right"
                            style={{ color: "var(--ctrl-muted)" }}
                          >
                            {i + 1}
                          </span>
                          <span
                            className="flex-1 text-sm font-bold"
                            style={{ color: c }}
                          >
                            {player?.name ?? "不明"}
                          </span>
                          <span
                            className="text-[10px] font-mono tabular-nums"
                            style={{ color: "var(--ctrl-muted)" }}
                          >
                            {q.startedAt
                              ? ((ev.pressedAt - q.startedAt) / 1000).toFixed(2) + "s"
                              : ""}
                          </span>
                          {STATUS_LABEL[ev.status] && (
                            <span
                              className="text-[10px] font-bold px-1.5 py-0.5 rounded border"
                              style={{
                                color: c,
                                borderColor: c + "50",
                                background: c + "15",
                              }}
                            >
                              {STATUS_LABEL[ev.status]}
                            </span>
                          )}
                        </div>
                      );
                    })}
                </div>
              </Card>
            )}
          </div>

          {/* Right column */}
          <div className="space-y-4">
            {/* Panel operations */}
            <Card title="パネル操作">
              {/* Mode tabs */}
              <div
                className="flex gap-1 p-1 rounded-lg"
                style={{ background: "var(--ctrl-bg)" }}
              >
                {(
                  [
                    { label: "プレイヤー選択", value: "set_owner" },
                    { label: "未取得に戻す", value: "clear_owner" },
                  ] as { label: string; value: PanelOperationMode }[]
                ).map(({ label, value }) => (
                  <button
                    key={value}
                    className="flex-1 py-1.5 text-xs rounded-md font-bold transition-all"
                    style={{
                      background:
                        gameState.panelOperationMode === value
                          ? "var(--atk-gold)"
                          : "transparent",
                      color:
                        gameState.panelOperationMode === value
                          ? "#000"
                          : "var(--ctrl-dim)",
                    }}
                    onClick={() =>
                      emit("set_panel_operation_mode", { roomId, mode: value })
                    }
                  >
                    {label}
                  </button>
                ))}
              </div>

              {/* Player selection */}
              {gameState.panelOperationMode === "set_owner" && (
                <div className="space-y-2 mt-1">
                  <p className="text-xs" style={{ color: "var(--ctrl-dim)" }}>
                    操作プレイヤー:
                  </p>
                  <div className="grid grid-cols-2 gap-1.5">
                    {activePlayers.map((p) => (
                      <PlayerSelectBtn
                        key={p.id}
                        player={p}
                        selected={
                          p.id === gameState.selectedPlayerIdForPanelOperation
                        }
                        onClick={() =>
                          emit("set_selected_player", {
                            roomId,
                            playerId:
                              p.id ===
                              gameState.selectedPlayerIdForPanelOperation
                                ? null
                                : p.id,
                          })
                        }
                      />
                    ))}
                  </div>
                  {selectedPlayer && (
                    <div className="space-y-1">
                      <p
                        className="text-xs text-center font-bold"
                        style={{ color: "var(--atk-gold)" }}
                      >
                        選択中: {selectedPlayer.name}
                      </p>
                      {placementRuleKind && (
                        <p
                          className="text-[10px] text-center"
                          style={{ color: "var(--ctrl-dim)" }}
                        >
                          {PLACEMENT_RULE_LABEL[placementRuleKind]}
                          {validPanelNumbers && validPanelNumbers.length > 0
                            ? ` (${validPanelNumbers.join(", ")})`
                            : " (合法手なし)"}
                        </p>
                      )}
                      {panelError && (
                        <p
                          className="text-[10px] text-center font-bold"
                          style={{ color: "var(--atk-error)" }}
                        >
                          {panelError}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Danger buttons */}
              <div
                className="flex gap-2 pt-3 border-t mt-1"
                style={{ borderColor: "var(--ctrl-border)" }}
              >
                <button
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "rgba(249,115,22,0.1)",
                    borderColor: "rgba(249,115,22,0.35)",
                    color: "rgb(249,115,22)",
                  }}
                  onClick={() =>
                    confirm("全パネルをリセットしますか？") &&
                    emit("reset_all_panels", { roomId })
                  }
                >
                  全パネルリセット
                </button>
                <button
                  className="flex-1 py-1.5 text-xs font-bold rounded-lg border transition-all hover:brightness-110 active:scale-95"
                  style={{
                    background: "rgba(229,57,53,0.1)",
                    borderColor: "rgba(229,57,53,0.35)",
                    color: "var(--atk-error)",
                  }}
                  onClick={() =>
                    confirm("ゲームをリセットしますか？") &&
                    emit("reset_game", { roomId })
                  }
                >
                  ゲームリセット
                </button>
              </div>
            </Card>

            {/* Panel grid */}
            <section
              className="rounded-xl border p-3"
              style={{
                background: "var(--ctrl-surface)",
                borderColor: "var(--ctrl-border)",
              }}
            >
              {/* Mini gold frame */}
              <div
                className="rounded-lg p-0.5"
                style={{ background: "var(--atk-gold)" }}
              >
                <div className="rounded-md p-1 bg-white">
                  <PanelGrid
                    panels={gameState.panels}
                    players={gameState.players}
                    onPanelClick={handlePanelClick}
                    interactive={true}
                    validPanelNumbers={validPanelNumbers}
                  />
                </div>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── Sub-components ─────────────────────────────────────────── */

function Card({
  title,
  children,
  badge,
}: {
  title: string;
  children: React.ReactNode;
  badge?: React.ReactNode;
}) {
  return (
    <section
      className="rounded-xl border p-4 space-y-3"
      style={{
        background: "var(--ctrl-surface)",
        borderColor: "var(--ctrl-border)",
      }}
    >
      <div className="flex items-center justify-between">
        <h2
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--ctrl-dim)" }}
        >
          {title}
        </h2>
        {badge}
      </div>
      {children}
    </section>
  );
}

function StatusBadge({
  label,
  bg,
  color,
}: {
  label: string;
  bg: string;
  color: string;
}) {
  return (
    <span
      className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  );
}

function MasterQuestionDisplay({
  q,
  answer,
}: {
  q: QuestionState;
  answer: string | null;
}) {
  const { displayText, isTyping, isStopped } = useQuestionDisplayText(q);
  const statusLabel = isStopped
    ? "早押し停止"
    : isTyping
      ? "出題中"
      : q.text
        ? "全文表示"
        : "未出題";

  return (
    <div
      className="rounded-xl border p-3 space-y-2"
      style={{
        background: "var(--ctrl-bg)",
        borderColor: "var(--ctrl-border)",
      }}
    >
      <div className="flex items-center justify-between gap-2">
        <p
          className="text-xs font-bold uppercase tracking-widest"
          style={{ color: "var(--ctrl-dim)" }}
        >
          問題文
        </p>
        <span
          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "var(--ctrl-card)", color: "var(--ctrl-dim)" }}
        >
          {statusLabel}
        </span>
      </div>
      <p
        className="min-h-16 text-base leading-relaxed font-bold whitespace-pre-wrap"
        style={{ color: "var(--ctrl-text)" }}
      >
        {displayText || "回答受付開始で問題が表示されます"}
        {isTyping && <span className="animate-atk-pulse">▌</span>}
      </p>
      <div
        className="rounded-lg px-3 py-2 border"
        style={{
          background: "rgba(251,191,36,0.12)",
          borderColor: "rgba(251,191,36,0.35)",
        }}
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: "var(--atk-gold)" }}
        >
          答え
        </p>
        <p
          className="text-lg font-black mt-0.5"
          style={{ color: "var(--ctrl-text)" }}
        >
          {answer ?? "未設定"}
        </p>
      </div>
    </div>
  );
}

function Btn({
  label,
  bg,
  border,
  color,
  onClick,
}: {
  label: string;
  bg: string;
  border: string;
  color: string;
  onClick: () => void;
}) {
  return (
    <button
      className="flex-1 py-2.5 text-sm font-bold rounded-xl border transition-all hover:brightness-110 active:scale-95"
      style={{
        background: bg,
        borderColor: border,
        color,
        boxShadow: `0 2px 0 ${border}`,
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

const PANEL_BTN_CFG: Record<
  string,
  { bg: string; border: string; text: string }
> = {
  red: {
    bg: "var(--panel-red)",
    border: "var(--panel-red-dark)",
    text: "#fff",
  },
  green: {
    bg: "var(--panel-green)",
    border: "var(--panel-green-dark)",
    text: "#fff",
  },
  white: {
    bg: "var(--panel-white)",
    border: "var(--panel-white-dark)",
    text: "#111",
  },
  blue: {
    bg: "var(--panel-blue)",
    border: "var(--panel-blue-dark)",
    text: "#fff",
  },
};

function PlayerSelectBtn({
  player,
  selected,
  onClick,
}: {
  player: Player;
  selected: boolean;
  onClick: () => void;
}) {
  const cfg = PANEL_BTN_CFG[player.color];
  return (
    <button
      className="py-2 px-2 text-xs font-bold rounded-xl border transition-all hover:brightness-110 active:scale-95"
      style={{
        background: selected ? cfg.bg : "var(--ctrl-card)",
        borderColor: selected ? cfg.border : "var(--ctrl-border2)",
        color: selected ? cfg.text : "var(--ctrl-dim)",
        boxShadow: selected
          ? `0 2px 0 ${cfg.border}, 0 0 12px ${cfg.bg}60`
          : "none",
        transform: selected ? "scale(1.03)" : "scale(1)",
      }}
      onClick={onClick}
    >
      {player.name}
    </button>
  );
}
