import { Fragment, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react';
import { toast } from 'sonner';
import {
  Archive,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  Eye,
  FileSpreadsheet,
  FileText,
  GraduationCap,
  Search,
  Trophy,
  Users,
  X,
} from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import {
  FilePreviewModal,
  FilePreviewPanel,
  ResizableSplitPane,
  type PreviewableFile,
} from '@shared/components/file-preview';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { Label } from '@shared/components/ui/label';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { downloadCsv } from '@shared/utils/download';
import { formatDateTime } from '@shared/utils/format';
import { examService } from '../api/exam.service';
import {
  useGradeExamSession,
  useLecturerAttemptReview,
  useLecturerExamResults,
} from '../hooks/useExamResults';
import type {
  LecturerExam,
  LecturerExamResults,
  LecturerStudentExamResult,
  StudentExamResultStatus,
} from '../types/exams.types';
import {
  buildExamDetailedAttemptsCsv,
  buildExamSummaryResultsCsv,
} from '../utils/exam-csv';
import { AttemptReviewViewer } from './AttemptReviewViewer';

type StatusFilter = 'ALL' | StudentExamResultStatus;

interface LecturerExamResultsTabProps {
  classId: string;
  exam: LecturerExam;
}

const saveBlob = (blob: Blob, fileName: string) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

export const LecturerExamResultsTab = ({
  classId,
  exam,
}: LecturerExamResultsTabProps) => {
  const resultsQuery = useLecturerExamResults(classId, exam.id);
  const state = toAsyncState(resultsQuery);
  const [reviewSessionId, setReviewSessionId] = useState<string | null>(null);

  const reviewingStudent = useMemo(() => {
    if (!reviewSessionId || !resultsQuery.data) return null;
    return (
      resultsQuery.data.students.find((s) =>
        s.attempts.some((a) => a.sessionId === reviewSessionId),
      ) ?? null
    );
  }, [reviewSessionId, resultsQuery.data]);

  if (reviewSessionId) {
    return (
      <LecturerAttemptReviewPanel
        classId={classId}
        examId={exam.id}
        sessionId={reviewSessionId}
        student={reviewingStudent}
        onSelectSession={(id) => setReviewSessionId(id)}
        onBack={() => setReviewSessionId(null)}
      />
    );
  }

  return (
    <AsyncView
      state={state}
      empty={<EmptyState title="No results found for this exam" />}
    >
      {(results) => (
        <ResultsContent
          classId={classId}
          results={results}
          onReviewAttempt={(sessionId) => setReviewSessionId(sessionId)}
        />
      )}
    </AsyncView>
  );
};

const ResultsContent = ({
  classId,
  results,
  onReviewAttempt,
}: {
  classId: string;
  results: LecturerExamResults;
  onReviewAttempt: (sessionId: string) => void;
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [gradingTarget, setGradingTarget] = useState<{
    studentId: string;
    sessionId?: string;
    initialFileIndex?: number;
  } | null>(null);
  const [previewModal, setPreviewModal] = useState<{
    files: PreviewableFile[];
    initialIndex: number;
    title: string;
  } | null>(null);
  const [expandedStudents, setExpandedStudents] = useState<Set<string>>(
    () => new Set(),
  );
  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const toggleExpandStudent = (studentId: string) => {
    setExpandedStudents((prev) => {
      const next = new Set(prev);
      if (next.has(studentId)) {
        next.delete(studentId);
      } else {
        next.add(studentId);
      }
      return next;
    });
  };

  const counts = useMemo(() => {
    const map: Record<StatusFilter, number> = {
      ALL: results.students.length,
      GRADED: 0,
      SUBMITTED: 0,
      IN_PROGRESS: 0,
      NOT_STARTED: 0,
    };
    for (const s of results.students) {
      map[s.status] += 1;
    }
    return map;
  }, [results.students]);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return results.students.filter((stu) => {
      if (statusFilter !== 'ALL' && stu.status !== statusFilter) return false;
      if (!q) return true;
      return (
        stu.fullName.toLowerCase().includes(q) ||
        stu.studentCode.toLowerCase().includes(q) ||
        stu.email.toLowerCase().includes(q)
      );
    });
  }, [results.students, searchQuery, statusFilter]);

  const safeSlug =
    results.examName
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'exam';

  const handleExportSummaryCsv = () => {
    const csv = buildExamSummaryResultsCsv(results);
    downloadCsv(csv, `${safeSlug}-summary-results.csv`);
    toast.success('Exported Summary CSV');
  };

  const handleExportDetailedCsv = () => {
    const csv = buildExamDetailedAttemptsCsv(results);
    downloadCsv(csv, `${safeSlug}-detailed-attempts.csv`);
    toast.success('Exported Detailed Attempts CSV');
  };

  const handleDownloadZip = async (sessionId?: string, label?: string) => {
    try {
      setIsDownloadingZip(true);
      const blob = await examService.downloadSubmissionsZip(
        classId,
        results.examId,
        sessionId,
      );
      saveBlob(blob, `${label ?? safeSlug}-submissions.zip`);
    } catch {
      toast.error('Could not download submissions archive.');
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const { summary } = results;

  return (
    <div className="space-y-5">
      {/* 4 Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Users className="h-3.5 w-3.5 text-brand" />
            Participation
          </span>
          <p className="m-0 mt-1 text-2xl font-bold">
            {summary.submittedCount} / {summary.totalStudents}
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            {summary.startedCount} started ·{' '}
            {summary.totalStudents - summary.startedCount} not started
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            Graded progress
          </span>
          <p className="m-0 mt-1 text-2xl font-bold">
            {summary.gradedCount} / {summary.submittedCount}
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            {results.format === 'FILE'
              ? `${Math.max(0, summary.submittedCount - summary.gradedCount)} awaiting manual grade`
              : 'Auto-graded upon completion'}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <Trophy className="h-3.5 w-3.5 text-warning" />
            Average score
          </span>
          <p className="m-0 mt-1 text-2xl font-bold text-brand">
            {summary.averageScore !== null
              ? `${summary.averageScore.toFixed(2)} / 10`
              : '—'}
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Across {summary.gradedCount} graded student
            {summary.gradedCount === 1 ? '' : 's'}
          </p>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <span className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            <GraduationCap className="h-3.5 w-3.5 text-primary" />
            Score range
          </span>
          <p className="m-0 mt-1 text-2xl font-bold">
            {summary.minScore !== null && summary.maxScore !== null
              ? `${summary.minScore.toFixed(2)} – ${summary.maxScore.toFixed(2)}`
              : '—'}
          </p>
          <p className="m-0 mt-1 text-xs text-muted-foreground">
            Lowest to highest best score
          </p>
        </div>
      </div>

      {/* Toolbar: Search, Filter Chips & CSV / ZIP Export Buttons */}
      <div className="space-y-3 rounded-lg border bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="relative min-w-[240px] flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search student name, code, or email…"
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {results.format === 'FILE' && summary.submittedCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isDownloadingZip}
                onClick={() => void handleDownloadZip()}
              >
                <Archive className="mr-1.5 h-4 w-4" />
                {isDownloadingZip
                  ? 'Preparing ZIP…'
                  : 'Download all submissions (.zip)'}
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleExportDetailedCsv}
            >
              <FileSpreadsheet className="mr-1.5 h-4 w-4" />
              Export Detailed Attempts CSV
            </Button>
            <Button type="button" size="sm" onClick={handleExportSummaryCsv}>
              <Download className="mr-1.5 h-4 w-4" />
              Export Summary CSV
            </Button>
          </div>
        </div>

        <div
          role="group"
          aria-label="Filter students by exam status"
          className="flex flex-wrap gap-1.5"
        >
          {(
            [
              ['ALL', `All (${counts.ALL})`],
              ['GRADED', `Graded (${counts.GRADED})`],
              ['SUBMITTED', `Pending Grade (${counts.SUBMITTED})`],
              ['IN_PROGRESS', `In Progress (${counts.IN_PROGRESS})`],
              ['NOT_STARTED', `Not Started (${counts.NOT_STARTED})`],
            ] as const
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              aria-pressed={statusFilter === key}
              onClick={() => setStatusFilter(key)}
              className={cn(
                'rounded-full border px-3 py-1 text-xs font-semibold transition-colors',
                statusFilter === key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'bg-background text-foreground hover:bg-accent',
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Results Table */}
      <div className="overflow-x-auto rounded-lg border bg-card">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b bg-muted/40 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Student</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">
                {results.format === 'FILE'
                  ? 'Submitted Files'
                  : 'Attempts & Accuracy'}
              </th>
              <th className="px-4 py-3">Submitted At</th>
              <th className="px-4 py-3">Best Score</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {filteredStudents.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  No students match your current search or filter.
                </td>
              </tr>
            ) : (
              filteredStudents.map((stu) => {
                const latestAttempt =
                  stu.attempts.length > 0
                    ? stu.attempts[stu.attempts.length - 1]
                    : null;
                const bestOrLatestAttempt =
                  stu.attempts.find(
                    (a) =>
                      stu.bestScore !== null && a.score === stu.bestScore,
                  ) ?? latestAttempt;
                const hasMultipleAttempts = stu.attempts.length > 1;
                const isExpanded = expandedStudents.has(stu.studentId);

                return (
                  <Fragment key={stu.studentId}>
                    <tr className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3">
                        <p className="m-0 font-semibold text-foreground">
                          {stu.fullName}
                        </p>
                        <p className="m-0 text-xs text-muted-foreground">
                          {stu.studentCode} · {stu.email}
                        </p>
                      </td>

                      <td className="px-4 py-3">
                        <ResultStatusPill status={stu.status} />
                      </td>

                      <td className="px-4 py-3">
                        {results.format === 'FILE' ? (
                          latestAttempt &&
                          latestAttempt.submittedFiles.length > 0 ? (
                            <div className="space-y-1">
                              <div className="flex flex-wrap gap-1.5">
                                {latestAttempt.submittedFiles.map(
                                  (file, fileIdx) => (
                                    <span
                                      key={file.fileId}
                                      className="inline-flex items-center overflow-hidden rounded border bg-background text-xs font-medium"
                                    >
                                      <button
                                        type="button"
                                        onClick={() =>
                                          setPreviewModal({
                                            title: `${stu.fullName} — ${file.fileName}`,
                                            initialIndex: fileIdx,
                                            files:
                                              latestAttempt.submittedFiles.map(
                                                (f) => ({
                                                  fileId: f.fileId,
                                                  fileName: f.fileName,
                                                  fileUrl: f.downloadUrl,
                                                }),
                                              ),
                                          })
                                        }
                                        className="inline-flex items-center gap-1 px-2 py-0.5 text-brand transition-colors hover:bg-accent"
                                        title={`Preview ${file.fileName}`}
                                      >
                                        <Eye className="h-3 w-3 shrink-0" />
                                        {file.fileName}
                                      </button>
                                      <a
                                        href={file.downloadUrl}
                                        download={file.fileName}
                                        target="_blank"
                                        rel="noreferrer"
                                        title={`Download ${file.fileName}`}
                                        className="border-l px-1.5 py-0.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                                      >
                                        <Download className="h-3 w-3" />
                                      </a>
                                    </span>
                                  ),
                                )}
                              </div>
                              {hasMultipleAttempts && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleExpandStudent(stu.studentId)
                                  }
                                  className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                                >
                                  {isExpanded ? (
                                    <>
                                      Hide {stu.attempts.length} attempts
                                      <ChevronUp className="h-3.5 w-3.5" />
                                    </>
                                  ) : (
                                    <>
                                      View all {stu.attempts.length} attempts
                                      <ChevronDown className="h-3.5 w-3.5" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">
                              No files uploaded
                            </span>
                          )
                        ) : stu.attempts.length === 0 ? (
                          <span className="text-xs text-muted-foreground">
                            0 attempts
                          </span>
                        ) : (
                          <div className="space-y-1 text-xs">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">
                                {stu.attemptsUsed} completed
                              </span>
                              {hasMultipleAttempts && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    toggleExpandStudent(stu.studentId)
                                  }
                                  className="inline-flex items-center gap-0.5 rounded border bg-background px-1.5 py-0.5 text-[11px] font-medium text-primary transition-colors hover:bg-accent"
                                >
                                  {isExpanded ? (
                                    <>
                                      Hide attempts
                                      <ChevronUp className="h-3 w-3" />
                                    </>
                                  ) : (
                                    <>
                                      All {stu.attempts.length} attempts
                                      <ChevronDown className="h-3 w-3" />
                                    </>
                                  )}
                                </button>
                              )}
                            </div>
                            {bestOrLatestAttempt &&
                              bestOrLatestAttempt.correctCount !== null && (
                                <p className="m-0 text-muted-foreground">
                                  {hasMultipleAttempts
                                    ? `Best (Attempt #${bestOrLatestAttempt.attemptNumber}): `
                                    : 'Latest: '}
                                  {bestOrLatestAttempt.correctCount} /{' '}
                                  {bestOrLatestAttempt.totalQuestions} correct
                                </p>
                              )}
                          </div>
                        )}
                      </td>

                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {stu.latestSubmittedAt
                          ? formatDateTime(stu.latestSubmittedAt)
                          : '—'}
                      </td>

                      <td className="px-4 py-3">
                        {stu.bestScore !== null ? (
                          <div>
                            <span className="font-mono text-sm font-bold text-brand">
                              {stu.bestScore.toFixed(2)} / 10
                            </span>
                            {stu.comment && (
                              <p
                                className="m-0 mt-0.5 max-w-[200px] truncate text-xs text-muted-foreground"
                                title={stu.comment}
                              >
                                “{stu.comment}”
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {results.format === 'FILE' && latestAttempt && (
                            <>
                              {latestAttempt.submittedFiles.length > 0 && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  disabled={isDownloadingZip}
                                  onClick={() =>
                                    void handleDownloadZip(
                                      latestAttempt.sessionId,
                                      `${stu.studentCode}_${stu.fullName}`,
                                    )
                                  }
                                >
                                  <Download className="h-3.5 w-3.5" />
                                </Button>
                              )}
                              <Button
                                type="button"
                                size="sm"
                                variant={
                                  stu.status === 'GRADED'
                                    ? 'outline'
                                    : 'default'
                                }
                                onClick={() =>
                                  setGradingTarget({
                                    studentId: stu.studentId,
                                    sessionId: latestAttempt.sessionId,
                                  })
                                }
                              >
                                {stu.status === 'GRADED'
                                  ? 'Edit grade'
                                  : 'Grade'}
                              </Button>
                            </>
                          )}

                          {results.format === 'MULTIPLE_CHOICE' &&
                            bestOrLatestAttempt && (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() =>
                                  onReviewAttempt(bestOrLatestAttempt.sessionId)
                                }
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" />
                                Review
                              </Button>
                            )}
                        </div>
                      </td>
                    </tr>

                    {isExpanded && hasMultipleAttempts && (
                      <tr className="bg-muted/15">
                        <td colSpan={6} className="px-6 py-3">
                          <div className="rounded-md border bg-background p-3">
                            <p className="m-0 mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                              Attempt History for {stu.fullName} (
                              {stu.attempts.length} attempts)
                            </p>
                            <div className="divide-y">
                              {stu.attempts.map((att) => {
                                const isBest =
                                  stu.bestScore !== null &&
                                  att.score === stu.bestScore;
                                return (
                                  <div
                                    key={att.sessionId}
                                    className="flex flex-wrap items-center justify-between gap-3 py-2 text-xs"
                                  >
                                    <div className="flex flex-wrap items-center gap-2.5">
                                      <span className="font-semibold text-foreground">
                                        Attempt #{att.attemptNumber}
                                      </span>
                                      {isBest && (
                                        <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2 py-0.5 text-[11px] font-semibold text-warning">
                                          <Trophy className="h-3 w-3" />
                                          Best Score
                                        </span>
                                      )}
                                      <span className="rounded bg-muted px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                                        {att.status}
                                      </span>
                                      <span className="text-muted-foreground">
                                        Started {formatDateTime(att.startedAt)}
                                        {att.submittedAt
                                          ? ` · Submitted ${formatDateTime(att.submittedAt)}`
                                          : ''}
                                      </span>
                                    </div>

                                    <div className="flex items-center gap-4">
                                      {results.format === 'MULTIPLE_CHOICE' &&
                                        att.correctCount !== null && (
                                          <span className="text-muted-foreground">
                                            {att.correctCount} /{' '}
                                            {att.totalQuestions} correct
                                          </span>
                                        )}

                                      <span className="font-mono font-bold text-brand">
                                        {att.score !== null
                                          ? `${att.score.toFixed(2)} / 10`
                                          : '—'}
                                      </span>

                                      {results.format === 'MULTIPLE_CHOICE' ? (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            onReviewAttempt(att.sessionId)
                                          }
                                        >
                                          <Eye className="mr-1 h-3.5 w-3.5" />
                                          Review Attempt #{att.attemptNumber}
                                        </Button>
                                      ) : (
                                        <Button
                                          type="button"
                                          variant="outline"
                                          size="sm"
                                          onClick={() =>
                                            setGradingTarget({
                                              studentId: stu.studentId,
                                              sessionId: att.sessionId,
                                            })
                                          }
                                        >
                                          {att.score !== null
                                            ? 'Edit grade'
                                            : 'Grade'}
                                        </Button>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {gradingTarget && (
        <ExamSpeedGraderDialog
          classId={classId}
          examId={results.examId}
          examName={results.examName}
          students={
            filteredStudents.some(
              (s) => s.studentId === gradingTarget.studentId && s.attempts.length > 0,
            )
              ? filteredStudents.filter((s) => s.attempts.length > 0)
              : results.students.filter((s) => s.attempts.length > 0)
          }
          activeStudentId={gradingTarget.studentId}
          initialSessionId={gradingTarget.sessionId}
          initialFileIndex={gradingTarget.initialFileIndex}
          isDownloadingZip={isDownloadingZip}
          onDownloadZip={(sessionId, label) =>
            void handleDownloadZip(sessionId, label)
          }
          onSelectStudent={(studentId) =>
            setGradingTarget({ studentId })
          }
          onClose={() => setGradingTarget(null)}
        />
      )}

      {previewModal && (
        <FilePreviewModal
          open
          files={previewModal.files}
          initialIndex={previewModal.initialIndex}
          title={previewModal.title}
          onClose={() => setPreviewModal(null)}
        />
      )}
    </div>
  );
};

const ResultStatusPill = ({ status }: { status: StudentExamResultStatus }) => {
  if (status === 'GRADED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-success/15 px-2.5 py-0.5 text-xs font-semibold text-success">
        <CheckCircle2 className="h-3 w-3" />
        Graded
      </span>
    );
  }
  if (status === 'SUBMITTED') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-warning/15 px-2.5 py-0.5 text-xs font-semibold text-warning">
        <Clock className="h-3 w-3" />
        Pending grade
      </span>
    );
  }
  if (status === 'IN_PROGRESS') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-semibold text-primary">
        In progress
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      Not started
    </span>
  );
};

interface ExamSpeedGraderDialogProps {
  classId: string;
  examId: string;
  examName: string;
  students: LecturerStudentExamResult[];
  activeStudentId: string;
  initialSessionId?: string;
  initialFileIndex?: number;
  isDownloadingZip: boolean;
  onDownloadZip: (sessionId: string, label: string) => void;
  onSelectStudent: (studentId: string) => void;
  onClose: () => void;
}

const ExamSpeedGraderDialog = ({
  classId,
  examId,
  examName,
  students,
  activeStudentId,
  initialSessionId,
  initialFileIndex,
  isDownloadingZip,
  onDownloadZip,
  onSelectStudent,
  onClose,
}: ExamSpeedGraderDialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
  }, []);

  const currentIndex = Math.max(
    0,
    students.findIndex((s) => s.studentId === activeStudentId),
  );
  const student = students[currentIndex];
  if (!student) return null;

  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex < students.length - 1;

  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === event.currentTarget) onClose();
  };

  return (
    <dialog
      ref={dialogRef}
      aria-label={`SpeedGrader — ${examName}`}
      onCancel={(event) => {
        if (document.fullscreenElement) {
          event.preventDefault();
        }
      }}
      onClose={onClose}
      onClick={handleBackdropClick}
      className="m-auto h-[calc(100vh-1.5rem)] w-[calc(100vw-1.5rem)] max-w-[1600px] rounded-2xl border bg-card p-0 text-card-foreground shadow-2xl backdrop:bg-black/60"
    >
      <div className="flex h-full flex-col">
        {/* Top SpeedGrader Bar with Quick Navigation */}
        <header className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-4 py-2.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="rounded bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              SpeedGrader
            </span>
            <h2 className="m-0 truncate text-sm font-semibold sm:text-base">
              {examName}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasPrev}
              onClick={() =>
                hasPrev && onSelectStudent(students[currentIndex - 1].studentId)
              }
            >
              <ArrowLeft className="mr-1 h-3.5 w-3.5" />
              Prev
            </Button>

            <div className="flex items-center gap-1.5">
              <select
                aria-label="Select student to grade"
                value={student.studentId}
                onChange={(e) => onSelectStudent(e.target.value)}
                className="h-8 max-w-[260px] rounded-md border bg-background px-2 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {students.map((s) => (
                  <option key={s.studentId} value={s.studentId}>
                    {s.fullName} ({s.studentCode})
                    {s.bestScore !== null ? ` — ${s.bestScore.toFixed(2)}/10` : ' — Pending'}
                  </option>
                ))}
              </select>
              <span className="text-xs text-muted-foreground">
                ({currentIndex + 1} / {students.length})
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!hasNext}
              onClick={() =>
                hasNext && onSelectStudent(students[currentIndex + 1].studentId)
              }
            >
              Next
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close SpeedGrader"
            onClick={onClose}
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        {/* Split-screen Content */}
        <div className="min-h-0 flex-1 p-3">
          <ExamSpeedGraderBody
            key={`${student.studentId}-${initialSessionId ?? ''}`}
            classId={classId}
            examId={examId}
            student={student}
            initialSessionId={initialSessionId}
            initialFileIndex={initialFileIndex}
            hasNext={hasNext}
            onAdvanceNext={() =>
              hasNext && onSelectStudent(students[currentIndex + 1].studentId)
            }
            isDownloadingZip={isDownloadingZip}
            onDownloadZip={onDownloadZip}
            onClose={onClose}
          />
        </div>
      </div>
    </dialog>
  );
};

const ExamSpeedGraderBody = ({
  classId,
  examId,
  student,
  initialSessionId,
  initialFileIndex = 0,
  hasNext,
  onAdvanceNext,
  isDownloadingZip,
  onDownloadZip,
  onClose,
}: {
  classId: string;
  examId: string;
  student: LecturerStudentExamResult;
  initialSessionId?: string;
  initialFileIndex?: number;
  hasNext: boolean;
  onAdvanceNext: () => void;
  isDownloadingZip: boolean;
  onDownloadZip: (sessionId: string, label: string) => void;
  onClose: () => void;
}) => {
  const defaultAttempt =
    student.attempts.find((a) => a.sessionId === initialSessionId) ??
    (student.attempts.length > 0
      ? student.attempts[student.attempts.length - 1]
      : null);
  const [selectedSessionId, setSelectedSessionId] = useState<string>(
    defaultAttempt?.sessionId ?? '',
  );
  const targetAttempt =
    student.attempts.find((a) => a.sessionId === selectedSessionId) ??
    defaultAttempt;

  const [activeFileIndex, setActiveFileIndex] = useState(initialFileIndex);
  const [fullScreenFileIndex, setFullScreenFileIndex] = useState<number | null>(
    null,
  );
  const [scoreText, setScoreText] = useState<string>(() =>
    targetAttempt?.score !== null && targetAttempt?.score !== undefined
      ? String(targetAttempt.score)
      : student.bestScore !== null
        ? String(student.bestScore)
        : '',
  );
  const [comment, setComment] = useState<string>(
    () => targetAttempt?.comment ?? student.comment ?? '',
  );
  const gradeMutation = useGradeExamSession(classId, examId);

  if (!targetAttempt) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        This student has not started any attempt yet.
      </div>
    );
  }

  const handleSelectAttempt = (sessionId: string) => {
    setSelectedSessionId(sessionId);
    setActiveFileIndex(0);
    setFullScreenFileIndex(null);
    const att = student.attempts.find((a) => a.sessionId === sessionId);
    if (att) {
      setScoreText(att.score !== null ? String(att.score) : '');
      setComment(att.comment ?? '');
    }
  };

  const submitGrade = (advanceAfter: boolean) => {
    const parsedScore = Number(scoreText);
    if (
      scoreText.trim() === '' ||
      Number.isNaN(parsedScore) ||
      parsedScore < 0 ||
      parsedScore > 10
    ) {
      toast.error('Please enter a valid score between 0 and 10.');
      return;
    }
    gradeMutation.mutate(
      {
        sessionId: targetAttempt.sessionId,
        input: {
          score: Math.round(parsedScore * 100) / 100,
          comment: comment.trim() || null,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Saved grade for ${student.fullName}`);
          if (advanceAfter && hasNext) {
            onAdvanceNext();
          } else if (!advanceAfter && !hasNext) {
            onClose();
          }
        },
        onError: (err) => toast.error(err.message),
      },
    );
  };

  const previewFiles: PreviewableFile[] = targetAttempt.submittedFiles.map(
    (file) => ({
      fileId: file.fileId,
      fileName: file.fileName,
      fileUrl: file.downloadUrl,
    }),
  );

  return (
    <>
      <ResizableSplitPane
        storageKey="lms-exam-speedgrader-split"
        initialLeftPercent={62}
        leftLabel="Submission"
        rightLabel="Grade"
      left={
        <FilePreviewPanel
          files={previewFiles}
          activeIndex={activeFileIndex}
          onActiveIndexChange={setActiveFileIndex}
          emptyMessage="This student has not uploaded any submission files yet."
        />
      }
      right={
        <div className="flex h-full flex-col space-y-4 rounded-lg border bg-background p-4">
          {/* Student Header */}
          <div className="flex flex-wrap items-start justify-between gap-2 border-b pb-3">
            <div>
              <h3 className="m-0 text-base font-semibold text-foreground">
                {student.fullName}
              </h3>
              <p className="m-0 mt-0.5 text-xs text-muted-foreground">
                {student.studentCode} · {student.email}
              </p>
              {targetAttempt.submittedAt && (
                <p className="m-0 mt-1 text-xs text-muted-foreground">
                  Submitted {formatDateTime(targetAttempt.submittedAt)}
                </p>
              )}
            </div>
            <ResultStatusPill status={student.status} />
          </div>

          {/* Attempt Switcher */}
          {student.attempts.length > 1 && (
            <div className="space-y-1.5">
              <Label className="text-xs uppercase text-muted-foreground">
                Select attempt ({student.attempts.length})
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {student.attempts.map((att) => (
                  <button
                    key={att.sessionId}
                    type="button"
                    onClick={() => handleSelectAttempt(att.sessionId)}
                    className={cn(
                      'rounded-md border px-2.5 py-1 text-xs font-medium transition-colors',
                      att.sessionId === targetAttempt.sessionId
                        ? 'border-primary bg-primary text-primary-foreground'
                        : 'bg-card text-foreground hover:bg-accent',
                    )}
                  >
                    Attempt #{att.attemptNumber}
                    {att.score !== null ? ` (${att.score.toFixed(2)}/10)` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Submitted Files Quick List & Download Fallback */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <Label className="text-xs uppercase text-muted-foreground">
                Submitted files ({targetAttempt.submittedFiles.length})
              </Label>
              {targetAttempt.submittedFiles.length > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={isDownloadingZip}
                  onClick={() =>
                    onDownloadZip(
                      targetAttempt.sessionId,
                      `${student.studentCode}_${student.fullName}`,
                    )
                  }
                  className="h-6 px-2 text-xs"
                >
                  <Archive className="mr-1 h-3 w-3" />
                  Download .zip
                </Button>
              )}
            </div>
            {targetAttempt.submittedFiles.length === 0 ? (
              <p className="m-0 text-xs text-muted-foreground">
                No files uploaded.
              </p>
            ) : (
              <ul className="m-0 divide-y rounded-md border p-0 list-none">
                {targetAttempt.submittedFiles.map((file, idx) => (
                  <li
                    key={file.fileId}
                    className={cn(
                      'flex items-center justify-between gap-2 px-3 py-2 text-xs',
                      idx === activeFileIndex && 'bg-primary/5',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setActiveFileIndex(idx)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left font-medium text-foreground hover:text-brand"
                    >
                      <FileText className="h-3.5 w-3.5 shrink-0 text-brand" />
                      <span className="truncate">{file.fileName}</span>
                    </button>
                    <div className="flex shrink-0 items-center gap-1">
                      <Button
                        type="button"
                        variant={idx === activeFileIndex ? 'secondary' : 'ghost'}
                        size="sm"
                        onClick={() => {
                          setActiveFileIndex(idx);
                          setFullScreenFileIndex(idx);
                        }}
                        className="h-7 px-2 text-xs"
                      >
                        <Eye className="mr-1 h-3 w-3" />
                        Preview
                      </Button>
                      <Button asChild variant="outline" size="sm" className="h-7 px-2 text-xs">
                        <a
                          href={file.downloadUrl}
                          download={file.fileName}
                          target="_blank"
                          rel="noreferrer"
                          title="Download original file"
                        >
                          <Download className="h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Grading Form */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitGrade(false);
            }}
            className="flex flex-1 flex-col space-y-4 border-t pt-4"
          >
            <div className="space-y-1.5">
              <Label htmlFor="exam-grade-score">Score (0 – 10)</Label>
              <Input
                id="exam-grade-score"
                type="number"
                min={0}
                max={10}
                step={0.01}
                required
                value={scoreText}
                onChange={(e) => setScoreText(e.target.value)}
                placeholder="e.g. 8.5"
              />
            </div>

            <div className="flex flex-1 flex-col space-y-1.5">
              <Label htmlFor="exam-grade-comment">
                Feedback comment (optional)
              </Label>
              <textarea
                id="exam-grade-comment"
                rows={5}
                maxLength={1000}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Write constructive feedback for the student…"
                className="min-h-[110px] w-full flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              />
            </div>

            <div className="flex flex-wrap items-center justify-end gap-2 border-t pt-3">
              <Button type="button" variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button type="submit" variant={hasNext ? 'outline' : 'default'} disabled={gradeMutation.isPending}>
                {gradeMutation.isPending ? 'Saving…' : 'Save grade'}
              </Button>
              {hasNext && (
                <Button
                  type="button"
                  disabled={gradeMutation.isPending}
                  onClick={() => submitGrade(true)}
                >
                  Save &amp; Next
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              )}
            </div>
          </form>
        </div>
      }
      />
      <FilePreviewModal
        open={fullScreenFileIndex !== null}
        files={previewFiles}
        initialIndex={fullScreenFileIndex ?? 0}
        title={`${student.fullName} (${student.studentCode}) — Attempt #${targetAttempt.attemptNumber}`}
        defaultFullScreen
        onClose={() => setFullScreenFileIndex(null)}
      />
    </>
  );
};

const LecturerAttemptReviewPanel = ({
  classId,
  examId,
  sessionId,
  student,
  onSelectSession,
  onBack,
}: {
  classId: string;
  examId: string;
  sessionId: string;
  student: LecturerStudentExamResult | null;
  onSelectSession: (sessionId: string) => void;
  onBack: () => void;
}) => {
  const reviewState = toAsyncState(
    useLecturerAttemptReview(classId, examId, sessionId),
  );
  return (
    <div className="space-y-4">
      {student && student.attempts.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-4">
          <div>
            <p className="m-0 text-sm font-semibold text-foreground">
              {student.fullName}{' '}
              <span className="font-normal text-muted-foreground">
                ({student.studentCode} · {student.email})
              </span>
            </p>
            <p className="m-0 mt-0.5 text-xs text-muted-foreground">
              {student.attempts.length} attempt
              {student.attempts.length === 1 ? '' : 's'} · Best score:{' '}
              <span className="font-mono font-semibold text-brand">
                {student.bestScore !== null
                  ? `${student.bestScore.toFixed(2)} / 10`
                  : '—'}
              </span>
            </p>
          </div>

          <div
            role="group"
            aria-label="Select student attempt to review"
            className="flex flex-wrap items-center gap-1.5"
          >
            {student.attempts.map((att) => {
              const isSelected = att.sessionId === sessionId;
              const isBest =
                student.bestScore !== null && att.score === student.bestScore;
              return (
                <button
                  key={att.sessionId}
                  type="button"
                  onClick={() => onSelectSession(att.sessionId)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-background text-foreground hover:bg-accent',
                  )}
                >
                  <span>Attempt #{att.attemptNumber}</span>
                  <span
                    className={cn(
                      'font-mono',
                      isSelected
                        ? 'text-primary-foreground/90'
                        : 'text-muted-foreground',
                    )}
                  >
                    {att.score !== null ? `${att.score.toFixed(2)}/10` : '—'}
                  </span>
                  {att.correctCount !== null &&
                    att.totalQuestions !== null && (
                      <span
                        className={cn(
                          'text-[11px]',
                          isSelected
                            ? 'text-primary-foreground/80'
                            : 'text-muted-foreground',
                        )}
                      >
                        ({att.correctCount}/{att.totalQuestions})
                      </span>
                    )}
                  {isBest && (
                    <Trophy
                      className={cn(
                        'h-3 w-3',
                        isSelected ? 'text-primary-foreground' : 'text-warning',
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      <AsyncView
        state={reviewState}
        empty={
          <EmptyState
            title="Attempt review not available"
            action={<Button onClick={onBack}>Back to results</Button>}
          />
        }
      >
        {(review) => <AttemptReviewViewer review={review} onBack={onBack} />}
      </AsyncView>
    </div>
  );
};

