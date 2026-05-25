"use client";

import type { Panel, Player } from "@/types/game";

const PANEL_CFG: Record<string, {
  bg: string; border: string; numColor: string; nameColor: string; gradient: string;
}> = {
  red: {
    bg: "var(--panel-red)",
    border: "var(--panel-red-dark)",
    numColor: "#fff",
    nameColor: "rgba(255,255,255,0.9)",
    gradient: "linear-gradient(180deg, var(--panel-red-light) 0%, var(--panel-red) 40%, var(--panel-red-dark) 100%)",
  },
  green: {
    bg: "var(--panel-green)",
    border: "var(--panel-green-dark)",
    numColor: "#fff",
    nameColor: "rgba(255,255,255,0.9)",
    gradient: "linear-gradient(180deg, var(--panel-green-light) 0%, var(--panel-green) 40%, var(--panel-green-dark) 100%)",
  },
  white: {
    bg: "var(--panel-white)",
    border: "var(--panel-white-dark)",
    numColor: "#222",
    nameColor: "#444",
    gradient: "linear-gradient(180deg, var(--panel-white-light) 0%, var(--panel-white) 40%, var(--panel-white-dark) 100%)",
  },
  blue: {
    bg: "var(--panel-blue)",
    border: "var(--panel-blue-dark)",
    numColor: "#fff",
    nameColor: "rgba(255,255,255,0.9)",
    gradient: "linear-gradient(180deg, var(--panel-blue-light) 0%, var(--panel-blue) 40%, var(--panel-blue-dark) 100%)",
  },
};

type Props = {
  panels: Panel[];
  players: Player[];
  onPanelClick?: (panelNumber: number) => void;
  interactive?: boolean;
  selectedPanelNumbers?: number[];
  /** 合法手。指定時はそれ以外のクリックを無効化 */
  validPanelNumbers?: number[];
};

export function PanelGrid({
  panels,
  players,
  onPanelClick,
  interactive = false,
  selectedPanelNumbers = [],
  validPanelNumbers,
}: Props) {
  const getOwner = (id: string | null) =>
    id ? players.find((p) => p.id === id) : null;

  const hasValidMoveHints = validPanelNumbers !== undefined;
  const restrictClicks = interactive && hasValidMoveHints;

  return (
    <div
      className="grid grid-cols-5 w-full"
      style={{ gap: "3px", background: "#1a1a1a" }}
    >
      {panels.map((panel) => {
        const owner = getOwner(panel.ownerPlayerId);
        const cfg = owner ? PANEL_CFG[owner.color] : null;
        const isSelected = selectedPanelNumbers.includes(panel.number);
        const isValid =
          !hasValidMoveHints || validPanelNumbers.includes(panel.number);
        const isHighlighted = hasValidMoveHints && isValid && !owner;

        return (
          <button
            key={panel.number}
            disabled={!interactive || (restrictClicks && !isValid)}
            onClick={() =>
              interactive && isValid && onPanelClick?.(panel.number)
            }
            className="aspect-square relative flex flex-col items-center justify-center transition-all duration-150 select-none overflow-hidden"
            style={{
              background: cfg ? cfg.gradient : "linear-gradient(180deg, #f5f0e0 0%, #e8dcc0 40%, #d4c8a8 100%)",
              border: `1px solid ${cfg ? cfg.border : "var(--panel-empty-dark)"}`,
              boxShadow: cfg
                ? "inset 0 1px 0 rgba(255,255,255,0.2)"
                : "inset 0 1px 0 rgba(255,255,255,0.4)",
              outline: isSelected || isHighlighted
                ? "3px solid var(--atk-gold)"
                : undefined,
              outlineOffset: isSelected || isHighlighted ? "1px" : undefined,
              opacity: hasValidMoveHints && !isValid && !owner ? 0.45 : 1,
              cursor: interactive && isValid ? "pointer" : "default",
            }}
            onMouseEnter={(e) =>
              interactive &&
              isValid &&
              ((e.currentTarget as HTMLElement).style.filter = "brightness(1.12)")
            }
            onMouseLeave={(e) =>
              interactive && ((e.currentTarget as HTMLElement).style.filter = "")
            }
            onMouseDown={(e) =>
              interactive &&
              isValid &&
              ((e.currentTarget as HTMLElement).style.transform = "scale(0.93)")
            }
            onMouseUp={(e) =>
              interactive && ((e.currentTarget as HTMLElement).style.transform = "")
            }
          >
            {/* Number */}
            <span
              className="font-[family-name:var(--font-bebas-neue)] leading-none select-none relative"
              style={{
                fontSize: "clamp(20px, 4.5cqw, 42px)",
                containerType: "inline-size",
                color: cfg ? cfg.numColor : "#6b5a3a",
                textShadow: cfg ? "0 1px 2px rgba(0,0,0,0.4)" : "none",
                fontWeight: 700,
              }}
            >
              {panel.number}
            </span>

            {/* Owner name */}
            {owner && (
              <span
                className="text-[8px] font-bold leading-none truncate w-full text-center px-0.5 mt-0.5 relative"
                style={{ color: cfg?.nameColor }}
              >
                {owner.name}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
