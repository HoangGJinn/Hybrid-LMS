import { useState } from 'react';
import { Search, UserMinus } from 'lucide-react';
import { toast } from 'sonner';
import { getErrorMessage } from '@/core/api/errors';
import { AsyncView } from '@/shared/components/AsyncView';
import { EmptyState } from '@/shared/components/EmptyState';
import { Modal } from '@/shared/components/Modal';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { useAddStudents } from '../hooks/useAddStudents';
import {
  useAvailableStudents,
  useClassStudents,
} from '../hooks/useClassStudents';
import { useRemoveStudent } from '../hooks/useRemoveStudent';
import type { ClassView } from '../types/courses.types';

const SEARCH_DEBOUNCE_MS = 300;

const ClassStudentsPanel = ({ course }: { course: ClassView }) => {
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);

  const enrolled = useClassStudents(course.id);
  const available = useAvailableStudents(course.id, search);
  const addStudents = useAddStudents(course.id);
  const removeStudent = useRemoveStudent(course.id);

  const candidates = available.data ?? [];
  const allSelected =
    candidates.length > 0 && candidates.every((s) => selected.includes(s.id));

  const handleToggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const handleToggleAll = () =>
    setSelected(allSelected ? [] : candidates.map((s) => s.id));

  const handleAdd = () =>
    addStudents.mutate(selected, {
      onSuccess: ({ added, skipped }) => {
        toast.success(
          skipped > 0
            ? `${added} added, ${skipped} already in class.`
            : `${added} student(s) added.`,
        );
        setSelected([]);
      },
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  const handleRemove = (studentId: string) =>
    removeStudent.mutate(studentId, {
      onSuccess: () => toast.success('Student removed.'),
      onError: (error) => toast.error(getErrorMessage(error)),
    });

  return (
    <div className="grid h-[60vh] min-h-[24rem] gap-4 md:grid-cols-2">
      <section aria-label="Add students" className="flex min-h-0 flex-col gap-3">
        <h3 className="m-0 text-sm font-semibold">Add students</h3>
        <div className="relative">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            aria-label="Search students to add"
            placeholder="Search by name, email or code…"
            className="pl-9"
            value={searchInput}
            onChange={(event) => setSearchInput(event.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={allSelected}
            disabled={candidates.length === 0}
            onChange={handleToggleAll}
          />
          Select all shown ({candidates.length})
        </label>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          {candidates.length === 0 ? (
            <p className="m-0 flex h-full items-center justify-center px-3 text-center text-sm text-muted-foreground">
              {available.isLoading ? 'Loading…' : 'No students available to add.'}
            </p>
          ) : (
            <ul className="m-0 list-none divide-y p-0">
              {candidates.map((student) => (
                <li key={student.id}>
                  <label className="flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-muted/40">
                    <input
                      type="checkbox"
                      checked={selected.includes(student.id)}
                      onChange={() => handleToggle(student.id)}
                    />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {student.fullName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {student.studentCode} · {student.email}
                      </span>
                    </span>
                  </label>
                </li>
              ))}
            </ul>
          )}
        </div>
        <Button
          onClick={handleAdd}
          isLoading={addStudents.isPending}
          disabled={selected.length === 0}
        >
          Add selected ({selected.length})
        </Button>
      </section>

      <section aria-label="Students in class" className="flex min-h-0 flex-col gap-3">
        <h3 className="m-0 text-sm font-semibold">
          In this class ({enrolled.data?.length ?? 0})
        </h3>
        <div className="min-h-0 flex-1 overflow-y-auto rounded-md border">
          <AsyncView
            state={{
              data: enrolled.data,
              loading: enrolled.isLoading,
              error: enrolled.error,
              reload: () => void enrolled.refetch(),
            }}
            isEmpty={(rows) => rows.length === 0}
            empty={<EmptyState title="No students in this class yet" />}
          >
            {(students) => (
              <ul className="m-0 list-none divide-y p-0">
                {students.map((student) => (
                  <li
                    key={student.id}
                    className="flex items-center justify-between gap-3 px-3 py-2"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">
                        {student.fullName}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {student.studentCode} · {student.email}
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Remove ${student.fullName}`}
                      title="Remove from class"
                      disabled={removeStudent.isPending}
                      onClick={() => handleRemove(student.id)}
                    >
                      <UserMinus className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </AsyncView>
        </div>
      </section>
    </div>
  );
};

interface ClassStudentsModalProps {
  /** The class to manage, or `null` when closed. */
  course: ClassView | null;
  onClose: () => void;
}

/** Admin dialog to add students to a class and remove them. Mounted only while open so state resets. */
export const ClassStudentsModal = ({
  course,
  onClose,
}: ClassStudentsModalProps) => (
  <Modal
    open={course !== null}
    title={course ? `Students — ${course.classCode}` : 'Students'}
    onClose={onClose}
    size="lg"
  >
    {course && <ClassStudentsPanel key={course.id} course={course} />}
  </Modal>
);