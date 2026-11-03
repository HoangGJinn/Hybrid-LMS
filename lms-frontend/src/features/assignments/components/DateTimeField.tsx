import { useRef, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Input } from '@shared/components/ui/input';
import { toLocalInputValue } from '../utils/assignment-form';

const two = (n: number) => String(n).padStart(2, '0');

/** `25/12/2026 23:59` */
const formatTyped = (date: Date): string =>
  `${two(date.getDate())}/${two(date.getMonth() + 1)}/${date.getFullYear()} ${two(date.getHours())}:${two(date.getMinutes())}`;

const TYPED_PATTERN = /^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2})$/;

/** Parses `dd/mm/yyyy hh:mm`; null when the text is malformed or names a day that does not exist (31/02). */
const parseTyped = (text: string): Date | null => {
  const match = TYPED_PATTERN.exec(text.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const date = new Date(year, month - 1, day, hour, minute);
  const isReal =
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day &&
    hour < 24 &&
    minute < 60;
  return isReal ? date : null;
};

interface DateTimeFieldProps {
  label: string;
  /** Local value in the format of `<input type="datetime-local">`, for example `2026-10-01T08:00`. */
  value: string;
  onChange: (value: string) => void;
  error?: string;
}

/**
 * Date and time that can be typed (`dd/mm/yyyy hh:mm`) or picked from the browser's calendar,
 * so a lecturer can use whichever is faster. The value stays in the `datetime-local` format.
 */
export const DateTimeField = ({
  label,
  value,
  onChange,
  error,
}: DateTimeFieldProps) => {
  const picker = useRef<HTMLInputElement>(null);
  // `null` = show the formatted `value`; a string = what the user is typing right now.
  const [draft, setDraft] = useState<string | null>(null);
  const [typedError, setTypedError] = useState<string | null>(null);
  const current = new Date(value);
  const text = draft ?? (Number.isNaN(current.getTime()) ? '' : formatTyped(current));
  const message = typedError ?? error;

  const commit = () => {
    if (draft === null) return;
    const parsed = parseTyped(draft);
    if (!parsed) {
      setTypedError('Use dd/mm/yyyy hh:mm, for example 25/12/2026 23:59');
      return;
    }
    setTypedError(null);
    setDraft(null);
    onChange(toLocalInputValue(parsed));
  };

  const openPicker = () => {
    try {
      picker.current?.showPicker();
    } catch {
      // Some browsers refuse showPicker(); typing the date still works.
      picker.current?.focus();
    }
  };

  return (
    <div className="space-y-1 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="relative">
        <Input
          aria-label={label}
          placeholder="dd/mm/yyyy hh:mm"
          value={text}
          onChange={(e) => {
            setDraft(e.target.value);
            setTypedError(null);
          }}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key !== 'Enter') return;
            // Enter confirms the typed date instead of submitting the surrounding dialog.
            e.preventDefault();
            commit();
          }}
          className="pr-10"
        />
        <button
          type="button"
          aria-label={`Pick ${label.toLowerCase()} from calendar`}
          onClick={openPicker}
          className="absolute right-2 top-1/2 -translate-y-1/2 border-0 bg-transparent p-1 text-muted-foreground hover:text-foreground"
        >
          <CalendarDays className="h-4 w-4" />
        </button>
        {/* Invisible: it only exists to open the browser's date and time picker. */}
        <input
          ref={picker}
          type="datetime-local"
          tabIndex={-1}
          aria-hidden="true"
          value={value}
          onChange={(e) => {
            if (e.target.value === '') return;
            setDraft(null);
            setTypedError(null);
            onChange(e.target.value);
          }}
          className="pointer-events-none absolute inset-0 opacity-0"
        />
      </div>
      {message && (
        <p role="alert" className="m-0 text-xs text-destructive">
          {message}
        </p>
      )}
    </div>
  );
};