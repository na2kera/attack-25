import {
  GameState,
  Player,
  BuzzerEvent,
  PlayerId,
  RoomId,
  PanelOperationMode,
  PLAYER_NUMBER_TO_COLOR,
  createInitialPanels,
  createInitialQuestionState,
  generateId,
} from "../types/game.js";
import { getSandwichedPanelNumbers, isValidPlacement } from "../types/panel-flip.js";
import { selectRandomQuestion } from "./questions.js";

function generateRoomId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < 6; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return result;
}

function recalculateScores(gameState: GameState): void {
  for (const player of gameState.players) {
    player.score = gameState.panels.filter(
      (p) => p.ownerPlayerId === player.id,
    ).length;
  }
}

export class GameManager {
  private rooms = new Map<RoomId, GameState>();
  private currentAnswers = new Map<RoomId, string>();
  private usedQuestionIds = new Map<RoomId, Set<string>>();

  createRoom(): { roomId: RoomId; gameState: GameState } {
    let roomId: string;
    do {
      roomId = generateRoomId();
    } while (this.rooms.has(roomId));

    const now = Date.now();
    const gameState: GameState = {
      roomId,
      status: "waiting",
      players: [],
      panels: createInitialPanels(),
      currentQuestion: createInitialQuestionState(),
      selectedPlayerIdForPanelOperation: null,
      panelOperationMode: "set_owner",
      createdAt: now,
      updatedAt: now,
    };

    this.rooms.set(roomId, gameState);
    return { roomId, gameState };
  }

  getRoom(roomId: RoomId): GameState | undefined {
    return this.rooms.get(roomId);
  }

  joinPlayer(
    roomId: RoomId,
    name: string,
    playerId?: PlayerId,
  ):
    | { player: Player; gameState: GameState; reconnected: boolean }
    | { error: "room_not_found" | "room_full" | "invalid_name" } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    const trimmedName = name.trim();
    if (!trimmedName) return { error: "invalid_name" };

    // 再接続チェック
    if (playerId) {
      const existing = gameState.players.find((p) => p.id === playerId);
      if (existing) {
        existing.status = "active";
        existing.lastSeenAt = Date.now();
        gameState.updatedAt = Date.now();
        return { player: existing, gameState, reconnected: true };
      }
    }

    // 満員チェック（active なプレイヤー数）
    const activePlayers = gameState.players.filter(
      (p) => p.status === "active",
    );
    if (activePlayers.length >= 4) return { error: "room_full" };

    // 空き番号を探す
    const usedNumbers = new Set(
      gameState.players
        .filter((p) => p.status === "active")
        .map((p) => p.number),
    );
    const availableNumbers = ([1, 2, 3, 4] as const).filter(
      (n) => !usedNumbers.has(n),
    );
    const number = availableNumbers[0];
    const color = PLAYER_NUMBER_TO_COLOR[number];

    const now = Date.now();
    const player: Player = {
      id: generateId(),
      roomId,
      name: trimmedName,
      number,
      color,
      status: "active",
      score: 0,
      joinedAt: now,
      lastSeenAt: now,
    };

    gameState.players.push(player);
    if (gameState.status === "waiting") {
      gameState.status = "playing";
    }
    gameState.updatedAt = now;

    return { player, gameState, reconnected: false };
  }

  leavePlayer(
    roomId: RoomId,
    playerId: PlayerId,
  ): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return { error: "player_not_found" };

    player.status = "left";
    player.lastSeenAt = Date.now();
    gameState.updatedAt = Date.now();
    return gameState;
  }

  disconnectPlayer(roomId: RoomId, playerId: PlayerId): GameState | null {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return null;

    const player = gameState.players.find((p) => p.id === playerId);
    if (player && player.status === "active") {
      player.status = "disconnected";
      player.lastSeenAt = Date.now();
      gameState.updatedAt = Date.now();
    }
    return gameState;
  }

  startQuestion(roomId: RoomId): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    const q = gameState.currentQuestion;
    if (q.status !== "waiting") return { error: "question_not_waiting" };

    const usedIds = this.usedQuestionIds.get(roomId) ?? new Set<string>();
    const question = selectRandomQuestion(usedIds);
    if (!question) return { error: "no_more_questions" };

    usedIds.add(question.id);
    this.usedQuestionIds.set(roomId, usedIds);

    q.sourceQuestionId = question.id;
    q.text = question.text;
    q.status = "open";
    q.startedAt = Date.now();
    q.typingStartedAt = q.startedAt;
    q.typingStoppedAt = null;
    this.currentAnswers.set(roomId, question.answer);
    gameState.updatedAt = Date.now();
    return gameState;
  }

  getCurrentAnswer(roomId: RoomId): string | null {
    return this.currentAnswers.get(roomId) ?? null;
  }

  stopQuestion(roomId: RoomId): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    const q = gameState.currentQuestion;
    if (q.status !== "open" && q.status !== "answering")
      return { error: "question_not_open" };

    q.status = "waiting";
    q.endedAt = Date.now();
    q.typingStoppedAt = q.typingStoppedAt ?? q.endedAt;
    gameState.updatedAt = Date.now();
    return gameState;
  }

  pressBuzzer(
    roomId: RoomId,
    playerId: PlayerId,
  ):
    | { buzzerEvent: BuzzerEvent; gameState: GameState }
    | {
        error:
          | "room_not_found"
          | "player_not_found"
          | "question_not_open"
          | "already_pressed";
      } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    const player = gameState.players.find(
      (p) => p.id === playerId && p.status === "active",
    );
    if (!player) return { error: "player_not_found" };

    const q = gameState.currentQuestion;
    if (q.status !== "open") return { error: "question_not_open" };

    const alreadyPressed = q.buzzerEvents.some((e) => e.playerId === playerId);
    if (alreadyPressed) return { error: "already_pressed" };

    const order = q.buzzerEvents.length + 1;
    const buzzerEvent: BuzzerEvent = {
      id: generateId(),
      roomId,
      questionId: q.id,
      playerId,
      pressedAt: Date.now(),
      order,
      status: "pending",
    };

    q.buzzerEvents.push(buzzerEvent);

    // 最初の押下なら回答者に設定
    if (order === 1) {
      buzzerEvent.status = "current";
      q.currentAnswerPlayerId = playerId;
      q.status = "answering";
      q.typingStoppedAt = buzzerEvent.pressedAt;
    }

    gameState.updatedAt = Date.now();
    return { buzzerEvent, gameState };
  }

  judgeAnswer(
    roomId: RoomId,
    playerId: PlayerId,
    result: "correct" | "incorrect" | "invalid",
  ): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    const q = gameState.currentQuestion;
    const currentEvent = q.buzzerEvents.find(
      (e) => e.playerId === playerId && e.status === "current",
    );
    if (!currentEvent) return { error: "no_current_answer" };

    if (result === "correct") {
      currentEvent.status = "correct";
      q.correctPlayerId = playerId;
      q.currentAnswerPlayerId = null;
      q.status = "judged";
      q.endedAt = Date.now();

      // 正解者をパネル操作の選択プレイヤーに設定
      gameState.selectedPlayerIdForPanelOperation = playerId;

      const player = gameState.players.find((p) => p.id === playerId);
      if (player) player.lastSeenAt = Date.now();
    } else if (result === "incorrect") {
      currentEvent.status = "incorrect";

      // pending の中で最も order が小さいものを探す
      const nextEvent = q.buzzerEvents
        .filter((e) => e.status === "pending")
        .sort((a, b) => a.order - b.order)[0];

      if (nextEvent) {
        nextEvent.status = "current";
        q.currentAnswerPlayerId = nextEvent.playerId;
        // status は answering のまま
      } else {
        q.currentAnswerPlayerId = null;
        q.status = "judged";
        q.endedAt = Date.now();
      }
    } else {
      // invalid
      currentEvent.status = "invalid";

      const nextEvent = q.buzzerEvents
        .filter((e) => e.status === "pending")
        .sort((a, b) => a.order - b.order)[0];

      if (nextEvent) {
        nextEvent.status = "current";
        q.currentAnswerPlayerId = nextEvent.playerId;
      } else {
        q.currentAnswerPlayerId = null;
        // invalid の場合は open に戻す（再受付可能）
        q.status = "open";
      }
    }

    gameState.updatedAt = Date.now();
    return gameState;
  }

  nextQuestion(roomId: RoomId): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    gameState.currentQuestion = createInitialQuestionState();
    gameState.selectedPlayerIdForPanelOperation = null;
    this.currentAnswers.delete(roomId);
    gameState.updatedAt = Date.now();
    return gameState;
  }

  setPanelOwner(
    roomId: RoomId,
    panelNumber: number,
    playerId: PlayerId,
  ): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };
    if (panelNumber < 1 || panelNumber > 25) return { error: "invalid_panel" };

    const player = gameState.players.find((p) => p.id === playerId);
    if (!player) return { error: "player_not_found" };

    const panel = gameState.panels.find((p) => p.number === panelNumber);
    if (!panel) return { error: "panel_not_found" };

    if (panel.ownerPlayerId !== null) return { error: "panel_already_owned" };

    if (!isValidPlacement(gameState.panels, panelNumber, playerId)) {
      return { error: "invalid_placement" };
    }

    panel.ownerPlayerId = playerId;

    const sandwiched = getSandwichedPanelNumbers(
      gameState.panels,
      panelNumber,
      playerId,
    );
    for (const sandwichedNumber of sandwiched) {
      const sandwichedPanel = gameState.panels.find(
        (p) => p.number === sandwichedNumber,
      );
      if (sandwichedPanel) sandwichedPanel.ownerPlayerId = playerId;
    }

    recalculateScores(gameState);
    gameState.updatedAt = Date.now();
    return gameState;
  }

  clearPanelOwner(
    roomId: RoomId,
    panelNumber: number,
  ): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };
    if (panelNumber < 1 || panelNumber > 25) return { error: "invalid_panel" };

    const panel = gameState.panels.find((p) => p.number === panelNumber);
    if (!panel) return { error: "panel_not_found" };

    panel.ownerPlayerId = null;
    recalculateScores(gameState);
    gameState.updatedAt = Date.now();
    return gameState;
  }

  resetAllPanels(roomId: RoomId): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    for (const panel of gameState.panels) {
      panel.ownerPlayerId = null;
    }
    for (const player of gameState.players) {
      player.score = 0;
    }
    gameState.updatedAt = Date.now();
    return gameState;
  }

  resetGame(roomId: RoomId): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    gameState.players = [];
    gameState.panels = createInitialPanels();
    gameState.currentQuestion = createInitialQuestionState();
    gameState.selectedPlayerIdForPanelOperation = null;
    gameState.panelOperationMode = "set_owner";
    gameState.status = "waiting";
    this.currentAnswers.delete(roomId);
    gameState.updatedAt = Date.now();
    return gameState;
  }

  setPanelOperationMode(
    roomId: RoomId,
    mode: PanelOperationMode,
  ): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    gameState.panelOperationMode = mode;
    gameState.updatedAt = Date.now();
    return gameState;
  }

  setSelectedPlayer(
    roomId: RoomId,
    playerId: PlayerId | null,
  ): GameState | { error: string } {
    const gameState = this.rooms.get(roomId);
    if (!gameState) return { error: "room_not_found" };

    gameState.selectedPlayerIdForPanelOperation = playerId;
    gameState.updatedAt = Date.now();
    return gameState;
  }

  // socket の disconnect 時にどの room/player かを特定するための管理
  private socketToPlayer = new Map<
    string,
    { roomId: RoomId; playerId: PlayerId }
  >();

  registerSocket(socketId: string, roomId: RoomId, playerId: PlayerId): void {
    this.socketToPlayer.set(socketId, { roomId, playerId });
  }

  unregisterSocket(
    socketId: string,
  ): { roomId: RoomId; playerId: PlayerId } | null {
    const info = this.socketToPlayer.get(socketId);
    this.socketToPlayer.delete(socketId);
    return info ?? null;
  }
}
