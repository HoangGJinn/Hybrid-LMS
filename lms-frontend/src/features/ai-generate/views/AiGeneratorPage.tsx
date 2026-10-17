import { toast } from 'sonner'
import { useState } from 'react'
import { Check, FileText, Loader2, Sparkles, Trash2 } from 'lucide-react'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { ErrorState } from '@shared/components/ErrorState'
import { PageHeader } from '@shared/components/PageHeader'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { Label } from '@shared/components/ui/label'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'
import { ClassSelect, useClassSelection } from '@features/courses'
import { useDocuments } from '@features/documents'
import { useGenerateDraft } from '../hooks/useGenerateDraft'
import { useKnowledgeComponents } from '../hooks/useKnowledgeComponents'
import { usePublishAssessment } from '../hooks/usePublishAssessment'
import type { Difficulty } from '@features/quizzes'
import type { DraftQuestion, PublishTarget } from '../types/ai-generate.types'
import { Card } from '@shared/components/ui/card'

const steps = ['Source', 'Configure', 'Review & publish']

const toggle = (arr: string[], id: string) => (arr.includes(id) ? arr.filter((x) => x !== id) : [...arr, id])

const AiGeneratorPage = () => {
  const { classes: classesQuery, classId, setClassId } = useClassSelection()
  const classes = toAsyncState(classesQuery)
  const [step, setStep] = useState(0)
  const [docIds, setDocIds] = useState<string[]>([])
  const [kcIds, setKcIds] = useState<string[]>([])
  const [numQuestions, setNumQuestions] = useState(5)
  const [difficulty, setDifficulty] = useState<Difficulty>('MEDIUM')
  const [drafts, setDrafts] = useState<DraftQuestion[]>([])
  const [title, setTitle] = useState('AI-generated Quiz')
  const [target, setTarget] = useState<PublishTarget>('QUIZ')
  const [published, setPublished] = useState(false)
  const docs = toAsyncState(useDocuments(classId))
  const kcs = toAsyncState(useKnowledgeComponents(docIds))
  const generateDraft = useGenerateDraft()
  const publishAssessment = usePublishAssessment()
  const generating = generateDraft.isPending
  const publishing = publishAssessment.isPending

  const handleGenerate = () => generateDraft.mutate(
    { classId, documentIds: docIds, kcIds, numQuestions, difficulty },
    { onSuccess: (generated) => { setDrafts(generated); setStep(2) } },
  )

  const updateDraft = (id: string, patch: Partial<DraftQuestion>) => setDrafts((d) => d.map((q) => (q.id === id ? { ...q, ...patch } : q)))

  const handlePublish = () => publishAssessment.mutate(
    { classId, title: title.trim(), target, questions: drafts },
    { onSuccess: () => { setPublished(true); toast.success('Assessment published') } },
  )

  const reset = () => { setStep(0); setDocIds([]); setKcIds([]); setDrafts([]); setPublished(false); generateDraft.reset(); publishAssessment.reset() }

  return (
    <div>
      <PageHeader title="AI Assessment Generator" subtitle="Create quizzes and exams from course documents, targeted by knowledge component" />
      <ol className="m-0 mb-6 flex list-none flex-wrap gap-2 p-0">
        {steps.map((s, i) => (
          <li key={s} className={cn('flex items-center gap-2 rounded-full border px-3 py-1 text-sm', i === step ? 'border-primary bg-primary text-primary-foreground' : i < step ? 'bg-primary/25 text-brand' : 'bg-card text-muted-foreground')}>
            <span className="font-semibold">{i < step ? <Check className="h-3 w-3" /> : i + 1}</span>{s}
          </li>
        ))}
      </ol>

      {published ? (
        <Card>
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/15 text-success"><Check className="h-6 w-6" /></div>
            <p className="m-0 text-lg font-semibold">{target === 'QUIZ' ? 'Quiz' : 'Exam'} published</p>
            <p className="m-0 text-sm text-muted-foreground">“{title}” with {drafts.length} questions is now available to the class.</p>
            <Button onClick={reset}>Create another</Button>
          </div>
        </Card>
      ) : step === 0 ? (
        <AsyncView state={classes} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No classes" />}>
          {(cls) => (
            <Card title="1. Choose class and source documents">
              <div className="mb-4"><ClassSelect classes={cls} value={classId} onChange={(id) => { setClassId(id); setDocIds([]) }} /></div>
              <AsyncView state={docs} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No documents" description="Upload PDFs to this class first." />}>
                {(list) => (
                  <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2">
                    {list.map((d) => (
                      <li key={d.id}>
                        <label className={cn('flex cursor-pointer items-center gap-3 rounded-lg border p-3', docIds.includes(d.id) && 'border-primary bg-primary/15')}>
                          <input type="checkbox" checked={docIds.includes(d.id)} onChange={() => setDocIds((x) => toggle(x, d.id))} />
                          <FileText className="h-4 w-4 text-brand" />
                          <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{d.title}</span><span className="block text-xs text-muted-foreground">{d.fileName}</span></span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </AsyncView>
              <div className="mt-4 flex justify-end"><Button disabled={docIds.length === 0} onClick={() => setStep(1)}>Next</Button></div>
            </Card>
          )}
        </AsyncView>
      ) : step === 1 ? (
        <Card title="2. Configure generation">
          <div className="space-y-5">
            <div>
              <Label>Target knowledge components</Label>
              <AsyncView state={kcs} isEmpty={(d) => d.length === 0} empty={<EmptyState title="No knowledge components extracted" />}>
                {(list) => (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {list.map((k) => (
                      <button key={k.id} type="button" onClick={() => setKcIds((x) => toggle(x, k.id))} className={cn('rounded-full border px-3 py-1 text-xs font-medium', kcIds.includes(k.id) ? 'border-primary bg-primary text-primary-foreground' : 'bg-card')}>{k.name}</button>
                    ))}
                  </div>
                )}
              </AsyncView>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="num">Number of questions</Label>
                <Input id="num" type="number" min={1} max={50} value={numQuestions} onChange={(e) => setNumQuestions(Math.max(1, Math.min(50, Number(e.target.value) || 1)))} />
              </div>
              <div>
                <Label>Difficulty</Label>
                <div className="mt-2 flex gap-2">
                  {(['EASY', 'MEDIUM', 'HARD'] as Difficulty[]).map((d) => (
                    <button key={d} type="button" onClick={() => setDifficulty(d)} className={cn('flex-1 rounded-md border px-3 py-2 text-sm', difficulty === d ? 'border-primary bg-primary/25 font-medium text-brand' : 'bg-card')}>{d.charAt(0) + d.slice(1).toLowerCase()}</button>
                  ))}
                </div>
              </div>
            </div>
            {generateDraft.error && <ErrorState message={generateDraft.error.message} onRetry={handleGenerate} />}
            <div className="flex justify-between">
              <Button variant="outline" onClick={() => setStep(0)} disabled={generating}>Back</Button>
              <Button onClick={handleGenerate} disabled={generating || kcIds.length === 0}>
                {generating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Generating…</> : <><Sparkles className="mr-2 h-4 w-4" />Generate questions</>}
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <Card title="3. Review, edit and publish">
            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <div><Label htmlFor="title">Title</Label><Input id="title" value={title} maxLength={150} onChange={(e) => setTitle(e.target.value)} /></div>
              <div>
                <Label>Publish as</Label>
                <div className="mt-2 flex gap-2">
                  {(['QUIZ', 'EXAM'] as PublishTarget[]).map((t) => (
                    <button key={t} type="button" onClick={() => setTarget(t)} className={cn('rounded-md border px-4 py-2 text-sm', target === t ? 'border-primary bg-primary/25 font-medium text-brand' : 'bg-card')}>{t === 'QUIZ' ? 'Quiz' : 'Exam'}</button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          {drafts.length === 0 && <EmptyState title="All questions removed" description="Go back and generate again." />}
          {drafts.map((q, i) => (
            <Card key={q.id} title={`Question ${i + 1}`} actions={
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-primary/25 px-2 py-0.5 text-xs text-brand">{q.kcName}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">{q.difficulty}</span>
                <Button size="icon" variant="ghost" aria-label="Remove question" onClick={() => setDrafts((d) => d.filter((x) => x.id !== q.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
              </div>
            }>
              <textarea aria-label="Question content" rows={2} value={q.content} onChange={(e) => updateDraft(q.id, { content: e.target.value })} className="mb-3 w-full rounded-md border bg-background p-2 text-sm" />
              <div className="space-y-2">
                {q.options.map((opt, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input type="radio" name={`correct-${q.id}`} aria-label={`Mark option ${oi + 1} correct`} checked={q.correctIndex === oi} onChange={() => updateDraft(q.id, { correctIndex: oi })} />
                    <Input value={opt} onChange={(e) => updateDraft(q.id, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })} className={cn('h-9', q.correctIndex === oi && 'border-success')} />
                  </div>
                ))}
              </div>
              <p className="m-0 mt-3 text-xs text-muted-foreground">Explanation: {q.explanation}</p>
            </Card>
          ))}
          {publishAssessment.error && <ErrorState message={publishAssessment.error.message} onRetry={handlePublish} />}
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep(1)} disabled={publishing}>Back</Button>
            <Button onClick={handlePublish} disabled={publishing || drafts.length === 0 || !title.trim()}>{publishing ? 'Publishing…' : `Publish ${target === 'QUIZ' ? 'quiz' : 'exam'}`}</Button>
          </div>
        </div>
      )}
    </div>
  )
}

export default AiGeneratorPage
