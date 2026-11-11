import { USE_MOCK } from '@core/config/env';
import {
  mockExamSchedules,
  mockLecturerExams,
  mockQuizzes,
  delay,
} from '@core/mocks';
import type {
  ExamSchedule,
  ExamSession,
  ExamStatus,
  LecturerExam,
  NewExamInput,
  UpdateExamScheduleInput,
} from '../types/exams.types';
import type { QuizAnswer, QuizQuestion } from '@features/quizzes';
import { resolveContentType } from '@features/documents';
import { del, get, patch, post, put } from '@core/api/http';
import { uploadFileToS3 } from '@core/api/s3-upload';

const resolveStatus = (startTime: string, endTime: string): ExamStatus => {
  const now = Date.now();
  if (now < new Date(startTime).getTime()) return 'UPCOMING';
  if (now < new Date(endTime).getTime()) return 'OPEN';
  return 'CLOSED';
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
  getUpcomingExams: (): Promise<ExamSchedule[]> =>
    USE_MOCK ? delay(mockExamSchedules) : get('/api/exams/upcoming'),
  getExam: (id: string): Promise<ExamSchedule | undefined> =>
    USE_MOCK
      ? delay(mockExamSchedules.find((e) => e.id === id))
      : get(`/api/exams/${id}`),
  /** Questions are served without correct answers on the real backend. */
  getQuestions: (examScheduleId: string): Promise<QuizQuestion[]> =>
    USE_MOCK
      ? delay(mockQuizzes.flatMap((q) => q.questions))
      : get(`/api/exams/${examScheduleId}/questions`),
  startSession: (examScheduleId: string): Promise<ExamSession> =>
    USE_MOCK
      ? delay({
          id: crypto.randomUUID(),
          examScheduleId,
          studentId: 'stu-001',
          status: 'IN_PROGRESS',
          score: null,
          startedAt: new Date().toISOString(),
          endedAt: null,
        })
      : post(`/api/exams/${examScheduleId}/sessions`),
  submitSession: (
    sessionId: string,
    answers: QuizAnswer[],
  ): Promise<ExamSession> =>
    USE_MOCK
      ? delay(
          {
            id: sessionId,
            examScheduleId: '',
            studentId: 'stu-001',
            status: 'SUBMITTED',
            score: null,
            startedAt: '',
            endedAt: new Date().toISOString(),
          },
          600,
        )
      : post(`/api/exam-sessions/${sessionId}/submit`, { answers }),

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
      ...content,
    });
  },

  /** Updates the name and (while not closed) extends the closing time or duration of a locked exam. */
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
};
