"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { getSocket } from "@/lib/socket";
import type { GameState } from "@/types/game";

/**
 * Adjust question-related timestamps from server clock to client clock
 * so that the typing animation stays in sync across devices.
 */
function adjustQuestionTimestamps(gs: GameState, clockOffset: number): void {
  const q = gs.currentQuestion;
  if (q.typingStartedAt != null) {
    q.typingStartedAt += clockOffset;
  }
  if (q.typingStoppedAt != null) {
    q.typingStoppedAt += clockOffset;
  }
}

export function useSocket(roomId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);
  const clockOffsetRef = useRef<number>(0);

  const setGameStateWithAdjust = useCallback(
    (gs: GameState) => {
      adjustQuestionTimestamps(gs, clockOffsetRef.current);
      setGameState(gs);
    },
    [],
  );

  useEffect(() => {
    const socket = getSocket();

    if (!socket.connected) {
      socket.connect();
    }

    const onConnect = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    const onGameStateUpdated = ({
      roomId: updatedRoomId,
      gameState: gs,
      serverTime,
    }: {
      roomId: string;
      gameState: GameState;
      serverTime: number;
    }) => {
      if (updatedRoomId === roomId) {
        clockOffsetRef.current = Date.now() - serverTime;
        adjustQuestionTimestamps(gs, clockOffsetRef.current);
        setGameState(gs);
      }
    };

    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("game_state_updated", onGameStateUpdated);

    if (socket.connected) {
      queueMicrotask(() => setConnected(true));
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("game_state_updated", onGameStateUpdated);
    };
  }, [roomId]);

  const emit = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    <T extends any[], R>(
      event: string,
      ...args: [...T, (result: R) => void]
    ) => {
      const socket = getSocket();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (socket as any).emit(event, ...args);
    },
    [],
  );

  return { socket: getSocket(), gameState, setGameState: setGameStateWithAdjust, connected, emit };
}
