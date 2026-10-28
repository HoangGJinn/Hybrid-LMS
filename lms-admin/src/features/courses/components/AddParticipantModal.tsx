import { useState } from 'react';
import { toast } from 'sonner';
import { Search } from 'lucide-react';
import { getErrorMessage } from '@/core/api/errors';
import { Modal } from '@/shared/components/Modal';
import { Badge } from '@/shared/components/ui/Badge';
import { Button } from '@/shared/components/ui/Button';
import { Input } from '@/shared/components/ui/Input';
import { useDebouncedValue } from '@/shared/hooks/useDebouncedValue';
import { cn } from '@/shared/utils/cn';
import {
  useAddParticipant,
  useParticipantCandidates,
} from '../hooks/useParticipants';
import type { ClassView, ParticipantCandidate } from '../types/courses.types';

const SEARCH_DEBOUNCE_MS = 300;

interface AddParticipantModalProps {
  open: boolean;
  course: ClassView;
  onClose: () => void;
}

const AddParticipantBody = ({
  course,
  onClose,
}: {
  course: ClassView;
  onClose: () => void;
}) => {
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<ParticipantCandidate | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const candidates = useParticipantCandidates(course.id, search);
  const { mutate, isPending } = useAddParticipant(course.id);
  const students = candidates.data ?? [];

  const handleAdd = () => {
    if (!selected) return;
    setError(null);
    mutate(selected.studentId, {
      onSuccess: () => {
        toast.success(`${selected.fullName} was added to ${course.classCode}.`);
        onClose();
      },
      onError: (err) => {
        // e.g. "already a participant": show it and refresh the list so the row is flagged.
        setError(getErrorMessage(err));
        setSelected(null);
        void candidates.refetch();
      },
    });
  };

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-muted-foreground">
        Choose a student to add to{' '}
        <span className="font-semibold text-foreground">
          {course.classCode} — {course.name}
        </span>
        . Only active students who are currently studying are listed.
      </p>

      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search students"
          placeholder="Search by name, email or student code…"
          className="pl-9"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>

      <div
        aria-busy={candidates.isFetching}
        className={cn(
          'max-h-64 overflow-y-auto rounded-md border',
          candidates.isPlaceholderData && 'opacity-60 transition-opacity',
        )}
      >
        {candidates.isLoading ? (
          <p className="m-0 p-4 text-center text-sm text-muted-foreground">
            Searching…
          </p>
        ) : candidates.error ? (
          <p role="alert" className="m-0 p-4 text-center text-sm text-destructive">
            {getErrorMessage(candidates.error)}
          </p>
        ) : students.length === 0 ? (
          <p className="m-0 p-4 text-center text-sm text-muted-foreground">
            No students found.
          </p>
        ) : (
          <ul className="m-0 list-none divide-y p-0">
            {students.map((student) => (
              <li key={student.studentId}>
                <label
                  className={cn(
                    'flex items-center gap-3 px-3 py-2.5 text-sm',
                    student.alreadyInClass
                      ? 'cursor-not-allowed opacity-60'
                      : 'cursor-pointer hover:bg-accent/40',
                  )}
                >
                  <input
                    type="radio"
                    name="participant"
                    value={student.studentId}
                    checked={selected?.studentId === student.studentId}
                    disabled={student.alreadyInClass}
                    onChange={() => {
                      setError(null);
                      setSelected(student);
                    }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">
                      {student.fullName}
                    </span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {student.studentCode} · {student.email}
                    </span>
                  </span>
                  {student.alreadyInClass && <Badge>Already in class</Badge>}
                </label>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && (
        <p
          role="alert"
          className="m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isPending}>
          Cancel
        </Button>
        <Button onClick={handleAdd} disabled={!selected} isLoading={isPending}>
          Add Participant
        </Button>
      </div>
    </div>
  );
};

/** "Add Participant" (UC-24): search a student, pick one, confirm. */
export const AddParticipantModal = ({
  open,
  course,
  onClose,
}: AddParticipantModalProps) => (
  <Modal open={open} title="Add Participant" size="lg" onClose={onClose}>
    {/* Mounted only while open, so every opening starts with a fresh search and no stale selection. */}
    {open && <AddParticipantBody course={course} onClose={onClose} />}
  </Modal>
);
