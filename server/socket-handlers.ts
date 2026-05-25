import { Server, Socket } from "socket.io";
import type {
  ClientToServerEvents,
  ServerToClientEvents,
} from "../types/socket-events.js";
import type { GameState, RoomId, PlayerId } from "../types/game.js";
import { GameManager } from "./game-manager.js";

type IoType = Server<ClientToServerEvents, ServerToClientEvents>;

type SocketData = {
  roomId?: RoomId;
  playerId?: PlayerId;
  role?: "master" | "player" | "board";
};

type SocketType = Socket<
  ClientToServerEvents,
  ServerToClientEvents,
  Record<string, never>,
  SocketData
>;

function broadcast(io: IoType, roomId: RoomId, gameState: GameState): void {
  io.to(roomId).emit("game_state_updated", { roomId, gameState, serverTime: Date.now() });
}

function emitAnswerToMasters(
  io: IoType,
  roomId: RoomId,
  gameState: GameState,
  answer: string | null,
): void {
  for (const [, socket] of io.sockets.sockets) {
    if (socket.data.roomId === roomId && socket.data.role === "master") {
      socket.emit("question_answer_updated", {
        roomId,
        questionId: gameState.currentQuestion.sourceQuestionId,
        answer,
      });
    }
  }
}

export function registerSocketHandlers(
  io: IoType,
  gameManager: GameManager,
): void {
  io.on("connection", (socket: SocketType) => {
    socket.on("create_room", (_payload, callback) => {
      const { roomId, gameState } = gameManager.createRoom();
      const origin =
        process.env.APP_ORIGIN ||
        `http://localhost:${process.env.PORT || 3000}`;
      callback({
        ok: true,
        roomId,
        masterUrl: `${origin}/master/${roomId}`,
        playerUrl: `${origin}/player/${roomId}`,
        boardUrl: `${origin}/board/${roomId}`,
        gameState,
      });
    });

    socket.on("join_room_as_master", ({ roomId }, callback) => {
      const gameState = gameManager.getRoom(roomId);
      if (!gameState) {
        socket.emit("room_not_found", { message: `Room ${roomId} not found` });
        callback({ ok: false, error: "room_not_found" });
        return;
      }
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = "master";
      socket.emit("question_answer_updated", {
        roomId,
        questionId: gameState.currentQuestion.sourceQuestionId,
        answer: gameManager.getCurrentAnswer(roomId),
      });
      callback({ ok: true, gameState });
    });

    socket.on("join_room_as_board", ({ roomId }, callback) => {
      const gameState = gameManager.getRoom(roomId);
      if (!gameState) {
        socket.emit("room_not_found", { message: `Room ${roomId} not found` });
        callback({ ok: false, error: "room_not_found" });
        return;
      }
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = "board";
      callback({ ok: true, gameState });
    });

    socket.on("join_room_as_player", ({ roomId, name, playerId }, callback) => {
      const result = gameManager.joinPlayer(roomId, name, playerId);

      if ("error" in result) {
        const reasonMap = {
          room_not_found: "room_not_found",
          room_full: "room_full",
          invalid_name: "invalid_name",
        } as const;
        callback({
          ok: false,
          reason: reasonMap[result.error] ?? "room_not_found",
          message: result.error,
        });
        return;
      }

      const { player, gameState, reconnected } = result;
      socket.join(roomId);
      socket.data.roomId = roomId;
      socket.data.role = "player";
      socket.data.playerId = player.id;
      gameManager.registerSocket(socket.id, roomId, player.id);

      broadcast(io, roomId, gameState);
      callback({ ok: true, player, gameState, reconnected });
    });

    socket.on("leave_player", ({ roomId, playerId }, callback) => {
      const result = gameManager.leavePlayer(roomId, playerId);
      if ("error" in result) {
        callback({ ok: false, error: result.error });
        return;
      }
      gameManager.unregisterSocket(socket.id);
      broadcast(io, roomId, result);
      callback({ ok: true, gameState: result });
    });

    socket.on("start_question", ({ roomId }, callback) => {
      const result = gameManager.startQuestion(roomId);
      if ("error" in result) {
        callback({ ok: false, error: result.error });
        return;
      }
      broadcast(io, roomId, result);
      emitAnswerToMasters(
        io,
        roomId,
        result,
        gameManager.getCurrentAnswer(roomId),
      );
      callback({ ok: true, gameState: result });
    });

    socket.on("stop_question", ({ roomId }, callback) => {
      const result = gameManager.stopQuestion(roomId);
      if ("error" in result) {
        callback({ ok: false, error: result.error });
        return;
      }
      broadcast(io, roomId, result);
      emitAnswerToMasters(
        io,
        roomId,
        result,
        gameManager.getCurrentAnswer(roomId),
      );
      callback({ ok: true, gameState: result });
    });

    socket.on("press_buzzer", ({ roomId, playerId }, callback) => {
      const result = gameManager.pressBuzzer(roomId, playerId);
      if ("error" in result) {
        const reasonMap = {
          room_not_found: "room_not_found",
          player_not_found: "player_not_found",
          question_not_open: "question_not_open",
          already_pressed: "already_pressed",
        } as const;
        callback({
          ok: false,
          reason: reasonMap[result.error],
          message: result.error,
        });
        return;
      }
      broadcast(io, roomId, result.gameState);
      callback({
        ok: true,
        buzzerEvent: result.buzzerEvent,
        gameState: result.gameState,
      });
    });

    socket.on("judge_answer", ({ roomId, playerId, result }, callback) => {
      const gameState = gameManager.judgeAnswer(roomId, playerId, result);
      if ("error" in gameState) {
        callback({ ok: false, error: gameState.error });
        return;
      }
      broadcast(io, roomId, gameState);
      callback({ ok: true, gameState });
    });

    socket.on("next_question", ({ roomId }, callback) => {
      const result = gameManager.nextQuestion(roomId);
      if ("error" in result) {
        callback({ ok: false, error: result.error });
        return;
      }
      broadcast(io, roomId, result);
      emitAnswerToMasters(io, roomId, result, null);
      callback({ ok: true, gameState: result });
    });

    socket.on(
      "set_panel_owner",
      ({ roomId, panelNumber, playerId }, callback) => {
        const result = gameManager.setPanelOwner(roomId, panelNumber, playerId);
        if ("error" in result) {
          callback({ ok: false, error: result.error });
          return;
        }
        broadcast(io, roomId, result);
        callback({ ok: true, gameState: result });
      },
    );

    socket.on("clear_panel_owner", ({ roomId, panelNumber }, callback) => {
      const result = gameManager.clearPanelOwner(roomId, panelNumber);
      if ("error" in result) {
        callback({ ok: false, error: result.error });
        return;
      }
      broadcast(io, roomId, result);
      callback({ ok: true, gameState: result });
    });

    socket.on("reset_all_panels", ({ roomId }, callback) => {
      const result = gameManager.resetAllPanels(roomId);
      if ("error" in result) {
        callback({ ok: false, error: result.error });
        return;
      }
      broadcast(io, roomId, result);
      callback({ ok: true, gameState: result });
    });

    socket.on("reset_game", ({ roomId }, callback) => {
      const result = gameManager.resetGame(roomId);
      if ("error" in result) {
        callback({ ok: false, error: result.error });
        return;
      }
      broadcast(io, roomId, result);
      emitAnswerToMasters(io, roomId, result, null);
      callback({ ok: true, gameState: result });
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on("set_panel_operation_mode" as any, ({ roomId, mode }: any) => {
      const result = gameManager.setPanelOperationMode(roomId, mode);
      if (!("error" in result)) {
        broadcast(io, roomId, result);
      }
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    socket.on("set_selected_player" as any, ({ roomId, playerId }: any) => {
      const result = gameManager.setSelectedPlayer(roomId, playerId ?? null);
      if (!("error" in result)) {
        broadcast(io, roomId, result);
      }
    });

    socket.on("disconnect", () => {
      const info = gameManager.unregisterSocket(socket.id);
      if (info) {
        const gameState = gameManager.disconnectPlayer(
          info.roomId,
          info.playerId,
        );
        if (gameState) {
          broadcast(io, info.roomId, gameState);
        }
      }
    });
  });
}
