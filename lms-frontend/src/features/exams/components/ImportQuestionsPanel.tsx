import { useState } from 'react';
import { ChevronDown, ChevronUp, Download, HelpCircle } from 'lucide-react';
import { CsvFilePicker } from '@shared/components/CsvFilePicker';
import { Button } from '@shared/components/ui/button';
import { readCsvFile } from '@shared/utils/csv';
import {
  EXAM_MAX_QUESTIONS,
  MAX_OPTIONS,
  MIN_OPTIONS,
  type ExamQuestionDraft,
} from '../utils/exam-form';
import {
  exportQuestionsCsv,
  isBlankQuestion,
  parseQuestionCsv,
  QUESTION_TEMPLATE_CSV,
} from '../utils/exam-csv';

const MAX_LISTED_ERRORS = 20;

interface ImportQuestionsPanelProps {
  /** The questions in the editor now; the file's questions are added after them. */
  questions: ExamQuestionDraft[];
  onChange: (questions: ExamQuestionDraft[]) => void;
  /** Compact mode collapses format instructions behind a toggle to save vertical space in the Question Builder. */
  compact?: boolean;
}

/**
 * Fills the editor from a CSV file read in the browser (nothing is uploaded), provides the updated
 * 9-column template (MCQ single/multi-answer + Cloze FIB), and lets the lecturer export current questions.
 */
export const ImportQuestionsPanel = ({
  questions,
  onChange,
  compact = false,
}: ImportQuestionsPanelProps) => {
  const [errors, setErrors] = useState<string[]>([]);
  const [added, setAdded] = useState<number | null>(null);
  const [showHelp, setShowHelp] = useState(!compact);
  const nonBlankQuestions = questions.filter((q) => !isBlankQuestion(q));

  const handleFile = async (file: File) => {
    setErrors([]);
    setAdded(null);
    const read = await readCsvFile(file);
    if (read.error !== null) {
      setErrors([read.error]);
      return;
    }
    const kept = questions.filter((question) => !isBlankQuestion(question));
    const parsed = parseQuestionCsv(read.text, kept.length);
    if (parsed.errors.length > 0) {
      setErrors(parsed.errors);
      return;
    }
    onChange([...kept, ...parsed.questions]);
    setAdded(parsed.questions.length);
  };

  return (
    <div className="space-y-2 rounded-lg border border-dashed bg-muted/15 px-3 py-2.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <CsvFilePicker
            ariaLabel="Questions CSV file"
            templateCsv={QUESTION_TEMPLATE_CSV}
            templateFileName="exam-questions-template.csv"
            onPickFile={(file) => void handleFile(file)}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={nonBlankQuestions.length === 0}
            onClick={() => exportQuestionsCsv(nonBlankQuestions)}
          >
            <Download className="mr-1 h-3 w-3" />
            Export CSV
          </Button>
        </div>
        {compact && (
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => setShowHelp((prev) => !prev)}
            className="h-7 px-2 text-xs text-muted-foreground"
          >
            <HelpCircle className="mr-1 h-3.5 w-3.5" />
            CSV guide
            {showHelp ? (
              <ChevronUp className="ml-1 h-3 w-3" />
            ) : (
              <ChevronDown className="ml-1 h-3 w-3" />
            )}
          </Button>
        )}
      </div>

      {showHelp && (
        <p className="m-0 text-xs text-muted-foreground">
          Import or export up to {EXAM_MAX_QUESTIONS} questions via CSV. Columns:
          Type (<code>MCQ</code> or <code>FIB</code>), Question, Option A to
          Option F, Correct. For <code>MCQ</code>: {MIN_OPTIONS}–{MAX_OPTIONS}{' '}
          options from A, with single or comma-separated answers in Correct (e.g.{' '}
          <code>B</code> or <code>A,C</code>). For <code>FIB</code>: use{' '}
          <code>{'{{1}}'}</code>, <code>{'{{2}}'}</code> in Question and put
          acceptable variants separated by <code>|</code> in Option A, Option B…
          Excel users: save as “CSV UTF-8”.
        </p>
      )}

      {added !== null && (
        <p role="status" className="m-0 text-xs text-success">
          Added {added} {added === 1 ? 'question' : 'questions'} from the file.
          Review them below, then save the exam.
        </p>
      )}
      {errors.length > 0 && (
        <div
          role="alert"
          className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          <p className="m-0 font-medium">
            Nothing was imported. Fix the file and choose it again:
          </p>
          <ul className="m-0 mt-1 list-disc space-y-0.5 pl-4">
            {errors.slice(0, MAX_LISTED_ERRORS).map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
          {errors.length > MAX_LISTED_ERRORS && (
            <p className="m-0 mt-1">
              Showing the first {MAX_LISTED_ERRORS} of {errors.length} problems.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
