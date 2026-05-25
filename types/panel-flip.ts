import type { Panel, PlayerId } from "./game.js";

const GRID_SIZE = 5;

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
