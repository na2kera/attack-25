"use client";

import QRCode from "react-qr-code";

type QrCodeProps = {
  value: string;
  label: string;
  size?: number;
};

export function QrCode({ value, label, size = 168 }: QrCodeProps) {
  if (!value) {
    return (
      <div className="flex h-40 w-40 items-center justify-center rounded-lg bg-gray-700 p-3 text-center text-xs text-gray-300">
        QRを生成できません
      </div>
    );
  }

  return (
    <div
      className="rounded-lg bg-white p-3"
      style={{ lineHeight: 0 }}
      aria-label={label}
      role="img"
    >
      <QRCode
        value={value}
        size={size}
        level="M"
        bgColor="#FFFFFF"
        fgColor="#000000"
      />
    </div>
  );
}
