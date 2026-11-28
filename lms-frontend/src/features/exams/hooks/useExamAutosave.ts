import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { readStoredJson } from '@shared/utils/storage';
import { examService } from '../api/exam.service';
import type {
  ExamAnswerInput,
  StudentExamQuestion,
} from '../types/exams.types';

const AUTOSAVE_INTERVAL_MS = 60_000;
const DEADLINE_SYNC_INTERVAL_MS = 15_000;
const TEXT_SAVE_DEBOUNCE_MS = 600;

export interface StudentQuestionDraftAnswer {
  optionIds: string[];
  textAnswers: string[];
}

export type QuestionAnswerState = 'UNANSWERED' | 'PARTIAL' | 'ANSWERED';

export const getQuestionAnswerState = (
  question: StudentExamQuestion,
  answer: StudentQuestionDraftAnswer | undefined,
): QuestionAnswerState => {
  const type = question.type ?? 'MULTIPLE_CHOICE';
  const requiredCount = question.correctCount ?? 1;
  if (type === 'FILL_IN_THE_BLANK') {
    const filled = Array.from(
      { length: requiredCount },
      (_, idx) => (answer?.textAnswers[idx] ?? '').trim(),
    ).filter((t) => t !== '').length;
    if (filled === 0) return 'UNANSWERED';
    if (filled < requiredCount) return 'PARTIAL';
    return 'ANSWERED';
  }
  const selected = answer?.optionIds.length ?? 0;
  if (selected === 0) return 'UNANSWERED';
  if (requiredCount > 1 && selected < requiredCount) return 'PARTIAL';
  return 'ANSWERED';
};

export const hasAnyDraftContent = (
  answer: StudentQuestionDraftAnswer | undefined,
): boolean =>
  Boolean(
    answer &&
      (answer.optionIds.length > 0 ||
        answer.textAnswers.some((text) => text.trim() !== '')),
  );

const isDraftEqual = (
  a: StudentQuestionDraftAnswer | undefined,
  b: StudentQuestionDraftAnswer | undefined,
): boolean => {
  const optA = a?.optionIds ?? [];
  const optB = b?.optionIds ?? [];
  if (optA.length !== optB.length) return false;
  for (let i = 0; i < optA.length; i += 1) {
    if (optA[i] !== optB[i]) return false;
  }
  const txtA = a?.textAnswers ?? [];
  const txtB = b?.textAnswers ?? [];
  const maxLen = Math.max(txtA.length, txtB.length);
  for (let i = 0; i < maxLen; i += 1) {
    if ((txtA[i] ?? '') !== (txtB[i] ?? '')) return false;
  }
  return true;
};

const buildQuestionAnswerInput = (
  question: StudentExamQuestion | undefined,
  draft: StudentQuestionDraftAnswer | undefined,
  questionId: string,
): ExamAnswerInput => {
  const type = question?.type ?? 'MULTIPLE_CHOICE';
  if (type === 'FILL_IN_THE_BLANK') {
    return {
      questionId,
      textAnswers: draft?.textAnswers ?? [],
    };
  }
  const optionIds = draft?.optionIds ?? [];
  if ((question?.correctCount ?? 1) > 1) {
    return {
      questionId,
      optionIds,
    };
  }
  return {
    questionId,
    optionId: optionIds[0] ?? null,
    optionIds,
  };
};

export const buildSubmitPayload = (
  questions: readonly StudentExamQuestion[],
  draftAnswers: Readonly<Record<string, StudentQuestionDraftAnswer>>,
): ExamAnswerInput[] =>
  questions.map((question) =>
    buildQuestionAnswerInput(question, draftAnswers[question.id], question.id),
  );

const buildServerDraftMap = (
  initialSavedAnswers: Readonly<Record<string, string>>,
  initialSavedMultiAnswers?: Readonly<Record<string, readonly string[]>>,
  initialSavedTextAnswers?: Readonly<Record<string, readonly string[]>>,
): Record<string, StudentQuestionDraftAnswer> => {
  const keys = new Set<string>([
    ...Object.keys(initialSavedAnswers),
    ...Object.keys(initialSavedMultiAnswers ?? {}),
    ...Object.keys(initialSavedTextAnswers ?? {}),
  ]);
  const map: Record<string, StudentQuestionDraftAnswer> = {};
  for (const qId of keys) {
    const multi = initialSavedMultiAnswers?.[qId];
    const single = initialSavedAnswers[qId];
    const optionIds =
      multi && multi.length > 0 ? [...multi] : single ? [single] : [];
    const textAnswers = [...(initialSavedTextAnswers?.[qId] ?? [])];
    map[qId] = { optionIds, textAnswers };
  }
  return map;
};

interface UseExamAutosaveInput {
  sessionId: string;
  questions?: readonly StudentExamQuestion[];
  initialSavedAnswers: Readonly<Record<string, string>>;
  initialSavedMultiAnswers?: Readonly<Record<string, readonly string[]>>;
  initialSavedTextAnswers?: Readonly<Record<string, readonly string[]>>;
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
 * Implements the 5-step Moodle/UTEx autosave lifecycle for single-choice MCQ, multi-select MCQ,
 * and cloze fill-in-the-blank answers:
 * 1. Instant local state + `localStorage` draft on answer change, marking the question `dirty`.
 * 2. Periodic (60s), debounced (600ms for text typing), and action-based batch triggers.
 * 3. Background `PUT /api/exam-sessions/:sessionId/answers` with only changed questions.
 * 4. Updates the client deadline whenever the server returns an extended schedule.
 * 5. Tracks `savedQuestionIds` vs `dirtyQuestionIds` for QuestionPalette visual status,
 *    plus offline pause and automatic resync when connection returns.
 */
export const useExamAutosave = ({
  sessionId,
  questions = [],
  initialSavedAnswers,
  initialSavedMultiAnswers,
  initialSavedTextAnswers,
  initialDeadlineIso,
  initialServerNowIso,
}: UseExamAutosaveInput) => {
  const legacyDraftKey = `exam-draft-${sessionId}`;
  const draftKey = `${legacyDraftKey}-v2`;

  const questionById = useMemo(
    () => new Map(questions.map((q) => [q.id, q])),
    [questions],
  );

  const initialServerMap = useMemo(
    () =>
      buildServerDraftMap(
        initialSavedAnswers,
        initialSavedMultiAnswers,
        initialSavedTextAnswers,
      ),
    [initialSavedAnswers, initialSavedMultiAnswers, initialSavedTextAnswers],
  );

  const [draftAnswers, setDraftAnswers] = useState<
    Record<string, StudentQuestionDraftAnswer>
  >(() => {
    const localV2 = readStoredJson<Record<string, StudentQuestionDraftAnswer>>(
      draftKey,
      {},
    );
    const localV1 = readStoredJson<Record<string, string>>(legacyDraftKey, {});
    const merged: Record<string, StudentQuestionDraftAnswer> = {
      ...initialServerMap,
    };
    for (const [qId, optId] of Object.entries(localV1)) {
      if (!(qId in localV2)) {
        merged[qId] = { optionIds: optId ? [optId] : [], textAnswers: [] };
      }
    }
    for (const [qId, val] of Object.entries(localV2)) {
      merged[qId] = {
        optionIds: [...(val.optionIds ?? [])],
        textAnswers: [...(val.textAnswers ?? [])],
      };
    }
    return merged;
  });

  const [dirtyQuestionIds, setDirtyQuestionIds] = useState<ReadonlySet<string>>(
    () => {
      const localV2 = readStoredJson<Record<string, StudentQuestionDraftAnswer>>(
        draftKey,
        {},
      );
      const localV1 = readStoredJson<Record<string, string>>(legacyDraftKey, {});
      const dirty = new Set<string>();
      for (const [qId, optId] of Object.entries(localV1)) {
        if (!(qId in localV2)) {
          const draft = { optionIds: optId ? [optId] : [], textAnswers: [] };
          if (!isDraftEqual(draft, initialServerMap[qId])) dirty.add(qId);
        }
      }
      for (const [qId, val] of Object.entries(localV2)) {
        if (!isDraftEqual(val, initialServerMap[qId])) dirty.add(qId);
      }
      return dirty;
    },
  );

  const [savedQuestionIds, setSavedQuestionIds] = useState<ReadonlySet<string>>(
    () => {
      const saved = new Set<string>();
      for (const [qId, val] of Object.entries(initialServerMap)) {
        if (hasAnyDraftContent(val)) saved.add(qId);
      }
      return saved;
    },
  );

  const [isSaving, setIsSaving] = useState(false);
  const [isOfflineError, setIsOfflineError] = useState(false);
  const [deadlineMs, setDeadlineMs] = useState(() =>
    computeClientDeadline(initialDeadlineIso, initialServerNowIso),
  );

  const answersRef = useRef(draftAnswers);
  const dirtyRef = useRef(dirtyQuestionIds);
  const questionByIdRef = useRef(questionById);
  const inFlightRef = useRef(false);
  const textDebounceTimerRef = useRef<number | null>(null);
  const serverDeadlineMsRef = useRef(new Date(initialDeadlineIso).getTime());

  useEffect(() => {
    answersRef.current = draftAnswers;
    dirtyRef.current = dirtyQuestionIds;
  }, [draftAnswers, dirtyQuestionIds]);

  useEffect(() => {
    questionByIdRef.current = questionById;
  }, [questionById]);

  useEffect(() => {
    localStorage.setItem(draftKey, JSON.stringify(draftAnswers));
  }, [draftAnswers, draftKey]);

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
    if (textDebounceTimerRef.current !== null) {
      window.clearTimeout(textDebounceTimerRef.current);
      textDebounceTimerRef.current = null;
    }
    const currentDirty = Array.from(dirtyRef.current);
    if (currentDirty.length === 0 || inFlightRef.current) return true;
    inFlightRef.current = true;
    setIsSaving(true);

    const snapshotAnswers = answersRef.current;
    const batch: ExamAnswerInput[] = currentDirty.map((questionId) =>
      buildQuestionAnswerInput(
        questionByIdRef.current.get(questionId),
        snapshotAnswers[questionId],
        questionId,
      ),
    );

    try {
      const result = await examService.saveAttemptAnswers(sessionId, batch);
      setIsOfflineError(false);
      applyServerDeadline(result.deadline, result.serverNow);

      const stillUnchanged = currentDirty.filter((qId) =>
        isDraftEqual(answersRef.current[qId], snapshotAnswers[qId]),
      );
      setDirtyQuestionIds((prev) => {
        const next = new Set(prev);
        for (const qId of stillUnchanged) next.delete(qId);
        return next;
      });
      setSavedQuestionIds((prev) => {
        const next = new Set(prev);
        for (const qId of stillUnchanged) {
          if (hasAnyDraftContent(answersRef.current[qId])) next.add(qId);
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

  const markQuestionDirty = useCallback((questionId: string) => {
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
  }, []);

  const selectSingleOption = useCallback(
    (questionId: string, optionId: string | null) => {
      setDraftAnswers((prev) => {
        const next = { ...prev };
        if (optionId === null) {
          delete next[questionId];
        } else {
          next[questionId] = { optionIds: [optionId], textAnswers: [] };
        }
        return next;
      });
      markQuestionDirty(questionId);
    },
    [markQuestionDirty],
  );

  const toggleMultiOption = useCallback(
    (questionId: string, optionId: string, maxAllowed: number) => {
      setDraftAnswers((prev) => {
        const current = prev[questionId]?.optionIds ?? [];
        const exists = current.includes(optionId);
        let nextOptionIds: string[];
        if (exists) {
          nextOptionIds = current.filter((id) => id !== optionId);
        } else {
          if (current.length >= maxAllowed) return prev;
          nextOptionIds = [...current, optionId];
        }
        const next = { ...prev };
        if (nextOptionIds.length === 0) {
          delete next[questionId];
        } else {
          next[questionId] = { optionIds: nextOptionIds, textAnswers: [] };
        }
        return next;
      });
      markQuestionDirty(questionId);
    },
    [markQuestionDirty],
  );

  const updateBlankText = useCallback(
    (
      questionId: string,
      blankIndex: number,
      value: string,
      blankCount: number,
    ) => {
      setDraftAnswers((prev) => {
        const currentTexts = prev[questionId]?.textAnswers ?? [];
        const padded = Array.from(
          { length: blankCount },
          (_, idx) => currentTexts[idx] ?? '',
        );
        padded[blankIndex] = value;
        return {
          ...prev,
          [questionId]: { optionIds: [], textAnswers: padded },
        };
      });
      markQuestionDirty(questionId);
      if (textDebounceTimerRef.current !== null) {
        window.clearTimeout(textDebounceTimerRef.current);
      }
      textDebounceTimerRef.current = window.setTimeout(() => {
        textDebounceTimerRef.current = null;
        void flushDirty();
      }, TEXT_SAVE_DEBOUNCE_MS);
    },
    [flushDirty, markQuestionDirty],
  );

  const clearQuestionAnswer = useCallback(
    (questionId: string) => {
      setDraftAnswers((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
      markQuestionDirty(questionId);
    },
    [markQuestionDirty],
  );

  useEffect(
    () => () => {
      if (textDebounceTimerRef.current !== null) {
        window.clearTimeout(textDebounceTimerRef.current);
      }
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
    localStorage.removeItem(legacyDraftKey);
    localStorage.removeItem(draftKey);
    localStorage.removeItem(`${legacyDraftKey}-flags`);
  }, [draftKey, legacyDraftKey]);

  return {
    draftAnswers,
    savedQuestionIds,
    dirtyQuestionIds,
    isSaving,
    isOfflineError,
    deadlineMs,
    selectSingleOption,
    toggleMultiOption,
    updateBlankText,
    clearQuestionAnswer,
    flushDirty,
    clearLocalDraft,
  };
};
