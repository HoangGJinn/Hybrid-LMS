import { useState } from 'react'
import { Flag } from 'lucide-react'
import { cn } from '@shared/utils/cn'
import type { QuizQuestion } from '@features/quizzes'

type PaletteFilter = 'all' | 'unanswered' | 'flagged'

interface QuestionPaletteProps {
  questions: QuizQuestion[]
  answers: Record<string, number>
  flags: Record<string, boolean>
  current: number
  onSelect: (index: number) => void
}

const FILTER_LABEL: Record<PaletteFilter, string> = { all: 'All', unanswered: 'Unanswered', flagged: 'Flagged' }

const describeQuestion = (index: number, isAnswered: boolean, isFlagged: boolean, isCurrent: boolean) =>
  [`Question ${index + 1}`, isAnswered ? 'answered' : 'not answered', isFlagged && 'flagged for review', isCurrent && 'current question'].filter(Boolean).join(', ')

/** Question navigator for the exam room: status per question, legend, and filters for review. */
const QuestionPalette = ({ questions, answers, flags, current, onSelect }: QuestionPaletteProps) => {
  const [filter, setFilter] = useState<PaletteFilter>('all')
  const answeredCount = questions.filter((q) => answers[q.id] !== undefined).length
  const flaggedCount = questions.filter((q) => flags[q.id]).length
  const counts: Record<PaletteFilter, number> = { all: questions.length, unanswered: questions.length - answeredCount, flagged: flaggedCount }

  const matchesFilter = (q: QuizQuestion) =>
    filter === 'all' || (filter === 'unanswered' && answers[q.id] === undefined) || (filter === 'flagged' && Boolean(flags[q.id]))

  return (
    <div>
      <p className="mt-0 text-sm font-semibold">Question navigator</p>
      <div role="group" aria-label="Filter questions" className="mb-3 flex flex-wrap gap-1.5">
        {(Object.keys(FILTER_LABEL) as PaletteFilter[]).map((f) => (
          <button
            key={f}
            type="button"
            aria-pressed={filter === f}
            onClick={() => setFilter(f)}
            className={cn('rounded-full border px-2.5 py-1 text-xs font-medium', filter === f ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent')}
          >
            {FILTER_LABEL[f]} ({counts[f]})
          </button>
        ))}
      </div>
      <div className="grid grid-cols-5 gap-2">
        {questions.map((q, i) => {
          const isAnswered = answers[q.id] !== undefined
          const isFlagged = Boolean(flags[q.id])
          const isCurrent = i === current
          return (
            <button
              key={q.id}
              type="button"
              onClick={() => onSelect(i)}
              aria-label={describeQuestion(i, isAnswered, isFlagged, isCurrent)}
              aria-current={isCurrent ? 'step' : undefined}
              className={cn(
                'relative h-9 rounded-md border text-sm transition-opacity',
                isAnswered ? 'border-primary bg-primary text-primary-foreground' : 'bg-card text-foreground hover:bg-accent',
                isFlagged && 'border-warning',
                isCurrent && 'ring-2 ring-ring ring-offset-1 ring-offset-card',
                !matchesFilter(q) && 'opacity-30',
              )}
            >
              {i + 1}
              {isFlagged && <Flag aria-hidden="true" className="absolute -right-1.5 -top-1.5 h-3.5 w-3.5 fill-warning text-warning" />}
            </button>
          )
        })}
      </div>
      <ul className="m-0 mt-4 grid list-none gap-1.5 p-0 text-xs text-muted-foreground">
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border border-primary bg-primary" />Answered</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm border bg-card" />Not answered</li>
        <li className="flex items-center gap-2"><Flag aria-hidden="true" className="h-3 w-3 fill-warning text-warning" />Flagged for review</li>
        <li className="flex items-center gap-2"><span className="h-3 w-3 rounded-sm ring-2 ring-ring" />Current question</li>
      </ul>
    </div>
  )
}

export default QuestionPalette
