import { useQuery } from '@tanstack/react-query';
import { useLecturerClasses } from '@features/courses';
import { combineQueries } from '@shared/utils/async-state';
import { gradingService } from '../api/grading.service';
import { gradingKeys } from '../api/queryKeys';
import type {
  AssignmentGradingQueueItem,
  ExamGradingQueueItem,
  GradingQueueItem,
} from '../types/grading.types';

/** Unified grading queue (assignments + FILE exam attempts) across all classes the lecturer teaches. */
export const useGradingQueue = () => {
  const classes = useLecturerClasses();
  const classIds = (classes.data ?? []).map((classRoom) => classRoom.id);

  const assignmentSubmissions = useQuery({
    queryKey: gradingKeys.pending(classIds),
    queryFn: () => gradingService.getPendingSubmissions(classIds),
    enabled: classes.isSuccess,
  });

  const examSubmissions = useQuery({
    queryKey: gradingKeys.examPending(classIds),
    queryFn: () => gradingService.getPendingExamSubmissions(classIds),
    enabled: classes.isSuccess,
  });

  return combineQueries(
    [classes, assignmentSubmissions, examSubmissions] as const,
    ([classList, assignments, exams]): GradingQueueItem[] => {
      const classNameById = new Map(classList.map((c) => [c.id, c.name]));

      const assignmentItems: AssignmentGradingQueueItem[] = assignments.map(
        (sub) => ({
          queueId: `assignment:${sub.id}`,
          kind: 'assignment',
          classId: sub.assignment.classId,
          className: classNameById.get(sub.assignment.classId) ?? '',
          title: sub.assignment.title,
          studentId: sub.submittedBy,
          studentName: sub.studentName,
          studentCode: sub.studentCode,
          submittedAt: sub.submittedAt,
          score: sub.score,
          comment: sub.comment,
          files: sub.files,
          answerText: sub.answerText,
          submission: sub,
        }),
      );

      const examItems: ExamGradingQueueItem[] = exams.map((ex) => ({
        queueId: `exam:${ex.sessionId}`,
        kind: 'exam',
        classId: ex.classId,
        className: classNameById.get(ex.classId) ?? '',
        title: ex.examName,
        examId: ex.examId,
        sessionId: ex.sessionId,
        attemptNumber: ex.attemptNumber,
        studentId: ex.studentId,
        studentName: ex.studentName,
        studentCode: ex.studentCode,
        submittedAt: ex.submittedAt ?? ex.endedAt ?? ex.startedAt,
        score: ex.score,
        comment: ex.comment,
        files: ex.submittedFiles,
        questionFile: ex.questionFile,
        examSubmission: ex,
      }));

      return [...assignmentItems, ...examItems].sort(
        (a, b) =>
          new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime(),
      );
    },
  );
};

