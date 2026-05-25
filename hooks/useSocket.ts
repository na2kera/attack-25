"use client";

import { useEffect, useState, useCallback } from "react";
import { getSocket } from "@/lib/socket";
import type { GameState } from "@/types/game";

export function useSocket(roomId: string) {
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [connected, setConnected] = useState(false);

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
    }: {
      roomId: string;
      gameState: GameState;
    }) => {
      if (updatedRoomId === roomId) {
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

  return { socket: getSocket(), gameState, setGameState, connected, emit };
}
