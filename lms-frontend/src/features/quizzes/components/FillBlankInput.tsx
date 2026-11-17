import { cn } from '@shared/utils/cn';

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  disabled?: boolean;
  correct?: boolean | null; // null/undefined: not checked yet
}

export function FillBlankInput({ value, onChange, onSubmit, disabled, correct }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor="fill-blank" className="text-sm font-semibold text-muted-foreground">
        Your answer
      </label>
      <input
        id="fill-blank"
        type="text"
        value={value}
        maxLength={200}
        disabled={disabled}
        autoComplete="off"
        autoFocus
        placeholder="Type the missing word or expression"
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && value.trim() && !disabled) onSubmit();
        }}
        className={cn(
          'h-14 w-full rounded-2xl border-2 bg-white px-5 text-lg font-medium outline-none transition-colors',
          'focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:cursor-default',
          correct === true && 'border-success bg-success/10',
          correct === false && 'border-destructive bg-destructive/10',
          correct == null && 'border-border',
        )}
      />
    </div>
  );
}