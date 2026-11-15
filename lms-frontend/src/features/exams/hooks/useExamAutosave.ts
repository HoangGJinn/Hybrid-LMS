import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { readStoredJson } from '@shared/utils/storage';
import { examService } from '../api/exam.service';
import type { ExamAnswerInput } from '../types/exams.types';

const AUTOSAVE_INTERVAL_MS = 60_000;
const DEADLINE_SYNC_INTERVAL_MS = 15_000;

interface UseExamAutosaveInput {
  sessionId: string;
  initialSavedAnswers: Readonly<Record<string, string>>;
  initialDeadlineIso: string;
  initialServerNowIso: string;
}

const computeClientDeadline = (
  deadlineIso: string,
  serverNowIso: string,
): number => {
  const serverDeadline = new Date(deadlineIso).getTime();
  const serverNow = new Date(serverNowIso).getTime();
  const clockOffset = Number.isNaN(serverNow) ? 0 : serverNow - Date.now();
  return serverDeadline - clockOffset;
};

/**
 * Implements the 5-step Moodle/UTEx autosave lifecycle:
 * 1. Instant local state + `localStorage` draft on answer change, marking the question `dirty`.
 * 2. Periodic (60s) and action-based (page change, review dialog, tab hide) batch triggers.
 * 3. Background `PUT /api/exam-sessions/:sessionId/answers` with only changed questions.
 * 4. Updates the client deadline whenever the server returns an extended schedule.
 * 5. Tracks `savedQuestionIds` vs `dirtyQuestionIds` for QuestionPalette visual status,
 *    plus offline pause and automatic resync when connection returns.
 */
export const useExamAutosave = ({
  sessionId,
  initialSavedAnswers,
  initialDeadlineIso,
  initialServerNowIso,
}: UseExamAutosaveInput) => {
  const draftKey = `exam-draft-${sessionId}`;

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const localDraft = readStoredJson<Record<string, string>>(draftKey, {});
    return { ...initialSavedAnswers, ...localDraft };
  });

  const [savedQuestionIds, setSavedQuestionIds] = useState<ReadonlySet<string>>(
    () => new Set(Object.keys(initialSavedAnswers)),
  );

  const [dirtyQuestionIds, setDirtyQuestionIds] = useState<ReadonlySet<string>>(
    () => {
      const localDraft = readStoredJson<Record<string, string>>(draftKey, {});
      const dirty = new Set<string>();
      for (const [qId, optId] of Object.entries(localDraft)) {
        if (initialSavedAnswers[qId] !== optId) dirty.add(qId);
      }
      return dirty;
    },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isOfflineError, setIsOfflineError] = useState(false);
  const [deadlineMs, setDeadlineMs] = useState(() =>
    computeClientDeadline(initialDeadlineIso, initialServerNowIso),
  );

  const answersRef = useRef(answers);
  const dirtyRef = useRef(dirtyQuestionIds);
  const inFlightRef = useRef(false);
  const serverDeadlineMsRef = useRef(new Date(initialDeadlineIso).getTime());

  useEffect(() => {
    answersRef.current = answers;
    dirtyRef.current = dirtyQuestionIds;
  }, [answers, dirtyQuestionIds]);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(answers));
  }, [answers, draftKey]);

  const applyServerDeadline = useCallback(
    (deadlineIso: string, serverNowIso: string) => {
      const nextServerDeadlineMs = new Date(deadlineIso).getTime();
      const prevServerDeadlineMs = serverDeadlineMsRef.current;
      if (
        Number.isNaN(nextServerDeadlineMs) ||
        Number.isNaN(prevServerDeadlineMs)
      ) {
        return;
      }
      const deltaMs = nextServerDeadlineMs - prevServerDeadlineMs;
      if (Math.abs(deltaMs) < 1000) return;

      serverDeadlineMsRef.current = nextServerDeadlineMs;
      setDeadlineMs(computeClientDeadline(deadlineIso, serverNowIso));

      if (deltaMs > 0) {
        const addedMinutes = Math.max(1, Math.round(deltaMs / 60_000));
        toast.info(
          `Exam time extended by ${addedMinutes} ${addedMinutes === 1 ? 'minute' : 'minutes'}!`,
          {
            id: `deadline-extended-${nextServerDeadlineMs}`,
            description:
              'Your lecturer has extended the exam schedule. Your countdown timer has been updated automatically.',
            duration: 8000,
          },
        );
      }
    },
    [],
  );

  const flushDirty = useCallback(async (): Promise<boolean> => {
    const currentDirty = Array.from(dirtyRef.current);
    if (currentDirty.length === 0 || inFlightRef.current) return true;
    inFlightRef.current = true;
    setIsSaving(true);

    const snapshotAnswers = answersRef.current;
    const batch: ExamAnswerInput[] = currentDirty.map((questionId) => ({
      questionId,
      optionId: snapshotAnswers[questionId] ?? null,
    }));

    try {
      const result = await examService.saveAttemptAnswers(sessionId, batch);
      setIsOfflineError(false);
      applyServerDeadline(result.deadline, result.serverNow);

      const stillUnchanged = currentDirty.filter(
        (qId) =>
          (answersRef.current[qId] ?? null) === (snapshotAnswers[qId] ?? null),
      );
      setDirtyQuestionIds((prev) => {
        const next = new Set(prev);
        for (const qId of stillUnchanged) next.delete(qId);
        return next;
      });
      setSavedQuestionIds((prev) => {
        const next = new Set(prev);
        for (const qId of stillUnchanged) {
          if (answersRef.current[qId]) next.add(qId);
          else next.delete(qId);
        }
        return next;
      });
      return true;
    } catch {
      setIsOfflineError(true);
      return false;
    } finally {
      inFlightRef.current = false;
      setIsSaving(false);
    }
  }, [applyServerDeadline, sessionId]);

  /** Lightweight background check so lecturer schedule extensions update the timer without F5. */
  const syncDeadline = useCallback(async (): Promise<void> => {
    if (inFlightRef.current) return;
    try {
      const result = await examService.saveAttemptAnswers(sessionId, []);
      applyServerDeadline(result.deadline, result.serverNow);
    } catch {
      // Ignore background heartbeat failures; actual answer saves handle offline state.
    }
  }, [applyServerDeadline, sessionId]);

  const selectOption = useCallback(
    (questionId: string, optionId: string | null) => {
      setAnswers((prev) => {
        const next = { ...prev };
        if (optionId === null) delete next[questionId];
        else next[questionId] = optionId;
        return next;
      });
      setDirtyQuestionIds((prev) => {
        const next = new Set(prev);
        next.add(questionId);
        return next;
      });
      setSavedQuestionIds((prev) => {
        const next = new Set(prev);
        next.delete(questionId);
        return next;
      });
    },
    [],
  );

  // Sync any localStorage answers recovered on mount right away.
  useEffect(() => {
    if (dirtyRef.current.size > 0) {
      void flushDirty();
    }
  }, [flushDirty]);

  // Periodic time-based autosave every 60s when not paused by offline state.
  useEffect(() => {
    if (isOfflineError) return;
    const timer = window.setInterval(() => {
      if (dirtyRef.current.size > 0) {
        void flushDirty();
      }
    }, AUTOSAVE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [flushDirty, isOfflineError]);

  // Periodic lightweight deadline sync every 15s so lecturer schedule extensions apply automatically without F5.
  useEffect(() => {
    if (isOfflineError) return;
    const timer = window.setInterval(() => {
      void syncDeadline();
    }, DEADLINE_SYNC_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [isOfflineError, syncDeadline]);

  // Automatic resync when network connectivity returns, flush on tab hide, and deadline sync on tab focus.
  useEffect(() => {
    const handleOnline = () => {
      setIsOfflineError(false);
      void flushDirty();
      void syncDeadline();
    };
    const handleOffline = () => {
      setIsOfflineError(true);
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && dirtyRef.current.size > 0) {
        void flushDirty();
      } else if (document.visibilityState === 'visible') {
        void syncDeadline();
      }
    };
    const handleFocus = () => {
      void syncDeadline();
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [flushDirty, syncDeadline]);

  const clearLocalDraft = useCallback(() => {
    localStorage.removeItem(draftKey);
    localStorage.removeItem(`${draftKey}-flags`);
  }, [draftKey]);

  return {
    answers,
    savedQuestionIds,
    dirtyQuestionIds,
    isSaving,
    isOfflineError,
    deadlineMs,
    selectOption,
    flushDirty,
    clearLocalDraft,
  };
};
