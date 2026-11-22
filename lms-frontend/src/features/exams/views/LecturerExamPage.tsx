import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { BarChart3, Download, FileQuestion, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { FilePreviewPanel } from '@shared/components/file-preview';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { formatDateTime } from '@shared/utils/format';
import { CreateExamDialog } from '../components/CreateExamDialog';
import { LecturerExamResultsTab } from '../components/LecturerExamResultsTab';
import { LecturerQuestionsViewer } from '../components/LecturerQuestionsViewer';
import { useLecturerExam } from '../hooks/useLecturerExam';
import { useUpdateExam } from '../hooks/useUpdateExam';
import type { LecturerExam } from '../types/exams.types';

type LecturerExamTab = 'CONTENT' | 'RESULTS';

/** Lecturer view of an exam of one of their classes: the schedule, questions/file, results, grading and CSV export. */
const LecturerExamPage = () => {
  const { courseId = '', examId = '' } = useParams();
  const state = toAsyncState(useLecturerExam(courseId, examId));
  const updateExam = useUpdateExam();
  const [isEditingExam, setIsEditingExam] = useState(false);
  const [activeTab, setActiveTab] = useState<LecturerExamTab>('CONTENT');
  return (
    <AsyncView
      state={state}
      empty={
        <EmptyState
          title="Exam not found"
          action={<Link to={`/lecturer/classes/${courseId}`}>Back to course</Link>}
        />
      }
    >
      {(exam) => (
        <div className="space-y-4">
          <PageHeader
            title={exam.examName}
            subtitle={`${formatDateTime(exam.startTime)} → ${formatDateTime(exam.endTime)} · ${exam.durationMinutes} minutes per student · ${exam.maxAttempts === null ? 'Unlimited attempts' : `${exam.maxAttempts} ${exam.maxAttempts === 1 ? 'attempt' : 'attempts'}`} · ${exam.showResults ? 'Results visible' : 'Results hidden'}${exam.shuffleQuestions || exam.shuffleOptions ? ` · Shuffled (${[exam.shuffleQuestions && 'questions', exam.shuffleOptions && 'answers'].filter(Boolean).join(' & ')})` : ''}`}
            actions={
              <Button
                variant="outline"
                onClick={() => setIsEditingExam(true)}
              >
                <Pencil className="mr-1 h-4 w-4" />
                Edit
              </Button>
            }
          />

          {/* Tab Navigation: Content vs Results & Grading */}
          <div
            role="tablist"
            aria-label="Exam management tabs"
            className="flex items-center gap-2 border-b pb-2"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'CONTENT'}
              onClick={() => setActiveTab('CONTENT')}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
                activeTab === 'CONTENT'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <FileQuestion className="h-4 w-4" />
              {exam.format === 'FILE'
                ? 'Question File'
                : `Questions (${exam.questions.length})`}
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'RESULTS'}
              onClick={() => setActiveTab('RESULTS')}
              className={cn(
                'inline-flex items-center gap-2 rounded-md px-4 py-2 text-sm font-semibold transition-colors',
                activeTab === 'RESULTS'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-foreground',
              )}
            >
              <BarChart3 className="h-4 w-4" />
              Results &amp; Grading ({exam.startedCount})
            </button>
          </div>

          {isEditingExam && (
            <CreateExamDialog
              key={exam.id}
              open
              exam={exam}
              isSubmitting={updateExam.isPending}
              onClose={() => setIsEditingExam(false)}
              onSubmit={(input, keptFileId) =>
                updateExam.mutate(
                  { classId: courseId, exam, input, keptFileId },
                  {
                    onSuccess: () => {
                      setIsEditingExam(false);
                      toast.success('Exam updated');
                    },
                    onError: (error) => toast.error(error.message),
                  },
                )
              }
            />
          )}

          {activeTab === 'RESULTS' ? (
            <LecturerExamResultsTab classId={courseId} exam={exam} />
          ) : exam.format === 'FILE' ? (
            <QuestionFile exam={exam} />
          ) : (
            <LecturerQuestionsViewer exam={exam} />
          )}
        </div>
      )}
    </AsyncView>
  );
};

const QuestionFile = ({ exam }: { exam: LecturerExam }) => (
  <div className="space-y-4 rounded-lg border bg-card p-5">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="m-0 text-sm text-muted-foreground">
        Students receive this exam as a file.
      </p>
      {exam.file && (
        <Button variant="outline" asChild>
          <a href={exam.file.downloadUrl} download={exam.file.fileName}>
            <Download className="mr-2 h-4 w-4" />
            {exam.file.fileName}
          </a>
        </Button>
      )}
    </div>
    {exam.file ? (
      <FilePreviewPanel
        files={[
          {
            fileId: exam.file.fileId,
            fileName: exam.file.fileName,
            fileUrl: exam.file.downloadUrl,
            size: exam.file.size,
          },
        ]}
        className="h-[72vh]"
      />
    ) : (
      <p className="m-0 text-sm text-destructive">
        The question file is not available.
      </p>
    )}
  </div>
);

export default LecturerExamPage;
