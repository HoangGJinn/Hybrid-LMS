import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { CheckCircle2, Circle, Download, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { formatDateTime } from '@shared/utils/format';
import { CreateExamDialog } from '../components/CreateExamDialog';
import { useLecturerExam } from '../hooks/useLecturerExam';
import { useUpdateExam } from '../hooks/useUpdateExam';
import type { ExamQuestion, LecturerExam } from '../types/exams.types';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Lecturer view of an exam of one of their classes: the schedule and the questions with their correct answers. */
const LecturerExamPage = () => {
  const { courseId = '', examId = '' } = useParams();
  const state = toAsyncState(useLecturerExam(courseId, examId));
  const updateExam = useUpdateExam();
  const [isEditingExam, setIsEditingExam] = useState(false);
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
        <div className="mx-auto max-w-4xl">
          <PageHeader
            title={exam.examName}
            subtitle={`${formatDateTime(exam.startTime)} → ${formatDateTime(exam.endTime)} · ${exam.durationMinutes} minutes per student`}
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
          {exam.format === 'FILE' ? (
            <QuestionFile exam={exam} />
          ) : (
            <Questions questions={exam.questions} />
          )}
        </div>
      )}
    </AsyncView>
  );
};

const QuestionFile = ({ exam }: { exam: LecturerExam }) => (
  <div className="rounded-lg border bg-card p-5">
    <p className="mt-0 text-sm text-muted-foreground">
      Students receive this exam as a file.
    </p>
    {exam.file ? (
      <Button variant="outline" asChild>
        <a href={exam.file.downloadUrl} download={exam.file.fileName}>
          <Download className="mr-2 h-4 w-4" />
          {exam.file.fileName}
        </a>
      </Button>
    ) : (
      <p className="m-0 text-sm text-destructive">
        The question file is not available.
      </p>
    )}
  </div>
);

const Questions = ({ questions }: { questions: ExamQuestion[] }) => (
  <>
    <p className="mt-0 text-sm text-muted-foreground">
      {questions.length} {questions.length === 1 ? 'question' : 'questions'}, one
      point each.
    </p>
    <ol className="m-0 list-none space-y-4 p-0">
      {questions.map((question, index) => (
        <li key={question.id} className="rounded-lg border bg-card p-5">
          <p className="mt-0 font-medium">
            {index + 1}. {question.content}
          </p>
          <ul className="m-0 list-none space-y-2 p-0">
            {question.options.map((option, optionIndex) => (
              <li
                key={option.id}
                className={cn(
                  'flex items-center gap-3 rounded-md border p-3 text-sm',
                  option.isCorrect && 'border-success bg-success/10',
                )}
              >
                {option.isCorrect ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                ) : (
                  <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
                )}
                <span className="font-semibold">
                  {OPTION_LETTERS[optionIndex]}
                </span>
                <span className="flex-1">{option.content}</span>
                {option.isCorrect && (
                  <span className="text-xs font-semibold text-success">
                    Correct
                  </span>
                )}
              </li>
            ))}
          </ul>
        </li>
      ))}
    </ol>
  </>
);

export default LecturerExamPage;
