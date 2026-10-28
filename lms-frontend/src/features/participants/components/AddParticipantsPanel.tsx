import { useState } from 'react';
import { Search } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@shared/components/ui/button';
import { Input } from '@shared/components/ui/input';
import { useAddParticipant } from '../hooks/useAddParticipant';
import { useCandidates } from '../hooks/useCandidates';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

const SEARCH_DEBOUNCE_MS = 300;

interface AddParticipantsPanelProps {
  classId: string;
  onClose: () => void;
}

/** Search students who are not in the class yet and enroll the selected ones. */
export const AddParticipantsPanel = ({
  classId,
  onClose,
}: AddParticipantsPanelProps) => {
  const [searchInput, setSearchInput] = useState('');
  const [selected, setSelected] = useState<string[]>([]);
  const search = useDebouncedValue(searchInput, SEARCH_DEBOUNCE_MS);
  const candidates = useCandidates(classId, search);
  const addParticipant = useAddParticipant(classId);
  const list = candidates.data ?? [];

  const handleToggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  const handleAdd = () =>
    addParticipant.mutate(selected, {
      onSuccess: ({ added, skipped }) => {
        toast.success(
          skipped > 0
            ? `${added} added, ${skipped} already in class`
            : `${added} student(s) added`,
        );
        setSelected([]);
      },
      onError: (error) => toast.error(error.message),
    });

  return (
    <section aria-label="Add participants" className="space-y-3 rounded-lg border p-4">
      <div className="relative">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
        />
        <Input
          aria-label="Search students to add"
          placeholder="Search by name, email or code"
          className="pl-9"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
        />
      </div>
      <div className="h-56 overflow-y-auto rounded-md border">
        {list.length === 0 ? (
          <p className="m-0 flex h-full items-center justify-center text-sm text-muted-foreground">
            {candidates.isLoading ? 'Loading…' : 'No students available to add.'}
          </p>
        ) : (
          <ul className="m-0 list-none divide-y p-0">
            {list.map((student) => (
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
      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={addParticipant.isPending}>
          Close
        </Button>
        <Button
          onClick={handleAdd}
          disabled={selected.length === 0 || addParticipant.isPending}
        >
          {addParticipant.isPending ? 'Adding…' : `Add selected (${selected.length})`}
        </Button>
      </div>
    </section>
  );
};