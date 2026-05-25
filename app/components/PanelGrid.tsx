"use client";

import type { Panel, Player } from "@/types/game";

// Exact show colors: vivid solid fills with darker border
const PANEL_CFG: Record<string, {
  bg: string; border: string; numColor: string; nameColor: string;
}> = {
  red: {
    bg: "var(--panel-red)",
    border: "var(--panel-red-dark)",
    numColor: "#fff",
    nameColor: "rgba(255,255,255,0.9)",
  },
  green: {
    bg: "var(--panel-green)",
    border: "var(--panel-green-dark)",
    numColor: "#fff",
    nameColor: "rgba(255,255,255,0.9)",
  },
  white: {
    bg: "var(--panel-white)",
    border: "var(--panel-white-dark)",
    numColor: "#111",
    nameColor: "#444",
  },
  blue: {
    bg: "var(--panel-blue)",
    border: "var(--panel-blue-dark)",
    numColor: "#fff",
    nameColor: "rgba(255,255,255,0.9)",
  },
};

type Props = {
  panels: Panel[];
  players: Player[];
  onPanelClick?: (panelNumber: number) => void;
  interactive?: boolean;
  selectedPanelNumbers?: number[];
};

export function PanelGrid({
  panels,
  players,
  onPanelClick,
  interactive = false,
  selectedPanelNumbers = [],
}: Props) {
  const getOwner = (id: string | null) =>
    id ? players.find((p) => p.id === id) : null;

  return (
    <div
      className="grid grid-cols-5 w-full"
      style={{ gap: "4px" }}
    >
      {panels.map((panel) => {
        const owner = getOwner(panel.ownerPlayerId);
        const cfg = owner ? PANEL_CFG[owner.color] : null;
        const isSelected = selectedPanelNumbers.includes(panel.number);

        return (
          <button
            key={panel.number}
            disabled={!interactive}
            onClick={() => interactive && onPanelClick?.(panel.number)}
            className="aspect-square relative flex flex-col items-center justify-center rounded-md transition-all duration-150 select-none overflow-hidden"
            style={{
              background: cfg ? cfg.bg : "var(--panel-empty)",
              border: `2px solid ${cfg ? cfg.border : "var(--panel-empty-dark)"}`,
              boxShadow: cfg
                ? `inset 0 1px 0 rgba(255,255,255,0.25), 0 2px 4px rgba(0,0,0,0.3)`
                : `inset 0 1px 0 rgba(255,255,255,0.5), 0 1px 3px rgba(0,0,0,0.15)`,
              outline: isSelected ? "3px solid var(--atk-gold)" : undefined,
              outlineOffset: isSelected ? "2px" : undefined,
              cursor: interactive ? "pointer" : "default",
              transform: undefined,
            }}
            onMouseEnter={(e) => interactive && ((e.currentTarget as HTMLElement).style.filter = "brightness(1.12)")}
            onMouseLeave={(e) => interactive && ((e.currentTarget as HTMLElement).style.filter = "")}
            onMouseDown={(e) => interactive && ((e.currentTarget as HTMLElement).style.transform = "scale(0.93)")}
            onMouseUp={(e) => interactive && ((e.currentTarget as HTMLElement).style.transform = "")}
          >
            {/* Shine */}
            <div
              className="absolute inset-0 pointer-events-none"
              style={{
                background: "linear-gradient(135deg, rgba(255,255,255,0.18) 0%, transparent 50%)",
              }}
            />

            {/* Number */}
            <span
              className="font-[family-name:var(--font-bebas-neue)] leading-none select-none relative"
              style={{
                fontSize: "clamp(18px, 4cqw, 38px)",
                containerType: "inline-size",
                color: cfg ? cfg.numColor : "#6b5a3a",
                textShadow: cfg ? "0 1px 3px rgba(0,0,0,0.35)" : "none",
              }}
            >
              {panel.number}
            </span>

            {/* Owner name (small) */}
            {owner && (
              <span
                className="text-[9px] font-bold leading-none truncate w-full text-center px-0.5 mt-0.5 relative"
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
