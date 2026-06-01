import type {
  RoomId,
  PlayerId,
  GameState,
  Player,
  BuzzerEvent,
} from "./game.js";

export type SocketCallback<T> = (response: T) => void;

export type ActionResult =
  | { ok: true; gameState: GameState }
  | { ok: false; error: string };

// Payloads
export type CreateRoomPayload = Record<string, never>;

export type CreateRoomResult =
  | {
      ok: true;
      roomId: RoomId;
      masterUrl: string;
      playerUrl: string;
      boardUrl: string;
      gameState: GameState;
    }
  | { ok: false; error: string };

export type JoinRoomAsMasterPayload = { roomId: RoomId };
export type JoinRoomAsMasterResult = ActionResult;

export type JoinRoomAsBoardPayload = { roomId: RoomId };
export type JoinRoomAsBoardResult = ActionResult;

export type JoinRoomAsPlayerPayload = {
  roomId: RoomId;
  name: string;
  playerId?: PlayerId;
};

export type JoinRoomAsPlayerResult =
  | {
      ok: true;
      player: Player;
      gameState: GameState;
      reconnected: boolean;
    }
  | {
      ok: false;
      reason: "room_not_found" | "room_full" | "invalid_name";
      message: string;
    };

export type LeavePlayerPayload = { roomId: RoomId; playerId: PlayerId };
export type LeavePlayerResult = ActionResult;

export type StartQuestionPayload = { roomId: RoomId };
export type StopQuestionPayload = { roomId: RoomId };

export type PressBuzzerPayload = { roomId: RoomId; playerId: PlayerId };
export type PressBuzzerResult =
  | { ok: true; buzzerEvent: BuzzerEvent; gameState: GameState }
  | {
      ok: false;
      reason:
        | "room_not_found"
        | "player_not_found"
        | "question_not_open"
        | "already_pressed"
        | "player_penalized";
      message: string;
    };

export type JudgeResult = "correct" | "incorrect" | "invalid";
export type JudgeAnswerPayload = {
  roomId: RoomId;
  playerId: PlayerId;
  result: JudgeResult;
};

export type NextQuestionPayload = { roomId: RoomId };

export type SetPanelOwnerPayload = {
  roomId: RoomId;
  panelNumber: number;
  playerId: PlayerId;
};

export type ClearPanelOwnerPayload = { roomId: RoomId; panelNumber: number };
export type ResetAllPanelsPayload = { roomId: RoomId };
export type ResetGamePayload = { roomId: RoomId };
export type SkipAttackChancePanelRemovalPayload = { roomId: RoomId };

export type GameStateUpdatedPayload = { roomId: RoomId; gameState: GameState; serverTime: number };
export type QuestionAnswerUpdatedPayload = {
  roomId: RoomId;
  questionId: string | null;
  answer: string | null;
};
export type ErrorPayload = { message: string };

// Socket event maps
export type ClientToServerEvents = {
  create_room: (
    payload: CreateRoomPayload,
    callback: SocketCallback<CreateRoomResult>,
  ) => void;

  join_room_as_master: (
    payload: JoinRoomAsMasterPayload,
    callback: SocketCallback<JoinRoomAsMasterResult>,
  ) => void;

  join_room_as_board: (
    payload: JoinRoomAsBoardPayload,
    callback: SocketCallback<JoinRoomAsBoardResult>,
  ) => void;

  join_room_as_player: (
    payload: JoinRoomAsPlayerPayload,
    callback: SocketCallback<JoinRoomAsPlayerResult>,
  ) => void;

  leave_player: (
    payload: LeavePlayerPayload,
    callback: SocketCallback<LeavePlayerResult>,
  ) => void;

  start_question: (
    payload: StartQuestionPayload,
    callback: SocketCallback<ActionResult>,
  ) => void;

  stop_question: (
    payload: StopQuestionPayload,
    callback: SocketCallback<ActionResult>,
  ) => void;

  press_buzzer: (
    payload: PressBuzzerPayload,
    callback: SocketCallback<PressBuzzerResult>,
  ) => void;

  judge_answer: (
    payload: JudgeAnswerPayload,
    callback: SocketCallback<ActionResult>,
  ) => void;

  next_question: (
    payload: NextQuestionPayload,
    callback: SocketCallback<ActionResult>,
  ) => void;

  set_panel_owner: (
    payload: SetPanelOwnerPayload,
    callback: SocketCallback<ActionResult>,
  ) => void;

  clear_panel_owner: (
    payload: ClearPanelOwnerPayload,
    callback: SocketCallback<ActionResult>,
  ) => void;

  reset_all_panels: (
    payload: ResetAllPanelsPayload,
    callback: SocketCallback<ActionResult>,
  ) => void;

  reset_game: (
    payload: ResetGamePayload,
    callback: SocketCallback<ActionResult>,
  ) => void;

  skip_attack_chance_panel_removal: (
    payload: SkipAttackChancePanelRemovalPayload,
    callback: SocketCallback<ActionResult>,
  ) => void;
};

export type ServerToClientEvents = {
  game_state_updated: (payload: GameStateUpdatedPayload) => void;
  question_answer_updated: (payload: QuestionAnswerUpdatedPayload) => void;
  room_not_found: (payload: ErrorPayload) => void;
  player_kicked: (payload: { roomId: RoomId; playerId: PlayerId }) => void;
};
