import { useEffect, useRef } from 'react';
import { combineQueries } from '@shared/utils/async-state';
import { useExam } from './useExam';
import { useExamQuestions } from './useExams';
import { useStartExamSession } from './useExamSession';

/** Exam, its questions and a freshly started session, as one query-like result. The session is started once per visit. */
export const useExamRoom = (examId: string) => {
  const exam = useExam(examId);
  const questions = useExamQuestions(examId);
  const {
    mutate: startSession,
    data: session,
    error: sessionError,
    isPending: isStarting,
    isIdle: isSessionIdle,
  } = useStartExamSession();
  const hasStarted = useRef(false);
  const isExamFound = exam.data !== undefined && exam.data !== null;

  useEffect(() => {
    if (!isExamFound || hasStarted.current) return;
    hasStarted.current = true;
    startSession(examId);
  }, [examId, isExamFound, startSession]);

  const sessionSnapshot = {
    data: session,
    isLoading: isStarting || (isExamFound && isSessionIdle),
    error: sessionError,
    refetch: () => startSession(examId),
  };
  return combineQueries(
    [exam, questions, sessionSnapshot] as const,
    ([examData, questionList, sessionData]) => ({
      exam: examData,
      questions: questionList,
      session: sessionData,
    }),
  );
};
