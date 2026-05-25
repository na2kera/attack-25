import type { Panel, PlayerId } from "./game.js";

export const GRID_SIZE = 5;
export const FIRST_PANEL_NUMBER = 13;

const DIRECTIONS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1],
] as const;

function panelNumberToCoord(panelNumber: number): { row: number; col: number } {
  const index = panelNumber - 1;
  return {
    row: Math.floor(index / GRID_SIZE),
    col: index % GRID_SIZE,
  };
}

function coordToPanelNumber(row: number, col: number): number {
  return row * GRID_SIZE + col + 1;
}

function getPanelOwner(
  panels: Panel[],
  panelNumber: number,
): PlayerId | null {
  return panels.find((p) => p.number === panelNumber)?.ownerPlayerId ?? null;
}

/**
 * 指定パネルを playerId の色にしたあと、縦・横・斜め方向で
 * 挟まれた相手パネルの番号を返す（アタック25 / オセロ式）。
 */
export function getSandwichedPanelNumbers(
  panels: Panel[],
  placedPanelNumber: number,
  playerId: PlayerId,
): number[] {
  const { row, col } = panelNumberToCoord(placedPanelNumber);
  const toFlip = new Set<number>();

  for (const [dr, dc] of DIRECTIONS) {
    const sandwiched: number[] = [];
    let r = row + dr;
    let c = col + dc;

    while (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      const panelNumber = coordToPanelNumber(r, c);
      const owner = getPanelOwner(panels, panelNumber);

      if (owner === null) break;

      if (owner === playerId) {
        if (sandwiched.length > 0) {
          for (const n of sandwiched) toFlip.add(n);
        }
        break;
      }

      sandwiched.push(panelNumber);
      r += dr;
      c += dc;
    }
  }

  return [...toFlip];
}

function getAdjacentPanelNumbers(panelNumber: number): number[] {
  const { row, col } = panelNumberToCoord(panelNumber);
  const adjacent: number[] = [];

  for (const [dr, dc] of DIRECTIONS) {
    const r = row + dr;
    const c = col + dc;
    if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
      adjacent.push(coordToPanelNumber(r, c));
    }
  }

  return adjacent;
}

function isAdjacentToAnyOccupied(panelNumber: number, panels: Panel[]): boolean {
  return getAdjacentPanelNumbers(panelNumber).some(
    (n) => getPanelOwner(panels, n) !== null,
  );
}

export function countOccupiedPanels(panels: Panel[]): number {
  return panels.filter((p) => p.ownerPlayerId !== null).length;
}

export type PlacementRuleKind = "first_move" | "sandwich_required" | "adjacent_only";

/**
 * 現在の盤面とプレイヤーに対する合法手（空きマスの番号）を返す。
 *
 * 1. 初手: 13 のみ
 * 2. 挟める手がある: 挟める空きマスのみ（挟み必須）
 * 3. それ以外: いずれかの取得済みパネルに隣接する空きマス
 */
export function getValidPlacementPanelNumbers(
  panels: Panel[],
  playerId: PlayerId,
): number[] {
  const emptyPanels = panels.filter((p) => p.ownerPlayerId === null);

  if (countOccupiedPanels(panels) === 0) {
    return emptyPanels.some((p) => p.number === FIRST_PANEL_NUMBER)
      ? [FIRST_PANEL_NUMBER]
      : [];
  }

  const sandwichMoves = emptyPanels
    .filter(
      (p) =>
        getSandwichedPanelNumbers(panels, p.number, playerId).length > 0,
    )
    .map((p) => p.number);

  if (sandwichMoves.length > 0) {
    return sandwichMoves.sort((a, b) => a - b);
  }

  return emptyPanels
    .filter((p) => isAdjacentToAnyOccupied(p.number, panels))
    .map((p) => p.number)
    .sort((a, b) => a - b);
}

export function isValidPlacement(
  panels: Panel[],
  panelNumber: number,
  playerId: PlayerId,
): boolean {
  return getValidPlacementPanelNumbers(panels, playerId).includes(panelNumber);
}

export function getPlacementRuleKindForPlayer(
  panels: Panel[],
  playerId: PlayerId,
): PlacementRuleKind {
  if (countOccupiedPanels(panels) === 0) return "first_move";

  const hasSandwichMove = getValidPlacementPanelNumbers(panels, playerId).some(
    (n) => getSandwichedPanelNumbers(panels, n, playerId).length > 0,
  );

  return hasSandwichMove ? "sandwich_required" : "adjacent_only";
}
