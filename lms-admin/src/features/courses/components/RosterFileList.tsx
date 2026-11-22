import { FileSpreadsheet, X } from "lucide-react";
import { Button } from "@/shared/components/ui/Button";
import type { ParsedRosterFile } from "../utils/roster-excel";

export interface SelectedRosterFile {
  /** Stable key: the same file picked twice is recognised by it. */
  id: string;
  parsed: ParsedRosterFile;
}

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

interface RosterFileListProps {
  files: SelectedRosterFile[];
  disabled: boolean;
  onRemove: (id: string) => void;
}

/** The files picked so far, each with what was read from it (or why it cannot be used). */
export const RosterFileList = ({
  files,
  disabled,
  onRemove,
}: RosterFileListProps) => (
  <ul className="m-0 list-none space-y-2 p-0">
    {files.map(({ id, parsed }) => (
      <li
        key={id}
        className="flex items-start justify-between gap-3 rounded-md border px-3 py-2"
      >
        <div className="flex min-w-0 items-start gap-2">
          <FileSpreadsheet className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
          <div className="min-w-0">
            <p className="m-0 truncate text-sm font-medium">{parsed.name}</p>
            {parsed.error ? (
              <p className="m-0 text-xs text-destructive">
                {parsed.error} This file is left out.
              </p>
            ) : (
              <p className="m-0 text-xs text-muted-foreground">
                {pluralize(parsed.classes.length, "class")} ·{" "}
                {pluralize(parsed.students.length, "student row")}
              </p>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${parsed.name}`}
          disabled={disabled}
          onClick={() => onRemove(id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </li>
    ))}
  </ul>
);