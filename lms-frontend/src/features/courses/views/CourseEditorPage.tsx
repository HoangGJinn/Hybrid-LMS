import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useParams } from 'react-router'
import { Check, Loader2, PanelLeftOpen, Plus } from 'lucide-react'
import {
  useRemoveDocument,
  useUploadDocument,
  validateDocumentFile,
} from '@features/documents'
import {
  CreateAssignmentDialog,
  useCreateAssignment,
  useRemoveAssignment,
  type NewAssignmentInput,
} from '@features/assignments'
import {
  CreateExamDialog,
  useCreateExam,
  useRemoveExam,
  type NewExamInput,
} from '@features/exams'
import { AsyncView } from '@shared/components/AsyncView'
import { EmptyState } from '@shared/components/EmptyState'
import { Button } from '@shared/components/ui/button'
import { Input } from '@shared/components/ui/input'
import { toAsyncState } from '@shared/utils/async-state'
import { cn } from '@shared/utils/cn'
import { courseKeys } from '../api/queryKeys'
import type { NewItemInput } from '../api/section.service'
import { AddContentDialog } from '../components/AddContentDialog'
import { AddVideoDialog } from '../components/AddVideoDialog'
import { CourseOutline } from '../components/CourseOutline'
import { EditableSectionCard } from '../components/EditableSectionCard'
import { RemoveContentConfirm } from '../components/RemoveContentConfirm'
import { useActiveSection } from '../hooks/useActiveSection'
import { useCourse, useCourseSections } from '../hooks/useCourse'
import { useSectionEditor } from '../hooks/useSectionEditor'
import { moveItem } from '../utils/move-item'
import type { Section, SectionItem } from '../types/courses.types'

/** How long a deleted section / video can still be brought back with "Undo". */
const UNDO_MS = 8000

type Dialog = { kind: 'PICKER' | 'VIDEO' | 'ASSIGNMENT' | 'EXAM'; sectionId: string }

/**
 * Where a lecturer opens an item. Video matches the shared `videos/:itemId` route;
 * the other three follow the student pattern under /lecturer/classes — adjust if your lecturer routes differ.
 */
const itemHref = (courseId: string, item: SectionItem): string | null => {
  const base = `/lecturer/classes/${courseId}`
  if (item.itemType === 'VIDEO') return `${base}/videos/${item.id}`
  if (item.itemType === 'DOCUMENT' && item.documentId) return `${base}/documents/${item.documentId}`
  if (item.itemType === 'ASSIGNMENT' && item.assignmentId) return `${base}/assignments/${item.assignmentId}`
  if (item.itemType === 'EXAM' && item.examId) return `${base}/exams/${item.examId}`
  return null
}

const SaveStatus = ({ isSaving }: { isSaving: boolean }) => (
  <span role="status" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
    {isSaving ? (
      <>
        <Loader2 className="h-4 w-4 animate-spin" />
        Saving…
      </>
    ) : (
      <>
        <Check className="h-4 w-4 text-success" />
        All changes saved
      </>
    )}
  </span>
)

/**
 * Course tab of a lecturer's class. "Turn editing on" only reveals the pencils and menus:
 * every change is saved to the server on its own, so there is no Save / Cancel.
 * Banner and tabs live in LecturerCourseLayout.
 */
const CourseEditorPage = () => {
  const { courseId = '' } = useParams()
  const state = toAsyncState(useCourseSections(courseId))
  const courseName = useCourse(courseId).data?.name ?? ''
  const editor = useSectionEditor(courseId)
  const uploadDocument = useUploadDocument()
  const removeDocument = useRemoveDocument()
  const createAssignment = useCreateAssignment()
  const removeAssignment = useRemoveAssignment()
  const createExam = useCreateExam()
  const removeExam = useRemoveExam()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  // `null` = no "new section" form open; otherwise the title being typed.
  const [newTitle, setNewTitle] = useState<string | null>(null)
  // Section ids the lecturer collapsed; everything is open by default.
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  // Which "add content" dialog is open, and for which section.
  const [dialog, setDialog] = useState<Dialog | null>(null)
  // A document / assignment / exam waiting for the lecturer's confirmation (UC-30 / UC-32 / UC-34).
  const [pendingRemoval, setPendingRemoval] = useState<SectionItem | null>(null)
  // Ids deleted with "Undo" still available: hidden from the screen, not yet deleted on the server.
  const [pendingDeleteIds, setPendingDeleteIds] = useState<ReadonlySet<string>>(new Set())
  // The index is open on wide screens and tucked away on phones.
  const [isOutlineOpen, setIsOutlineOpen] = useState(
    () => window.matchMedia('(min-width: 1024px)').matches,
  )
  const activeSectionId = useActiveSection((state.data ?? []).map((s) => s.id))

  /**
   * Closes a dialog only if it is still the open one. A <dialog> fires its close event after it was closed from code,
   * so when the picker hands over to the video / assignment / exam dialog, its late close event must not close the new one.
   */
  const closeDialog = (kind: Dialog['kind']) =>
    setDialog((current) => (current?.kind === kind ? null : current))

  const setPending = (id: string, isPending: boolean) =>
    setPendingDeleteIds((current) => {
      const next = new Set(current)
      if (isPending) next.add(id)
      else next.delete(id)
      return next
    })

  /** Hides the thing now, deletes it on the server after UNDO_MS unless "Undo" is pressed. */
  const deleteWithUndo = (id: string, message: string, commit: (onFailed: () => void) => void) => {
    setPending(id, true)
    const timer = window.setTimeout(() => commit(() => setPending(id, false)), UNDO_MS)
    toast(message, {
      duration: UNDO_MS,
      action: {
        label: 'Undo',
        onClick: () => {
          window.clearTimeout(timer)
          setPending(id, false)
        },
      },
    })
  }

  const addItem = (sectionId: string, item: Omit<NewItemInput, 'id'>, message: string) =>
    editor.addItem.mutate(
      { sectionId, item: { id: crypto.randomUUID(), ...item } },
      { onSuccess: () => toast.success(message) },
    )

  /** UC-29: uploads the file, then adds it to the section. */
  const handleAddDocument = (sectionId: string, file: File) => {
    const error = validateDocumentFile(file)
    if (error) {
      toast.error(error)
      return
    }
    setDialog(null)
    uploadDocument.mutate(
      { classId: courseId, file },
      {
        onSuccess: (document) =>
          addItem(sectionId, { itemType: 'DOCUMENT', title: document.title, documentId: document.id }, 'Document added'),
        onError: (uploadError) => toast.error(uploadError.message),
      },
    )
  }

  const handleAddVideo = (video: { title: string; url: string }) => {
    if (dialog === null) return
    addItem(dialog.sectionId, { itemType: 'VIDEO', title: video.title, externalUrl: video.url }, 'Video added')
    setDialog(null)
  }

  /** UC-33: creates the assignment (uploading its attachments) and places it in the section in one request. */
  const handleCreateAssignment = (input: NewAssignmentInput) => {
    if (dialog === null) return
    const { sectionId } = dialog
    createAssignment.mutate(
      { classId: courseId, input, sectionId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) })
          toast.success('Assignment added')
          setDialog(null)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  /** UC-31: creates the exam (uploading its question file), then adds it to the section. */
  const handleCreateExam = (input: NewExamInput) => {
    if (dialog === null) return
    const { sectionId } = dialog
    createExam.mutate(
      { classId: courseId, input },
      {
        onSuccess: (exam) => {
          addItem(sectionId, { itemType: 'EXAM', title: exam.examName, examId: exam.id }, 'Exam added')
          setDialog(null)
        },
        onError: (error) => toast.error(error.message),
      },
    )
  }

  /** UC-30 / UC-32 / UC-34: after confirmation the document, assignment or exam and its stored data are removed right away. */
  const handleConfirmRemoval = () => {
    if (pendingRemoval === null) return
    const item = pendingRemoval
    const finish = () => {
      setPendingRemoval(null)
      void queryClient.invalidateQueries({ queryKey: courseKeys.sections(courseId) })
      toast.success(item.itemType === 'DOCUMENT' ? 'Document deleted' : `${item.itemType === 'EXAM' ? 'Exam' : 'Assignment'} removed`)
    }
    const callbacks = { onSuccess: finish, onError: (error: Error) => toast.error(error.message) }
    if (item.itemType === 'EXAM') {
      // An exam item without an exam id points at nothing on the server.
      if (item.examId === null) return finish()
      removeExam.mutate({ classId: courseId, examId: item.examId }, callbacks)
      return
    }
    if (item.itemType === 'ASSIGNMENT') {
      if (item.assignmentId === null) return finish()
      removeAssignment.mutate({ classId: courseId, assignmentId: item.assignmentId }, callbacks)
      return
    }
    // An item without a document was never uploaded, so there is nothing to delete on the server.
    if (item.documentId === null) return finish()
    removeDocument.mutate({ classId: courseId, documentId: item.documentId }, callbacks)
  }

  const handleRemoveItem = (item: SectionItem) => {
    if (item.itemType !== 'VIDEO') {
      setPendingRemoval(item)
      return
    }
    deleteWithUndo(item.id, 'Video deleted', (onFailed) =>
      editor.removeItem.mutate({ sectionId: item.sectionId, itemId: item.id }, { onError: onFailed }),
    )
  }

  const handleDeleteSection = (section: Section) => {
    // Their files and submissions live in other modules, so those items are removed one by one first.
    if (section.items.some((item) => item.itemType !== 'VIDEO')) {
      toast.error('Remove the documents, assignments and exams of this section first')
      return
    }
    deleteWithUndo(section.id, `"${section.title}" deleted`, (onFailed) =>
      editor.removeSection.mutate(section.id, { onError: onFailed }),
    )
  }

  const handleStopEditing = () => {
    setEditing(false)
    setNewTitle(null)
    setDialog(null)
  }

  const handleToggleAll = (sections: Section[]) => {
    const isAllCollapsed = sections.every((s) => collapsed[s.id])
    setCollapsed(Object.fromEntries(sections.map((s) => [s.id, !isAllCollapsed])))
  }

  /** Opens the section if it was collapsed, then scrolls to it (or to one of its items when it has an id). */
  const handleNavigate = (sectionId: string, itemId?: string) => {
    setCollapsed((c) => ({ ...c, [sectionId]: false }))
    window.requestAnimationFrame(() => {
      const target =
        (itemId && document.getElementById(`item-${itemId}`)) ||
        document.getElementById(`section-${sectionId}`)
      target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }

  const handleCreateSection = () => {
    const title = (newTitle ?? '').trim()
    if (title === '') return
    editor.createSection.mutate(title, {
      onSuccess: () => {
        setNewTitle(null)
        toast.success('Section added')
      },
    })
  }

  return (
    <div className="space-y-5">
      <AsyncView state={state}>
        {(serverSections) => {
          // Things the lecturer just deleted stay out of sight while "Undo" is still possible.
          const sections = serverSections
            .filter((s) => !pendingDeleteIds.has(s.id))
            .map((s) => ({
              ...s,
              items: s.items
                .filter((i) => !pendingDeleteIds.has(i.id))
                .sort((a, b) => a.orderIndex - b.orderIndex),
            }))
          const isAllCollapsed = sections.every((s) => collapsed[s.id])
          return (
            // No `items-start` here: the aside must stretch to the full height of the content,
            // otherwise the sticky outline inside it has no room to travel.
            <div
              className={cn('grid gap-6', isOutlineOpen && 'lg:grid-cols-[18rem_minmax(0,1fr)]')}
            >
              {isOutlineOpen && (
                <aside>
                  <CourseOutline
                    courseName={courseName}
                    sections={sections}
                    activeSectionId={activeSectionId}
                    onNavigate={handleNavigate}
                    onClose={() => setIsOutlineOpen(false)}
                    showProgress={false}
                  />
                </aside>
              )}

              <div className="min-w-0 space-y-5">
                {/* Toolbar lives in the content column, level with the outline */}
                <div className="flex items-center justify-between gap-4">
                  {isOutlineOpen ? (
                    <span />
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => setIsOutlineOpen(true)}>
                      <PanelLeftOpen className="mr-2 h-4 w-4" />
                      Course index
                    </Button>
                  )}
                  <div className="flex items-center gap-4">
                    {editing && <SaveStatus isSaving={editor.isSaving} />}
                    <Button
                      variant={editing ? 'outline' : 'default'}
                      onClick={editing ? handleStopEditing : () => setEditing(true)}
                    >
                      {editing ? 'Turn editing off' : 'Turn editing on'}
                    </Button>
                  </div>
                </div>

                {sections.length === 0 && (
                  <EmptyState
                    title="No sections yet"
                    description="Turn editing on to add the first section."
                  />
                )}
                {sections.map((sec, i) => (
                  <div key={sec.id} id={`section-${sec.id}`} className="scroll-mt-20">
                    <EditableSectionCard
                      section={sec}
                      index={i}
                      total={sections.length}
                      isEditing={editing}
                      isOpen={!collapsed[sec.id]}
                      toggleAllLabel={i === 0 ? (isAllCollapsed ? 'Expand all' : 'Collapse all') : undefined}
                      itemHref={(item) => itemHref(courseId, item)}
                      onToggle={() => setCollapsed((c) => ({ ...c, [sec.id]: !c[sec.id] }))}
                      onToggleAll={() => handleToggleAll(sections)}
                      onRename={(title) => editor.updateSection.mutate({ id: sec.id, patch: { title } })}
                      onDescriptionChange={(description) =>
                        editor.updateSection.mutate({ id: sec.id, patch: { description } })
                      }
                      onToggleVisible={() =>
                        editor.updateSection.mutate({ id: sec.id, patch: { isVisible: sec.isVisible === false } })
                      }
                      onMove={(direction) =>
                        editor.reorderSections.mutate(moveItem(sections, i, direction).map((s) => s.id))
                      }
                      onDelete={() => handleDeleteSection(sec)}
                      onAddContent={() => setDialog({ kind: 'PICKER', sectionId: sec.id })}
                      onItemRename={(item, title) =>
                        editor.updateItem.mutate({ sectionId: sec.id, itemId: item.id, patch: { title } })
                      }
                      onItemToggleVisible={(item) =>
                        editor.updateItem.mutate({
                          sectionId: sec.id,
                          itemId: item.id,
                          patch: { isVisible: item.isVisible === false },
                        })
                      }
                      onItemMove={(item, direction) =>
                        editor.reorderItems.mutate({
                          sectionId: sec.id,
                          ids: moveItem(sec.items, sec.items.indexOf(item), direction).map((x) => x.id),
                        })
                      }
                      onItemRemove={handleRemoveItem}
                    />
                  </div>
                ))}

                {editing && newTitle === null && (
                  <Button variant="outline" className="w-full" onClick={() => setNewTitle(`Week ${sections.length + 1}`)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Add section
                  </Button>
                )}
                {editing && newTitle !== null && (
                  <form
                    className="flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4"
                    onSubmit={(e) => {
                      e.preventDefault()
                      handleCreateSection()
                    }}
                  >
                    <Input
                      aria-label="New section title"
                      autoFocus
                      maxLength={255}
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      className="min-w-0 flex-1"
                    />
                    <Button type="submit" disabled={editor.createSection.isPending || newTitle.trim() === ''}>
                      {editor.createSection.isPending ? 'Adding…' : 'Add'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setNewTitle(null)}
                      disabled={editor.createSection.isPending}
                    >
                      Cancel
                    </Button>
                  </form>
                )}
              </div>
            </div>
          )
        }}
      </AsyncView>

      <AddContentDialog
        open={dialog?.kind === 'PICKER'}
        isBusy={uploadDocument.isPending}
        onClose={() => closeDialog('PICKER')}
        onPickFile={(file) => dialog && handleAddDocument(dialog.sectionId, file)}
        onPickType={(kind) => dialog && setDialog({ kind, sectionId: dialog.sectionId })}
      />
      <AddVideoDialog
        open={dialog?.kind === 'VIDEO'}
        onClose={() => closeDialog('VIDEO')}
        onSubmit={handleAddVideo}
      />
      <CreateAssignmentDialog
        open={dialog?.kind === 'ASSIGNMENT'}
        isSubmitting={createAssignment.isPending}
        onClose={() => closeDialog('ASSIGNMENT')}
        onSubmit={handleCreateAssignment}
      />
      {dialog?.kind === 'EXAM' && (
        <CreateExamDialog
          open
          isSubmitting={createExam.isPending}
          onClose={() => closeDialog('EXAM')}
          onSubmit={handleCreateExam}
        />
      )}
      <RemoveContentConfirm
        item={pendingRemoval}
        isRemoving={removeDocument.isPending || removeAssignment.isPending || removeExam.isPending}
        onConfirm={handleConfirmRemoval}
        onClose={() => setPendingRemoval(null)}
      />
    </div>
  )
}

export default CourseEditorPage