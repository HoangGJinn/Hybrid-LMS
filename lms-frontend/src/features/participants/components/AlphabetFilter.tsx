import { cn } from '@shared/utils/cn';
import { ALPHABET } from '../utils/vietnamese-name';

interface AlphabetFilterProps {
  label: string;
  /** Selected letter, '' = all. */
  value: string;
  onChange: (letter: string) => void;
}

const letters = ['', ...ALPHABET];

/** Row of letter buttons used to filter a list by initial. */
export const AlphabetFilter = ({ label, value, onChange }: AlphabetFilterProps) => (
  <div role="group" aria-label={label} className="space-y-1">
    <p className="m-0 text-sm text-muted-foreground">{label}</p>
    <div className="flex flex-wrap gap-1 rounded-md bg-muted p-1">
      {letters.map((letter) => (
        <button
          key={letter || 'all'}
          type="button"
          aria-pressed={value === letter}
          onClick={() => onChange(letter)}
          className={cn(
            'h-7 min-w-7 rounded border-0 px-2 text-xs',
            value === letter
              ? 'bg-primary font-semibold text-primary-foreground'
              : 'bg-transparent text-foreground hover:bg-background',
          )}
        >
          {letter || 'All'}
        </button>
      ))}
    </div>
  </div>
);