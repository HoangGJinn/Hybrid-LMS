import { Badge } from "@/shared/components/ui/Badge";
import type {
  ClassDataImportFileResult,
  ClassDataImportResult,
  ClassImportRowResult,
  EnrollmentImportRowResult,
} from "../types/courses.types";

/** Problem rows listed per file and kind; the counts above them always cover every row. */
const MAX_LISTED_ROWS = 50;

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const StatusBadge = ({ status }: { status: "error" | "skipped" }) => (
  <Badge variant={status === "error" ? "destructive" : "default"}>
    {status === "error" ? "Error" : "Skipped"}
  </Badge>
);

const ProblemTable = ({
  title,
  rows,
}: {
  title: string;
  rows: ReadonlyArray<{
    line: number;
    label: string;
    sublabel: string | null;
    status: "error" | "skipped";
    message: string | null;
  }>;
}) => (
  <div className="space-y-1">
    <h4 className="m-0 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
      {title}
    </h4>
    <div className="max-h-56 overflow-auto rounded-md border">
      <table className="w-full text-left text-sm">
        <thead className="sticky top-0 border-b bg-muted/80 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-2">
              Row
            </th>
            <th scope="col" className="px-3 py-2">
              Item
            </th>
            <th scope="col" className="px-3 py-2">
              Result
            </th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.slice(0, MAX_LISTED_ROWS).map((row) => (
            <tr key={row.line} className="align-top">
              <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                {row.line}
              </td>
              <td className="px-3 py-2">
                {row.label}
                {row.sublabel && (
                  <span className="block text-xs text-muted-foreground">
                    {row.sublabel}
                  </span>
                )}
              </td>
              <td className="px-3 py-2">
                <StatusBadge status={row.status} />
                {row.message && <span className="ml-2">{row.message}</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    {rows.length > MAX_LISTED_ROWS && (
      <p className="m-0 text-xs text-muted-foreground">
        Showing the first {MAX_LISTED_ROWS} of {rows.length} rows.
      </p>
    )}
  </div>
);

const classProblems = (rows: ClassImportRowResult[]) =>
  rows.flatMap((row) =>
    row.status === "created"
      ? []
      : [
          {
            line: row.line,
            label: row.classCode ?? "—",
            sublabel: row.name,
            status: row.status,
            message: row.message,
          },
        ],
  );

const studentProblems = (rows: EnrollmentImportRowResult[]) =>
  rows.flatMap((row) =>
    row.status === "added"
      ? []
      : [
          {
            line: row.line,
            label: row.studentCode ?? "—",
            sublabel:
              [row.fullName, row.classCode].filter(Boolean).join(" · ") || null,
            status: row.status,
            message: row.message,
          },
        ],
  );

const FileResult = ({ file }: { file: ClassDataImportFileResult }) => {
  const classRows = classProblems(file.classes);
  const studentRows = studentProblems(file.students);
  const hasProblems = classRows.length + studentRows.length > 0;
  return (
    <details className="rounded-md border" open={hasProblems}>
      <summary className="flex cursor-pointer flex-wrap items-center gap-2 px-3 py-2 text-sm">
        <span className="font-medium">{file.name}</span>
        <Badge variant="success">
          {pluralize(file.createdClasses, "class")} to create
        </Badge>
        <Badge variant="success">
          {pluralize(file.addedStudents, "student")} to add
        </Badge>
        {file.skippedClasses + file.skippedStudents > 0 && (
          <Badge>{file.skippedClasses + file.skippedStudents} skipped</Badge>
        )}
        {file.failedClasses + file.failedStudents > 0 && (
          <Badge variant="destructive">
            {pluralize(file.failedClasses + file.failedStudents, "error")}
          </Badge>
        )}
      </summary>
      <div className="space-y-3 border-t px-3 py-3">
        {!hasProblems && (
          <p className="m-0 text-sm text-muted-foreground">
            Every row of this file is ready.
          </p>
        )}
        {classRows.length > 0 && (
          <ProblemTable title="Classes" rows={classRows} />
        )}
        {studentRows.length > 0 && (
          <ProblemTable title="Students" rows={studentRows} />
        )}
      </div>
    </details>
  );
};

/** The result of the check run before an import: totals, then each file with the rows that need attention. */
export const ImportDataPreview = ({
  result,
}: {
  result: ClassDataImportResult;
}) => {
  const skipped = result.skippedClasses + result.skippedStudents;
  const failed = result.failedClasses + result.failedStudents;
  return (
    <div className="space-y-3" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Badge variant="success">
          {pluralize(result.createdClasses, "class")} to create
        </Badge>
        <Badge variant="success">
          {pluralize(result.addedStudents, "student")} to add
        </Badge>
        <Badge>{skipped} skipped</Badge>
        <Badge variant={failed > 0 ? "destructive" : "default"}>
          {pluralize(failed, "error")}
        </Badge>
        <span className="text-muted-foreground">
          in {pluralize(result.files.length, "file")}
        </span>
      </div>
      <div className="space-y-2">
        {result.files.map((file, index) => (
          <FileResult key={`${index}-${file.name}`} file={file} />
        ))}
      </div>
    </div>
  );
};