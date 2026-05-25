"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getSocket } from "@/lib/socket";

export function RoomCreator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = () => {
    setLoading(true);
    setError(null);
    const socket = getSocket();
    if (!socket.connected) socket.connect();
    const doCreate = () => {
      socket.emit("create_room", {}, (result) => {
        if (result.ok) router.push(`/master/${result.roomId}`);
        else { setError("ルームの作成に失敗しました"); setLoading(false); }
      });
    };
    if (socket.connected) doCreate();
    else socket.once("connect", doCreate);
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center p-8 relative overflow-hidden"
      style={{
        background: `radial-gradient(ellipse 100% 80% at 50% 100%, var(--atk-orange-deep), var(--atk-orange) 40%, var(--atk-orange-light) 80%)`,
      }}
    >
      {/* Background stripes */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{
          backgroundImage: "repeating-linear-gradient(90deg, #fff 0px, #fff 1px, transparent 1px, transparent 48px)",
        }}
      />

      {/* Gold frame decoration */}
      <div
        className="absolute inset-6 rounded-3xl pointer-events-none opacity-20"
        style={{ border: "3px solid var(--atk-gold)" }}
      />

      <div className="relative z-10 flex flex-col items-center gap-8 w-full max-w-md">
        {/* Title */}
        <div className="flex flex-col items-center gap-1">
          <h1
            className="font-[family-name:var(--font-bebas-neue)] leading-none tracking-widest"
            style={{
              fontSize: "clamp(80px, 18vw, 140px)",
              color: "#fff",
              textShadow: "0 6px 20px rgba(0,0,0,0.3)",
              WebkitTextStroke: "1px rgba(0,0,0,0.08)",
            }}
          >
            ATTACK{" "}
            <span
              style={{
                color: "var(--atk-gold)",
                textShadow: "0 4px 16px rgba(0,0,0,0.3), 0 0 40px var(--atk-gold-glow)",
              }}
            >
              25
            </span>
          </h1>
          <p
            className="font-bold text-sm tracking-[0.3em] uppercase"
            style={{ color: "rgba(255,255,255,0.75)" }}
          >
            クイズゲーム
          </p>
        </div>

        {/* Panel color bar */}
        <div className="flex w-full max-w-xs gap-1.5 rounded-xl overflow-hidden p-1 bg-white/20">
          {["var(--panel-red)", "var(--panel-green)", "var(--panel-white)", "var(--panel-blue)"].map(
            (c, i) => (
              <div
                key={i}
                className="flex-1 h-3 rounded"
                style={{ background: c }}
              />
            )
          )}
        </div>

        {/* Create button */}
        <button
          onClick={handleCreate}
          disabled={loading}
          className="w-full py-5 rounded-2xl font-black text-xl tracking-wide transition-all hover:scale-[1.02] active:scale-[0.98] shadow-xl relative overflow-hidden"
          style={{
            background: loading
              ? "rgba(255,255,255,0.3)"
              : "var(--atk-gold)",
            color: loading ? "rgba(255,255,255,0.6)" : "#000",
            boxShadow: loading
              ? "none"
              : "0 4px 0 var(--atk-gold-dark), 0 8px 24px rgba(0,0,0,0.25)",
          }}
        >
          {!loading && (
            <div
              className="absolute inset-0 pointer-events-none"
              style={{ background: "linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)" }}
            />
          )}
          <span className="relative">{loading ? "作成中..." : "ゲームルームを作成"}</span>
        </button>

        {error && (
          <p className="text-sm font-bold bg-white/20 px-4 py-2 rounded-lg text-white">
            {error}
          </p>
        )}

        <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.6)" }}>
          ゲームマスターとしてルームを作成します
          <br />
          作成後、プレイヤーとボードのURLが表示されます
        </p>
      </div>
    </div>
  );
}
