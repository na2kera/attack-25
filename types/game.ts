export type RoomId = string;
export type PlayerId = string;
export type QuestionId = string;

export type PlayerColor = "red" | "green" | "white" | "blue";

export type GameStatus = "waiting" | "playing" | "finished";

export type QuestionStatus = "waiting" | "open" | "answering" | "judged";

export type PlayerStatus = "active" | "disconnected" | "left";

export type BuzzerStatus =
  | "pending"
  | "current"
  | "correct"
  | "incorrect"
  | "invalid";

export type PanelOperationMode = "set_owner" | "clear_owner";

export type Question = {
  id: string;
  text: string;
  answer: string;
};

export type Player = {
  id: PlayerId;
  roomId: RoomId;
  name: string;
  number: 1 | 2 | 3 | 4;
  color: PlayerColor;
  status: PlayerStatus;
  score: number;
  penaltyRemainingTurns: number;
  joinedAt: number;
  lastSeenAt: number;
};

export type Panel = {
  number: number; // 1〜25
  ownerPlayerId: PlayerId | null;
};

export type BuzzerEvent = {
  id: string;
  roomId: RoomId;
  questionId: QuestionId;
  playerId: PlayerId;
  pressedAt: number;
  order: number;
  status: BuzzerStatus;
};

export type QuestionState = {
  id: QuestionId;
  sourceQuestionId: string | null;
  text: string;
  status: QuestionStatus;
  buzzerEvents: BuzzerEvent[];
  currentAnswerPlayerId: PlayerId | null;
  correctPlayerId: PlayerId | null;
  startedAt: number | null;
  endedAt: number | null;
  typingStartedAt: number | null;
  typingStoppedAt: number | null;
  typingSpeedMs: number;
  isAttackChance: boolean;
};

export type GameState = {
  roomId: RoomId;
  status: GameStatus;
  players: Player[];
  panels: Panel[];
  currentQuestion: QuestionState;
  selectedPlayerIdForPanelOperation: PlayerId | null;
  panelOperationMode: PanelOperationMode;
  attackChancePanelRemovalPending: boolean;
  createdAt: number;
  updatedAt: number;
};

export const PLAYER_COLORS: PlayerColor[] = ["red", "green", "white", "blue"];

export const PLAYER_NUMBER_TO_COLOR: Record<1 | 2 | 3 | 4, PlayerColor> = {
  1: "red",
  2: "green",
  3: "white",
  4: "blue",
};

export function createInitialPanels(): Panel[] {
  return Array.from({ length: 25 }, (_, index) => ({
    number: index + 1,
    ownerPlayerId: null,
  }));
}

export function createInitialQuestionState(): QuestionState {
  return {
    id: generateId(),
    sourceQuestionId: null,
    text: "",
    status: "waiting",
    buzzerEvents: [],
    currentAnswerPlayerId: null,
    correctPlayerId: null,
    startedAt: null,
    endedAt: null,
    typingStartedAt: null,
    typingStoppedAt: null,
    typingSpeedMs: 90,
    isAttackChance: false,
  };
}

export function generateId(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}
