"use client";

import { useEffect, useMemo, useState } from "react";
import type { QuestionState } from "@/types/game";

export function useAnswerTimer(q: QuestionState | null): {
  secondsLeft: number | null;
  isTimeUp: boolean;
  isPaused: boolean;
} {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (q?.answerDeadline == null) return;
    const id = setInterval(() => setNow(Date.now()), 100);
    return () => clearInterval(id);
  }, [q?.answerDeadline, q?.id]);

  return useMemo(() => {
    if (!q || (q.answerDeadline == null && q.answerTimeRemainingMs == null)) {
      return { secondsLeft: null, isTimeUp: false, isPaused: false };
    }

    if (q.answerDeadline == null && q.answerTimeRemainingMs != null) {
      return {
        secondsLeft: Math.ceil(q.answerTimeRemainingMs / 1000),
        isTimeUp: false,
        isPaused: true,
      };
    }

    if (q.answerDeadline != null) {
      const typingEndTime =
        q.typingStartedAt != null
          ? q.typingStartedAt + q.text.length * q.typingSpeedMs
          : 0;

      if (now < typingEndTime) {
        return { secondsLeft: null, isTimeUp: false, isPaused: false };
      }

      const remainingMs = Math.max(0, q.answerDeadline - now);
      return {
        secondsLeft: Math.ceil(remainingMs / 1000),
        isTimeUp: remainingMs === 0,
        isPaused: false,
      };
    }

    return { secondsLeft: null, isTimeUp: false, isPaused: false };
  }, [q, now]);
}
