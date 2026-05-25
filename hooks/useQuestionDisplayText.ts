"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuestionState } from "@/types/game";

function getVisibleLength(q: QuestionState, now: number): number {
  if (!q.text || !q.typingStartedAt) return 0;

  const targetTime = q.typingStoppedAt ?? now;
  const elapsed = Math.max(0, targetTime - q.typingStartedAt);
  return Math.min(q.text.length, Math.floor(elapsed / q.typingSpeedMs) + 1);
}

export function useQuestionDisplayText(q: QuestionState): {
  displayText: string;
  isTyping: boolean;
  isStopped: boolean;
} {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!q.text || !q.typingStartedAt || q.typingStoppedAt) {
      return;
    }

    const intervalId = window.setInterval(
      () => setNow(Date.now()),
      Math.max(16, q.typingSpeedMs),
    );
    return () => window.clearInterval(intervalId);
  }, [q.id, q.text, q.typingStartedAt, q.typingStoppedAt, q.typingSpeedMs]);

  return useMemo(() => {
    const visibleLength = getVisibleLength(q, now);
    const displayText = q.text.slice(0, visibleLength);
    const isComplete = Boolean(q.text) && visibleLength >= q.text.length;
    const isTyping = Boolean(
      q.text && q.typingStartedAt && !q.typingStoppedAt && !isComplete,
    );
    const isStopped = Boolean(q.text && q.typingStoppedAt && !isComplete);

    return { displayText, isTyping, isStopped };
  }, [q, now]);
}
