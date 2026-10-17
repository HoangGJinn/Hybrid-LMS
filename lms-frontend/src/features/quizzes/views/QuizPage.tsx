import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { CheckCircle2, XCircle } from 'lucide-react'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { PageHeader } from '@shared/components/PageHeader'
import { StatusBadge } from '@shared/components/ui/badge'
import { Button } from '@shared/components/ui/button'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'
import { useQuiz } from '../hooks/useQuiz'
import { useSubmitQuiz } from '../hooks/useSubmitQuiz'
import type { QuizInstance } from '../types/quizzes.types'

const QuizPage = () => {
  const { quizId = '' } = useParams()
  const state = toAsyncState(useQuiz(quizId))
  return (
    <AsyncView state={state} empty={<EmptyState title="Quiz not found" action={<Link to="/student/courses">Back to My Courses</Link>} />}>
      {(quiz) => <QuizRunner key={quiz.id} quiz={quiz} />}
    </AsyncView>
  )
}

const QuizRunner = ({ quiz }: { quiz: QuizInstance }) => {
  const submitQuiz = useSubmitQuiz()
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const reviewing = quiz.status === 'GRADED' || quiz.status === 'SUBMITTED'
  const answered = Object.keys(answers).length

  // The graded quiz is written into the query cache by the mutation, so `quiz` flips to review mode by itself.
  const handleSubmit = () => submitQuiz.mutate({
    quizId: quiz.id,
    answers: Object.entries(answers).map(([questionId, selectedIndex]) => ({ questionId, selectedIndex })),
  })

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title={quiz.title} subtitle={`${quiz.questions.length} questions · ${quiz.targetDifficulty}`} actions={<StatusBadge status={quiz.status} />} />
      {reviewing && quiz.score !== null && (
        <div className="mb-6 rounded-lg border border-primary/30 bg-primary/15 p-4">
          <p className="m-0 text-sm text-muted-foreground">Your score</p>
          <p className="m-0 text-3xl font-bold text-brand">{quiz.score} / 10</p>
        </div>
      )}
      <ol className="m-0 list-none space-y-4 p-0">
        {quiz.questions.map((q, qi) => (
          <li key={q.id} className="rounded-lg border bg-card p-4">
            <p className="mt-0 font-medium">{qi + 1}. {q.content}</p>
            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi
                const correct = reviewing && oi === q.correctIndex
                const wrong = reviewing && selected && oi !== q.correctIndex
                return (
                  <label key={oi} className={cn('flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm',
                    selected && !reviewing && 'border-primary bg-primary/15',
                    correct && 'border-success bg-success/10',
                    wrong && 'border-destructive bg-destructive/5',
                    reviewing && 'cursor-default')}>
                    <input type="radio" name={q.id} disabled={reviewing} checked={selected} onChange={() => setAnswers((a) => ({ ...a, [q.id]: oi }))} />
                    <span className="flex-1">{opt}</span>
                    {correct && <CheckCircle2 className="h-4 w-4 text-success" />}
                    {wrong && <XCircle className="h-4 w-4 text-destructive" />}
                  </label>
                )
              })}
            </div>
            {reviewing && <p className="mb-0 mt-3 rounded-md bg-muted p-3 text-sm"><strong>Explanation:</strong> {q.explanation}</p>}
          </li>
        ))}
      </ol>
      {!reviewing && (
        <div className="sticky bottom-0 mt-6 flex items-center justify-between gap-3 border-t bg-background py-4">
          <span className="text-sm text-muted-foreground">{answered} of {quiz.questions.length} answered</span>
          {submitQuiz.isError && <span className="text-sm text-destructive">Submission failed. Please try again.</span>}
          <Button disabled={submitQuiz.isPending || answered < quiz.questions.length} onClick={handleSubmit}>{submitQuiz.isPending ? 'Submitting…' : 'Submit Quiz'}</Button>
        </div>
      )}
    </div>
  )
}

export default QuizPage
