import { useState } from 'react';
import { toast } from 'sonner';
import { Sparkles, Upload } from 'lucide-react';
import { AsyncView } from '@shared/components/AsyncView';
import { EmptyState } from '@shared/components/EmptyState';
import { PageHeader } from '@shared/components/PageHeader';
import { Button } from '@shared/components/ui/button';
import { Label } from '@shared/components/ui/label';
import { toAsyncState } from '@shared/utils/async-state';
import { cn } from '@shared/utils/cn';
import { BatchStatusPill } from '../components/BatchStatusPill';
import { ImportDialog } from '../components/ImportDialog';
import { ImportResultView } from '../components/ImportResultView';
import { QuestionCard } from '../components/QuestionCard';
import { useImportBatches } from '../hooks/useImportBatches';
import { useQuestionCounts } from '../hooks/useQuestionCounts';
import { useQuestions } from '../hooks/useQuestions';
import { useReviewQuestion } from '../hooks/useReviewQuestion';
import { useSetQuestionActive } from '../hooks/useSetQuestionActive';
import { useSubjects } from '../hooks/useSubjects';
import { formatDateTime } from '../utils/format-date';
import type {
  ActiveFilter,
  ImportBatch,
  QuestionListParams,
  ReviewFilter,
  SubjectOption,
} from '../types/question-bank.types';

const PAGE_SIZE = 20;
const TEMPLATE_URL = '/templates/question_import_template.xlsx';

const REVIEW_FILTERS: { key: ReviewFilter; label: string }[] = [
  { key: 'ALL', label: 'All' },
  { key: 'PENDING_REVIEW', label: 'Pending review' },
  { key: 'APPROVED', label: 'Approved' },
  { key: 'REJECTED', label: 'Rejected' },
];

const selectClass = 'h-10 rounded-md border bg-background px-3 text-sm';

const QuestionBankPage = () => {
  const subjects = toAsyncState(useSubjects());
  return (
    <AsyncView
      state={subjects}
      isEmpty={(d) => d.length === 0}
      empty={<EmptyState title="No subjects" />}
    >
      {(list) => <QuestionBankContent subjects={list} />}
    </AsyncView>
  );
};

const QuestionBankContent = ({ subjects }: { subjects: SubjectOption[] }) => {
  const [subjectId, setSubjectId] = useState(subjects[0].id);
  const [tab, setTab] = useState<'questions' | 'history'>('questions');
  const [reviewFilter, setReviewFilter] = useState<ReviewFilter>('ALL');
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>('ALL');
  const [batchId, setBatchId] = useState('');
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState('');
  const [importOpen, setImportOpen] = useState(false);
  const [reportBatch, setReportBatch] = useState<ImportBatch | null>(null);

  const subject = subjects.find((s) => s.id === subjectId) ?? subjects[0];

  const params: QuestionListParams = {
    subjectId,
    reviewStatus: reviewFilter === 'ALL' ? undefined : reviewFilter,
    isActive: activeFilter === 'ALL' ? undefined : activeFilter === 'ACTIVE',
    importBatchId: batchId || undefined,
    page,
    limit: PAGE_SIZE,
  };
  const questions = toAsyncState(useQuestions(params));
  const batches = useImportBatches(subjectId);
  const batchList = toAsyncState(batches);
  const counts = useQuestionCounts(subjectId);
  const review = useReviewQuestion();
  const setActive = useSetQuestionActive();

  const resetFilters = () => {
    setReviewFilter('ALL');
    setActiveFilter('ALL');
    setBatchId('');
    setPage(1);
    setExpandedId('');
  };

  const changeSubject = (id: string) => {
    setSubjectId(id);
    resetFilters();
  };

  const viewBatchQuestions = (batch: ImportBatch) => {
    resetFilters();
    setBatchId(batch.id);
    setTab('questions');
    setImportOpen(false);
    setReportBatch(null);
  };

  const showPending = () => {
    setReviewFilter('PENDING_REVIEW');
    setPage(1);
    setExpandedId('');
  };

  const onError = (error: Error) => toast.error(error.message);

  return (
    <div>
      <PageHeader
        title="Question Bank"
        subtitle="Approved, active questions here are what students' quizzes are drawn from."
        actions={
          <div className="flex flex-wrap gap-2">
            <a
              href={TEMPLATE_URL}
              download
              className="inline-flex h-10 items-center rounded-md border px-4 text-sm font-medium hover:bg-muted"
            >
              Download template
            </a>
            <Button type="button" onClick={() => setImportOpen(true)}>
              <Upload className="mr-2 h-4 w-4" />
              Import Excel
            </Button>
          </div>
        }
      />

      <div className="mb-5 flex flex-wrap items-end gap-5 rounded-lg border bg-card p-4">
        <div className="min-w-64 flex-1 space-y-1.5 sm:max-w-md">
          <Label htmlFor="subject">Subject</Label>
          <select
            id="subject"
            value={subjectId}
            onChange={(e) => changeSubject(e.target.value)}
            className={cn(selectClass, 'w-full')}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.subjectCode} · {s.name}
              </option>
            ))}
          </select>
        </div>
        <p className="m-0 pb-2 text-sm text-muted-foreground">
          <strong className="text-foreground">{counts.total ?? '–'}</strong>{' '}
          questions ·{' '}
          <strong className="text-foreground">{counts.pending ?? '–'}</strong>{' '}
          pending review ·{' '}
          <strong className="text-foreground">{counts.inactive ?? '–'}</strong>{' '}
          inactive
        </p>
      </div>

      <div role="tablist" className="mb-5 flex gap-1 border-b">
        {(
          [
            ['questions', 'Questions'],
            ['history', 'Import history'],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={cn(
              '-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold',
              tab === key
                ? 'border-primary text-brand'
                : 'border-transparent text-muted-foreground',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'questions' ? (
        <div className="space-y-4">
          {(counts.pending ?? 0) > 0 && reviewFilter !== 'PENDING_REVIEW' && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-amber-300 bg-amber-100 p-3 text-sm text-amber-900">
              <span className="flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                <span>
                  <strong>{counts.pending} questions</strong> are waiting for
                  your review. Students won't see them until you approve.
                </span>
              </span>
              <Button type="button" variant="outline" onClick={showPending}>
                Review now
              </Button>
            </div>
          )}

          <div className="flex flex-wrap items-end justify-between gap-4">
            <div
              role="group"
              aria-label="Review status"
              className="flex flex-wrap gap-2"
            >
              {REVIEW_FILTERS.map((f) => (
                <button
                  key={f.key}
                  type="button"
                  aria-pressed={reviewFilter === f.key}
                  onClick={() => {
                    setReviewFilter(f.key);
                    setPage(1);
                    setExpandedId('');
                  }}
                  className={cn(
                    'h-10 rounded-full border px-4 text-sm font-medium',
                    reviewFilter === f.key
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'bg-card',
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="space-y-1">
                <Label htmlFor="availability">Availability</Label>
                <select
                  id="availability"
                  value={activeFilter}
                  onChange={(e) => {
                    setActiveFilter(e.target.value as ActiveFilter);
                    setPage(1);
                  }}
                  className={cn(selectClass, 'block')}
                >
                  <option value="ALL">All</option>
                  <option value="ACTIVE">Active only</option>
                  <option value="INACTIVE">Inactive only</option>
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="batch">Import batch</Label>
                <select
                  id="batch"
                  value={batchId}
                  onChange={(e) => {
                    setBatchId(e.target.value);
                    setPage(1);
                  }}
                  className={cn(selectClass, 'block')}
                >
                  <option value="">All batches</option>
                  {batches.data?.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.fileName ?? 'Excel import'} ·{' '}
                      {formatDateTime(b.createdAt)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <AsyncView
            state={questions}
            isEmpty={(d) => d.items.length === 0}
            empty={<EmptyState title="No questions match these filters" />}
          >
            {(data) => {
              const totalPages = Math.max(1, Math.ceil(data.total / PAGE_SIZE));
              const first = (data.page - 1) * PAGE_SIZE;
              return (
                <>
                  <ol className="m-0 list-none space-y-3 p-0">
                    {data.items.map((q, i) => (
                      <QuestionCard
                        key={q.id}
                        question={q}
                        number={first + i + 1}
                        expanded={expandedId === q.id}
                        busy={
                          (review.isPending && review.variables?.id === q.id) ||
                          (setActive.isPending &&
                            setActive.variables?.id === q.id)
                        }
                        onToggle={() =>
                          setExpandedId(expandedId === q.id ? '' : q.id)
                        }
                        onReview={(reviewStatus) =>
                          review.mutate({ id: q.id, reviewStatus }, { onError })
                        }
                        onSetActive={(isActive) =>
                          setActive.mutate({ id: q.id, isActive }, { onError })
                        }
                      />
                    ))}
                  </ol>
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-muted-foreground">
                    <span>
                      Showing {first + 1}–{first + data.items.length} of{' '}
                      {data.total} questions
                    </span>
                    <span className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        disabled={page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </Button>
                      <span>
                        Page {data.page} of {totalPages}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        disabled={page >= totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </Button>
                    </span>
                  </div>
                </>
              );
            }}
          </AsyncView>
        </div>
      ) : (
        <AsyncView
          state={batchList}
          isEmpty={(d) => d.length === 0}
          empty={
            <EmptyState
              title="No imports yet"
              description="Imported Excel files for this subject show up here."
            />
          }
        >
          {(list) => (
            <div className="overflow-x-auto rounded-lg border bg-card">
              <table className="w-full min-w-[640px] border-collapse text-sm">
                <thead>
                  <tr className="border-b bg-muted text-left text-xs text-muted-foreground">
                    <th className="px-4 py-3 font-semibold">File</th>
                    <th className="px-4 py-3 font-semibold">Uploaded</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="px-4 py-3 font-semibold">Imported</th>
                    <th className="px-4 py-3 font-semibold">Failed</th>
                    <th className="px-4 py-3 font-semibold">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((b) => (
                    <tr key={b.id} className="border-b last:border-b-0">
                      <td className="px-4 py-3 font-medium">
                        {b.fileName ?? 'Excel import'}
                      </td>
                      <td className="px-4 py-3">{formatDateTime(b.createdAt)}</td>
                      <td className="px-4 py-3">
                        <BatchStatusPill status={b.status} />
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {b.successRows}
                        <span className="font-normal text-muted-foreground">
                          {' '}
                          / {b.totalRows}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold">
                        {b.failedRows}
                      </td>
                      <td className="px-4 py-3">
                        {b.status === 'COMPLETED' ? (
                          <button
                            type="button"
                            onClick={() => viewBatchQuestions(b)}
                            className="font-medium text-brand underline"
                          >
                            View questions
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setReportBatch(b)}
                            className="font-medium text-brand underline"
                          >
                            View error report
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </AsyncView>
      )}

      {importOpen && (
        <ImportDialog
          subject={subject}
          onClose={() => setImportOpen(false)}
          onViewQuestions={viewBatchQuestions}
        />
      )}
      {reportBatch && (
        <ImportResultView
          batch={reportBatch}
          onClose={() => setReportBatch(null)}
          onViewQuestions={() => viewBatchQuestions(reportBatch)}
        />
      )}
    </div>
  );
};

export default QuestionBankPage;