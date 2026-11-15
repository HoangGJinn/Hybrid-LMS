import { USE_MOCK } from '@core/config/env';
import {
  mockExamSchedules,
  mockExamSessions,
  mockLecturerExams,
  mockQuizzes,
  delay,
} from '@core/mocks';
import type {
  ExamAnswerInput,
  ExamAttempt,
  ExamAttemptReview,
  ExamFileLink,
  ExamQuestion,
  ExamSchedule,
  ExamStatus,
  GradeExamSessionInput,
  LecturerExam,
  LecturerExamAttemptItem,
  LecturerExamResults,
  NewExamInput,
  SaveExamAnswersResult,
  SaveFileSubmissionResult,
  StudentExamLobby,
  StudentExamQuestion,
  StudentExamSummary,
  SubmitExamResult,
  UpdateExamScheduleInput,
} from '../types/exams.types';
import { resolveContentType } from '@features/documents';
import { apiClient } from '@core/api/client';
import { del, get, patch, post, put } from '@core/api/http';
import { uploadFileToS3 } from '@core/api/s3-upload';

const resolveStatus = (startTime: string, endTime: string): ExamStatus => {
  const now = Date.now();
  if (now < new Date(startTime).getTime()) return 'UPCOMING';
  if (now < new Date(endTime).getTime()) return 'OPEN';
  return 'CLOSED';
};

/** Mock storage for saved answers by sessionId -> questionId -> optionId. */
const mockSessionAnswers = new Map<string, Map<string, string>>();

const resolveMockQuestions = (examId: string): ExamQuestion[] => {
  const lecturerExam = mockLecturerExams.find((item) => item.id === examId);
  if (lecturerExam && lecturerExam.questions.length > 0) {
    return lecturerExam.questions;
  }
  return mockQuizzes
    .flatMap((quiz) => quiz.questions)
    .map((q, index) => ({
      id: q.id,
      content: q.content,
      orderIndex: index,
      options: q.options.map((opt, optIdx) => ({
        id: `${q.id}-opt-${optIdx}`,
        content: opt,
        isCorrect: optIdx === q.correctIndex,
      })),
    }));
};

const findMockSchedule = (examId: string): LecturerExam | undefined => {
  const existing = mockLecturerExams.find((item) => item.id === examId);
  if (existing) return existing;
  const fallback = mockExamSchedules.find((item) => item.id === examId);
  if (!fallback) return undefined;
  return {
    id: fallback.id,
    classId: fallback.classId,
    examName: fallback.examName,
    startTime: fallback.startTime,
    endTime: fallback.endTime,
    durationMinutes: fallback.durationMinutes ?? 60,
    format: fallback.format ?? 'MULTIPLE_CHOICE',
    maxAttempts: fallback.maxAttempts === undefined ? 3 : fallback.maxAttempts,
    showResults: fallback.showResults ?? true,
    shuffleQuestions: false,
    shuffleOptions: false,
    questions: resolveMockQuestions(fallback.id),
    file: null,
    status: resolveStatus(fallback.startTime, fallback.endTime),
    startedCount: 0,
    isContentLocked: false,
  };
};

/** Builds the exam the mock backend would return for a created or replaced exam. */
const toMockExam = (
  classId: string,
  input: NewExamInput,
  fileId: string | null,
  existing?: LecturerExam,
): LecturerExam => {
  const status = resolveStatus(input.startTime, input.endTime);
  const startedCount = existing?.startedCount ?? 0;
  return {
    id: existing?.id ?? crypto.randomUUID(),
    classId,
    examName: input.examName,
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    format: input.format,
    maxAttempts:
      input.maxAttempts === undefined
        ? (existing?.maxAttempts ?? 1)
        : input.maxAttempts,
    showResults: input.showResults ?? existing?.showResults ?? true,
    shuffleQuestions:
      input.shuffleQuestions ?? existing?.shuffleQuestions ?? false,
    shuffleOptions: input.shuffleOptions ?? existing?.shuffleOptions ?? false,
    questions:
      input.format === 'MULTIPLE_CHOICE'
        ? input.questions.map((question, index) => ({
            id: crypto.randomUUID(),
            content: question.content,
            orderIndex: index,
            options: question.options.map((option) => ({
              id: crypto.randomUUID(),
              content: option.content,
              isCorrect: option.isCorrect,
            })),
          }))
        : [],
    file:
      input.format === 'FILE'
        ? input.file
          ? {
              fileId: fileId ?? crypto.randomUUID(),
              fileName: input.file.name,
              contentType: input.file.type,
              size: input.file.size,
              downloadUrl: '#',
            }
          : (existing?.file ?? null)
        : null,
    status,
    startedCount,
    isContentLocked: status !== 'UPCOMING' || startedCount > 0,
  };
};

export const examService = {
  /** Student: lists all section-linked exams across the signed-in student's classes. */
  getUpcomingExams: (): Promise<StudentExamSummary[]> => {
    if (!USE_MOCK) return get('/api/exams/me');
    const allIds = new Set([
      ...mockExamSchedules.map((e) => e.id),
      ...mockLecturerExams.map((e) => e.id),
    ]);
    const list: StudentExamSummary[] = Array.from(allIds)
      .map((id) => findMockSchedule(id))
      .filter((e): e is LecturerExam => e !== undefined)
      .map((exam) => {
        const sessions = mockExamSessions.filter(
          (s) => s.examScheduleId === exam.id,
        );
        const completed = sessions.filter((s) => s.status === 'COMPLETED');
        const active = sessions.find((s) => s.status === 'IN_PROGRESS');
        const scores = completed
          .map((s) => s.score)
          .filter((score): score is number => score !== null);
        return {
          id: exam.id,
          classId: exam.classId,
          examName: exam.examName,
          startTime: exam.startTime,
          endTime: exam.endTime,
          durationMinutes: exam.durationMinutes,
          format: exam.format,
          status: resolveStatus(exam.startTime, exam.endTime),
          maxAttempts: exam.maxAttempts,
          showResults: exam.showResults,
          attemptsUsed: completed.length,
          inProgressSessionId: active?.id ?? null,
          bestScore:
            exam.showResults && scores.length > 0 ? Math.max(...scores) : null,
        };
      });
    return delay(list);
  },

  getExam: (id: string): Promise<ExamSchedule | undefined> =>
    USE_MOCK
      ? delay(findMockSchedule(id))
      : get<StudentExamSummary[]>(`/api/exams/me`).then((list) =>
          list.find((item) => item.id === id),
        ),

  /** Student: lobby overview and attempt history for one exam in a class. */
  getStudentLobby: (
    classId: string,
    examId: string,
  ): Promise<StudentExamLobby> => {
    if (!USE_MOCK) {
      return get(`/api/classes/${classId}/exams/${examId}/student`);
    }
    const exam = findMockSchedule(examId);
    if (!exam) throw new Error('Exam not found');
    const sessions = mockExamSessions.filter((s) => s.examScheduleId === examId);
    const completed = sessions.filter((s) => s.status === 'COMPLETED');
    const active = sessions.find((s) => s.status === 'IN_PROGRESS');
    const scores = completed
      .map((s) => s.score)
      .filter((score): score is number => score !== null);
    const status = resolveStatus(exam.startTime, exam.endTime);
    return delay({
      id: exam.id,
      classId: exam.classId,
      examName: exam.examName,
      startTime: exam.startTime,
      endTime: exam.endTime,
      durationMinutes: exam.durationMinutes,
      format: exam.format,
      status,
      questionCount: exam.questions.length,
      maxAttempts: exam.maxAttempts,
      showResults: exam.showResults,
      shuffleQuestions: exam.shuffleQuestions,
      shuffleOptions: exam.shuffleOptions,
      attemptsUsed: completed.length,
      bestScore:
        exam.showResults && scores.length > 0 ? Math.max(...scores) : null,
      canStartNewAttempt:
        !active &&
        (exam.maxAttempts === null || completed.length < exam.maxAttempts),
      activeSessionId: active?.id ?? null,
      attempts: sessions.map((s, idx) => ({
        id: s.id,
        attemptNumber: idx + 1,
        status: s.status,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        score: exam.showResults ? s.score : null,
      })),
      serverNow: new Date().toISOString(),
    });
  },

  /** Student: starts a new attempt or resumes the active `IN_PROGRESS` attempt. */
  startOrResumeAttempt: (
    classId: string,
    examId: string,
  ): Promise<ExamAttempt> => {
    if (!USE_MOCK) {
      return post(`/api/classes/${classId}/exams/${examId}/sessions`);
    }
    const exam = findMockSchedule(examId);
    if (!exam) throw new Error('Exam not found');
    const sessions = mockExamSessions.filter((s) => s.examScheduleId === examId);
    let activeIndex = sessions.findIndex((s) => s.status === 'IN_PROGRESS');
    if (activeIndex < 0) {
      const created = {
        id: crypto.randomUUID(),
        examScheduleId: examId,
        studentId: 'stu-001',
        status: 'IN_PROGRESS' as const,
        score: null,
        startedAt: new Date().toISOString(),
        endedAt: null,
      };
      mockExamSessions.push(created);
      sessions.push(created);
      activeIndex = sessions.length - 1;
    }
    const session = sessions[activeIndex];
    const savedMap = mockSessionAnswers.get(session.id) ?? new Map();
    const questions: StudentExamQuestion[] = exam.questions.map((q, index) => ({
      id: q.id,
      content: q.content,
      orderIndex: index,
      options: q.options.map((opt) => ({
        id: opt.id,
        content: opt.content,
      })),
    }));
    const startedMs = new Date(session.startedAt).getTime();
    const deadlineMs = startedMs + exam.durationMinutes * 60_000;
    return delay({
      session: {
        id: session.id,
        examScheduleId: exam.id,
        attemptNumber: activeIndex + 1,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        submittedAt: null,
      },
      exam: {
        id: exam.id,
        classId: exam.classId,
        examName: exam.examName,
        format: exam.format,
        startTime: exam.startTime,
        endTime: exam.endTime,
        durationMinutes: exam.durationMinutes,
        maxAttempts: exam.maxAttempts,
        showResults: exam.showResults,
      },
      deadline: new Date(deadlineMs).toISOString(),
      serverNow: new Date().toISOString(),
      questions,
      savedAnswers: Object.fromEntries(savedMap),
      questionFile: exam.file,
      submittedFiles: [],
    });
  },

  /** Student: uploads one submission file to S3 for a FILE-format exam and resolves with its confirmed `fileId`. */
  uploadSubmissionFile: (file: File): Promise<string> =>
    USE_MOCK
      ? delay(crypto.randomUUID())
      : uploadFileToS3(file, {
          purpose: 'EXAM_SUBMISSION',
          contentType: resolveContentType(file),
        }),

  /** Student: saves or updates the submitted files of a FILE-format exam attempt while time remains. */
  saveFileSubmission: (
    sessionId: string,
    fileIds: string[],
  ): Promise<SaveFileSubmissionResult> => {
    if (!USE_MOCK) {
      return put(`/api/exam-sessions/${sessionId}/file-submission`, {
        fileIds,
      });
    }
    const session = mockExamSessions.find((s) => s.id === sessionId);
    const exam = session ? findMockSchedule(session.examScheduleId) : undefined;
    const startedMs = session ? new Date(session.startedAt).getTime() : Date.now();
    const deadlineMs = startedMs + (exam?.durationMinutes ?? 60) * 60_000;
    const submittedFiles: ExamFileLink[] = fileIds.map((fileId, idx) => ({
      fileId,
      fileName: `submission-${idx + 1}.pdf`,
      contentType: 'application/pdf',
      size: 1024,
      downloadUrl: '#',
    }));
    return delay({
      sessionId,
      submittedAt: new Date().toISOString(),
      submittedFiles,
      deadline: new Date(deadlineMs).toISOString(),
      serverNow: new Date().toISOString(),
    });
  },

  /** Student: batch auto-saves changed answers on page transition, 60-second timer, or tab hide. */
  saveAttemptAnswers: (
    sessionId: string,
    answers: ExamAnswerInput[],
  ): Promise<SaveExamAnswersResult> => {
    if (!USE_MOCK) {
      return put(`/api/exam-sessions/${sessionId}/answers`, { answers });
    }
    const map = mockSessionAnswers.get(sessionId) ?? new Map<string, string>();
    for (const item of answers) {
      if (item.optionId === null) map.delete(item.questionId);
      else map.set(item.questionId, item.optionId);
    }
    mockSessionAnswers.set(sessionId, map);
    const session = mockExamSessions.find((s) => s.id === sessionId);
    const exam = session ? findMockSchedule(session.examScheduleId) : undefined;
    const startedMs = session ? new Date(session.startedAt).getTime() : Date.now();
    const deadlineMs = startedMs + (exam?.durationMinutes ?? 60) * 60_000;
    return delay({
      savedQuestionIds: answers.map((item) => item.questionId),
      savedAt: new Date().toISOString(),
      deadline: new Date(deadlineMs).toISOString(),
      serverNow: new Date().toISOString(),
    });
  },

  /** Student: submits an attempt and computes the score. */
  submitSession: (
    sessionId: string,
    answers: ExamAnswerInput[],
  ): Promise<SubmitExamResult> => {
    if (!USE_MOCK) {
      return post(`/api/exam-sessions/${sessionId}/submit`, { answers });
    }
    const map = mockSessionAnswers.get(sessionId) ?? new Map<string, string>();
    for (const item of answers) {
      if (item.optionId === null) map.delete(item.questionId);
      else map.set(item.questionId, item.optionId);
    }
    mockSessionAnswers.set(sessionId, map);
    const session = mockExamSessions.find((s) => s.id === sessionId);
    const exam = session ? findMockSchedule(session.examScheduleId) : undefined;
    const questions = exam?.questions ?? [];
    const correctCount = questions.filter((q) => {
      const selected = map.get(q.id);
      const correct = q.options.find((opt) => opt.isCorrect);
      return selected !== undefined && selected === correct?.id;
    }).length;
    const score =
      questions.length === 0
        ? 0
        : Math.round((correctCount / questions.length) * 10 * 100) / 100;
    const endedAt = new Date().toISOString();
    if (session) {
      session.status = 'COMPLETED';
      session.score = score;
      session.endedAt = endedAt;
    }
    const showResults = exam?.showResults ?? true;
    return delay(
      {
        sessionId,
        examId: exam?.id ?? '',
        classId: exam?.classId ?? '',
        attemptNumber: 1,
        status: 'COMPLETED',
        startedAt: session?.startedAt ?? endedAt,
        endedAt,
        showResults,
        score: showResults ? score : null,
        correctCount: showResults ? correctCount : null,
        totalQuestions: questions.length,
      },
      400,
    );
  },

  /** Student: reviews a completed attempt (questions, selected options, and correct answers). */
  getAttemptReview: (sessionId: string): Promise<ExamAttemptReview> => {
    if (!USE_MOCK) {
      return get(`/api/exam-sessions/${sessionId}/review`);
    }
    const session = mockExamSessions.find((s) => s.id === sessionId);
    const exam = session ? findMockSchedule(session.examScheduleId) : undefined;
    if (!session || !exam) throw new Error('Attempt not found');
    const saved = mockSessionAnswers.get(sessionId) ?? new Map<string, string>();
    const correctCount = exam.questions.filter((q) => {
      const selected = saved.get(q.id);
      const correct = q.options.find((opt) => opt.isCorrect);
      return selected !== undefined && selected === correct?.id;
    }).length;
    return delay({
      sessionId: session.id,
      examId: exam.id,
      classId: exam.classId,
      examName: exam.examName,
      attemptNumber: 1,
      startedAt: session.startedAt,
      endedAt: session.endedAt,
      score: session.score ?? 0,
      correctCount,
      totalQuestions: exam.questions.length,
      questions: exam.questions.map((q) => ({
        id: q.id,
        content: q.content,
        selectedOptionId: saved.get(q.id) ?? null,
        options: q.options,
      })),
    });
  },

  /** Lecturer: one exam of a class with its correct answers and, for a file exam, a signed link to the file. */
  getLecturerExam: (
    classId: string,
    examId: string,
  ): Promise<LecturerExam | undefined> =>
    USE_MOCK
      ? delay(mockLecturerExams.find((exam) => exam.id === examId))
      : get(`/api/classes/${classId}/exams/${examId}`),

  /** Lecturer: uploads an exam's question file to S3 and resolves with the id of the confirmed file. */
  uploadQuestionFile: (file: File): Promise<string> =>
    USE_MOCK
      ? delay(crypto.randomUUID())
      : uploadFileToS3(file, {
          purpose: 'EXAM',
          contentType: resolveContentType(file),
        }),

  /** UC-31: creates the exam. For a file exam `fileId` is the already uploaded question file. */
  create: (
    classId: string,
    input: NewExamInput,
    fileId: string | null,
  ): Promise<LecturerExam> => {
    if (USE_MOCK) {
      const exam = toMockExam(classId, input, fileId);
      mockLecturerExams.push(exam);
      return delay(exam);
    }
    const content =
      input.format === 'FILE'
        ? { fileId }
        : { questions: input.questions };
    return post(`/api/classes/${classId}/exams`, {
      examName: input.examName,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes,
      format: input.format,
      maxAttempts: input.maxAttempts,
      showResults: input.showResults,
      shuffleQuestions: input.shuffleQuestions,
      shuffleOptions: input.shuffleOptions,
      ...content,
    });
  },

  /** Replaces the whole exam while its content is not locked (`isContentLocked === false`). */
  update: (
    classId: string,
    examId: string,
    input: NewExamInput,
    fileId: string | null,
  ): Promise<LecturerExam> => {
    if (USE_MOCK) {
      const index = mockLecturerExams.findIndex((exam) => exam.id === examId);
      const updated = toMockExam(classId, input, fileId, mockLecturerExams[index]);
      if (index >= 0) mockLecturerExams[index] = updated;
      return delay(updated);
    }
    const content =
      input.format === 'FILE'
        ? { fileId }
        : { questions: input.questions };
    return put(`/api/classes/${classId}/exams/${examId}`, {
      examName: input.examName,
      startTime: input.startTime,
      endTime: input.endTime,
      durationMinutes: input.durationMinutes,
      format: input.format,
      maxAttempts: input.maxAttempts,
      showResults: input.showResults,
      shuffleQuestions: input.shuffleQuestions,
      shuffleOptions: input.shuffleOptions,
      ...content,
    });
  },

  /** Updates the name, `showResults`, and (while not closed) extends the closing time, duration, or allowed attempts. */
  updateSchedule: (
    classId: string,
    examId: string,
    input: UpdateExamScheduleInput,
  ): Promise<LecturerExam> => {
    if (USE_MOCK) {
      const index = mockLecturerExams.findIndex((exam) => exam.id === examId);
      const current = mockLecturerExams[index];
      if (!current) throw new Error('Exam not found');
      const endTime = input.endTime ?? current.endTime;
      const status = resolveStatus(current.startTime, endTime);
      const updated: LecturerExam = {
        ...current,
        examName: input.examName ?? current.examName,
        endTime,
        durationMinutes: input.durationMinutes ?? current.durationMinutes,
        maxAttempts:
          input.maxAttempts === undefined
            ? current.maxAttempts
            : input.maxAttempts,
        showResults: input.showResults ?? current.showResults,
        status,
        isContentLocked: status !== 'UPCOMING' || current.startedCount > 0,
      };
      mockLecturerExams[index] = updated;
      return delay(updated);
    }
    return patch(`/api/classes/${classId}/exams/${examId}/schedule`, input);
  },

  /** UC-32: removes the exam from the class; the backend decides whether its data can be deleted too. */
  remove: (classId: string, examId: string): Promise<void> => {
    if (!USE_MOCK) return del(`/api/classes/${classId}/exams/${examId}`);
    const index = mockLecturerExams.findIndex((exam) => exam.id === examId);
    if (index >= 0) mockLecturerExams.splice(index, 1);
    return delay(undefined);
  },

  /** Lecturer: full class exam results table and summary statistics (auto-finalizes expired sessions). */
  getLecturerResults: (
    classId: string,
    examId: string,
  ): Promise<LecturerExamResults> => {
    if (!USE_MOCK) {
      return get(`/api/classes/${classId}/exams/${examId}/results`);
    }
    const exam = findMockSchedule(examId);
    if (!exam) throw new Error('Exam not found');
    const sessions = mockExamSessions.filter((s) => s.examScheduleId === examId);
    return delay({
      examId: exam.id,
      classId: exam.classId,
      examName: exam.examName,
      format: exam.format,
      maxAttempts: exam.maxAttempts,
      summary: {
        totalStudents: Math.max(1, sessions.length),
        startedCount: sessions.length,
        submittedCount: sessions.filter((s) => s.status === 'COMPLETED').length,
        gradedCount: sessions.filter((s) => s.score !== null).length,
        averageScore:
          sessions.length > 0 && sessions[0].score !== null
            ? sessions[0].score
            : null,
        maxScore:
          sessions.length > 0 && sessions[0].score !== null
            ? sessions[0].score
            : null,
        minScore:
          sessions.length > 0 && sessions[0].score !== null
            ? sessions[0].score
            : null,
      },
      students: sessions.map((s, idx) => ({
        studentId: s.studentId,
        studentCode: `2211000${idx + 1}`,
        fullName: `Student ${idx + 1}`,
        email: `student${idx + 1}@school.edu.vn`,
        status:
          s.score !== null
            ? 'GRADED'
            : s.status === 'COMPLETED'
              ? 'SUBMITTED'
              : 'IN_PROGRESS',
        attemptsUsed: 1,
        bestScore: s.score,
        latestSessionId: s.id,
        latestSubmittedAt: s.endedAt,
        gradedAt: s.endedAt,
        comment: null,
        attempts: [
          {
            sessionId: s.id,
            attemptNumber: 1,
            status: s.status,
            startedAt: s.startedAt,
            endedAt: s.endedAt,
            submittedAt: s.endedAt,
            gradedAt: s.endedAt,
            score: s.score,
            comment: null,
            correctCount: null,
            totalQuestions: exam.questions.length,
            submittedFiles: [],
          },
        ],
      })),
    });
  },

  /** Lecturer: grades or re-grades a student's exam attempt (0..10 + optional feedback comment). */
  gradeSession: (
    classId: string,
    examId: string,
    sessionId: string,
    input: GradeExamSessionInput,
  ): Promise<LecturerExamAttemptItem> => {
    if (!USE_MOCK) {
      return put(
        `/api/classes/${classId}/exams/${examId}/sessions/${sessionId}/grade`,
        input,
      );
    }
    const session = mockExamSessions.find((s) => s.id === sessionId);
    const nowIso = new Date().toISOString();
    if (session) {
      session.status = 'COMPLETED';
      session.score = input.score;
      session.endedAt = session.endedAt ?? nowIso;
    }
    return delay({
      sessionId,
      attemptNumber: 1,
      status: 'COMPLETED',
      startedAt: session?.startedAt ?? nowIso,
      endedAt: session?.endedAt ?? nowIso,
      submittedAt: session?.endedAt ?? nowIso,
      gradedAt: nowIso,
      score: input.score,
      comment: input.comment ?? null,
      correctCount: null,
      totalQuestions: 0,
      submittedFiles: [],
    });
  },

  /** Lecturer: reviews any student's attempt (even when showResults is false for students). */
  getLecturerAttemptReview: (
    classId: string,
    examId: string,
    sessionId: string,
  ): Promise<ExamAttemptReview> => {
    if (!USE_MOCK) {
      return get(
        `/api/classes/${classId}/exams/${examId}/sessions/${sessionId}/review`,
      );
    }
    return examService.getAttemptReview(sessionId);
  },

  /** Lecturer: downloads a `.zip` archive of all student submissions (or one session when `sessionId` is given). */
  downloadSubmissionsZip: async (
    classId: string,
    examId: string,
    sessionId?: string,
  ): Promise<Blob> => {
    if (USE_MOCK) {
      return delay(new Blob(['mock zip'], { type: 'application/zip' }));
    }
    const response = await apiClient.get<Blob>(
      `/api/classes/${classId}/exams/${examId}/submissions/download`,
      { params: { sessionId }, responseType: 'blob' },
    );
    return response.data;
  },
};
