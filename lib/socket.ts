"use client";

import { io, Socket } from "socket.io-client";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "@/types/socket-events";

type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>;

let socket: AppSocket | null = null;

export function getSocket(): AppSocket {
  if (!socket) {
    socket = io({
      autoConnect: false,
      // LAN やモバイル回線でもつながりやすいよう polling も許可
      transports: ["polling", "websocket"],
      timeout: 10_000,
      reconnection: true,
      reconnectionAttempts: 5,
    });
  }
  return socket;
}
