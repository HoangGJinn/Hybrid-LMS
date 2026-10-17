import { toast } from 'sonner'
import { useState } from 'react'
import { useParams } from 'react-router'
import { ArrowDown, ArrowUp, FileText, ClipboardList, PenSquare, Plus, Trash2 } from 'lucide-react'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { ErrorState } from '@shared/components/ErrorState'
import { PageHeader } from '@shared/components/PageHeader'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { toAsyncState } from '@shared/utils/async-state'
import { useCourseSections } from '../hooks/useCourse'
import { useSaveSections } from '../hooks/useSaveSections'
import type { ItemType, Section } from '../types/courses.types'

const icons = { DOCUMENT: FileText, ASSIGNMENT: ClipboardList, EXAM: PenSquare }

const move = <T,>(arr: T[], i: number, d: -1 | 1) => {
  const j = i + d
  if (j < 0 || j >= arr.length) return arr
  const next = [...arr]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

const CourseEditorPage = () => {
  const { courseId = '' } = useParams()
  const state = toAsyncState(useCourseSections(courseId))
  const saveSections = useSaveSections(courseId)
  // `null` = read-only view of the server data. While editing, the draft overlays it, so no effect has to copy query data into state.
  const [draft, setDraft] = useState<Section[] | null>(null)
  const editing = draft !== null

  const setSections = (updater: (current: Section[]) => Section[]) => setDraft((current) => (current === null ? current : updater(current)))
  const update = (id: string, patch: Partial<Section>) => setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)))
  const addSection = () => setSections((s) => [...s, { id: crypto.randomUUID(), classId: courseId, title: `Week ${s.length + 1} — New section`, orderIndex: s.length + 1, items: [] }])
  const addItem = (sec: Section, itemType: ItemType) => update(sec.id, {
    items: [...sec.items, { id: crypto.randomUUID(), sectionId: sec.id, itemType, title: `New ${itemType.toLowerCase()}`, externalUrl: null, orderIndex: sec.items.length + 1, documentId: null, assignmentId: null, isCompleted: false }],
  })

  const handleStartEditing = () => setDraft(state.data ?? [])
  const handleCancel = () => setDraft(null)
  const handleSave = () => {
    if (draft === null) return
    const normalized = draft.map((s, i) => ({ ...s, orderIndex: i + 1, items: s.items.map((it, j) => ({ ...it, orderIndex: j + 1 })) }))
    saveSections.mutate(normalized, {
      onSuccess: () => {
        toast.success('Course content saved')
        setDraft(null)
      },
    })
  }

  return (
    <div>
      <PageHeader
        title="Course Editor"
        subtitle="Organize weekly sections, documents, assignments and exams"
        actions={editing ? (
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleCancel} disabled={saveSections.isPending}>Cancel</Button>
            <Button onClick={handleSave} disabled={saveSections.isPending}>{saveSections.isPending ? 'Saving…' : 'Save changes'}</Button>
          </div>
        ) : <Button onClick={handleStartEditing} disabled={!state.data}>Turn editing on</Button>}
      />
      {saveSections.error && <div className="mb-4"><ErrorState message={saveSections.error.message} onRetry={handleSave} /></div>}
      <AsyncView state={state}>
        {(serverSections) => {
          const sections = draft ?? serverSections
          return (
            <div className="space-y-4">
              {sections.length === 0 && <EmptyState title="No sections yet" description="Turn editing on to add the first section." />}
              {sections.map((sec, i) => (
                <div key={sec.id} className="rounded-lg border bg-card">
                  <div className="flex items-center gap-2 border-b p-4">
                    {editing ? (
                      <Input aria-label="Section title" value={sec.title} onChange={(e) => update(sec.id, { title: e.target.value })} className="flex-1" />
                    ) : <h2 className="m-0 flex-1 text-base font-semibold">{sec.title}</h2>}
                    {editing && (
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" aria-label="Move section up" onClick={() => setSections((s) => move(s, i, -1))}><ArrowUp className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Move section down" onClick={() => setSections((s) => move(s, i, 1))}><ArrowDown className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" aria-label="Delete section" onClick={() => setSections((s) => s.filter((x) => x.id !== sec.id))}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </div>
                    )}
                  </div>
                  <ul className="m-0 list-none space-y-1 p-3">
                    {sec.items.length === 0 && <li className="px-2 py-1 text-sm text-muted-foreground">No items in this section.</li>}
                    {sec.items.map((it, j) => {
                      const Icon = icons[it.itemType]
                      return (
                        <li key={it.id} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/50">
                          <Icon className="h-4 w-4 text-brand" />
                          {editing ? (
                            <Input aria-label="Item title" value={it.title} onChange={(e) => update(sec.id, { items: sec.items.map((x) => (x.id === it.id ? { ...x, title: e.target.value } : x)) })} className="h-8 flex-1" />
                          ) : <span className="flex-1 text-sm">{it.title}</span>}
                          <span className="text-xs text-muted-foreground">{it.itemType}</span>
                          {editing && (
                            <div className="flex gap-1">
                              <Button size="icon" variant="ghost" aria-label="Move item up" onClick={() => update(sec.id, { items: move(sec.items, j, -1) })}><ArrowUp className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" aria-label="Move item down" onClick={() => update(sec.id, { items: move(sec.items, j, 1) })}><ArrowDown className="h-3 w-3" /></Button>
                              <Button size="icon" variant="ghost" aria-label="Delete item" onClick={() => update(sec.id, { items: sec.items.filter((x) => x.id !== it.id) })}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                            </div>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                  {editing && (
                    <div className="flex flex-wrap gap-2 border-t p-3">
                      {(['DOCUMENT', 'ASSIGNMENT', 'EXAM'] as ItemType[]).map((t) => (
                        <Button key={t} size="sm" variant="outline" onClick={() => addItem(sec, t)}><Plus className="mr-1 h-3 w-3" />{t.charAt(0) + t.slice(1).toLowerCase()}</Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
              {editing && <Button variant="outline" className="w-full" onClick={addSection}><Plus className="mr-2 h-4 w-4" />Add section</Button>}
            </div>
          )
        }}
      </AsyncView>
    </div>
  )
}

export default CourseEditorPage
