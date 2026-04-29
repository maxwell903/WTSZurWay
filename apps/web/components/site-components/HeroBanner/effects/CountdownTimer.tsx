"use client";

import { useEffect, useState } from "react";
import type { HeroBannerData } from "../schema";

export type CountdownTimerProps = {
  countdown: NonNullable<HeroBannerData["countdown"]> | undefined;
};

const DEFAULT_EXPIRED_LABEL = "Now live";

// Renders days/hours/minutes/seconds remaining until `targetIso`. When the
// target is reached, switches to `expiredLabel`. setInterval(1000) lifecycle
// torn down on unmount. Purely visual — does not gate any behavior.
export function CountdownTimer({ countdown }: CountdownTimerProps) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!countdown) return;
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [countdown]);

  if (!countdown) return null;

  const targetMs = Date.parse(countdown.targetIso);
  if (Number.isNaN(targetMs)) return null;

  const remainingMs = targetMs - now;
  if (remainingMs <= 0) {
    return (
      <div data-hero-countdown="expired" style={baseStyle}>
        {countdown.expiredLabel ?? DEFAULT_EXPIRED_LABEL}
      </div>
    );
  }

  const totalSeconds = Math.floor(remainingMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return (
    <div data-hero-countdown="ticking" style={baseStyle}>
      {countdown.label ? (
        <div data-hero-countdown-label="true" style={{ fontSize: 12, opacity: 0.8 }}>
          {countdown.label}
        </div>
      ) : null}
      <div style={{ display: "flex", gap: 12 }}>
        <Unit value={days} label="d" />
        <Unit value={hours} label="h" />
        <Unit value={minutes} label="m" />
        <Unit value={seconds} label="s" />
      </div>
    </div>
  );
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <span data-hero-countdown-unit={label} style={{ fontVariantNumeric: "tabular-nums" }}>
      <span style={{ fontWeight: 700 }}>{value.toString().padStart(2, "0")}</span>
      <span style={{ fontSize: 11, marginLeft: 2, opacity: 0.7 }}>{label}</span>
    </span>
  );
}

const baseStyle: React.CSSProperties = {
  position: "absolute",
  bottom: 60,
  left: "50%",
  transform: "translateX(-50%)",
  zIndex: 4,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 4,
  color: "#ffffff",
  textShadow: "0 1px 2px rgba(0,0,0,0.5)",
};
