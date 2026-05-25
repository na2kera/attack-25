"use client";

import { useState, useEffect, useCallback } from "react";

const STORAGE_KEY = (roomId: string) => `attack25_player_${roomId}`;

export function usePlayerId(roomId: string) {
  const [playerId, setPlayerIdState] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return localStorage.getItem(STORAGE_KEY(roomId));
  });

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY(roomId));
    queueMicrotask(() => setPlayerIdState(stored));
  }, [roomId]);

  const setPlayerId = useCallback(
    (id: string) => {
      localStorage.setItem(STORAGE_KEY(roomId), id);
      setPlayerIdState(id);
    },
    [roomId],
  );

  const clearPlayerId = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY(roomId));
    setPlayerIdState(null);
  }, [roomId]);

  return { playerId, setPlayerId, clearPlayerId };
}
