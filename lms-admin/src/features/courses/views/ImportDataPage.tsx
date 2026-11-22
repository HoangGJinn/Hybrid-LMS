import { useRef, useState, type ChangeEvent } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/core/api/errors";
import { PageHeader } from "@/shared/components/PageHeader";
import { Button } from "@/shared/components/ui/Button";
import { downloadBlob } from "@/shared/utils/download";
import { ImportDataPreview } from "../components/ImportDataPreview";
import {
  RosterFileList,
  type SelectedRosterFile,
} from "../components/RosterFileList";
import { useImportClassData } from "../hooks/useImportClassData";
import type {
  ClassDataImportResult,
  ClassFilePayload,
} from "../types/courses.types";
import {
  CLASS_IMPORT_HEADERS,
  CLASS_IMPORT_SAMPLE_ROW,
} from "../utils/class-excel";
import {
  MAX_ROSTER_FILES,
  STUDENT_HEADERS,
  STUDENT_SAMPLE_ROW,
  buildRosterTemplate,
  parseRosterWorkbook,
  type ParsedRosterFile,
} from "../utils/roster-excel";

/** Larger files are certainly not a class list; reading them would only freeze the page. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const TEMPLATE_FILE_NAME = "class-roster-template.xlsx";
const ERROR_BOX =
  "m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive";

const fileId = (file: File): string =>
  `${file.name}|${file.size}|${file.lastModified}`;

const toPayload = ({
  name,
  classes,
  students,
}: ParsedRosterFile): ClassFilePayload => ({
  name,
  classes,
  students,
});

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const readFile = async (file: File): Promise<SelectedRosterFile> => {
  const id = fileId(file);
  if (file.size > MAX_FILE_BYTES) {
    return {
      id,
      parsed: {
        name: file.name,
        classes: [],
        students: [],
        error: "This file is larger than 2 MB.",
      },
    };
  }
  return {
    id,
    parsed: await parseRosterWorkbook(file.name, await file.arrayBuffer()),
  };
};

const SampleTable = ({
  caption,
  headers,
  row,
}: {
  caption: string;
  headers: readonly string[];
  row: readonly string[];
}) => (
  <div className="space-y-1">
    <p className="m-0 text-xs font-semibold">{caption}</p>
    <div className="overflow-x-auto rounded-md border">
      <table className="w-full text-left text-xs">
        <thead className="bg-muted/80 text-muted-foreground">
          <tr>
            {headers.map((header) => (
              <th
                key={header}
                scope="col"
                className="whitespace-nowrap px-3 py-2 font-semibold"
              >
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr className="text-muted-foreground">
            {row.map((cell, index) => (
              <td key={headers[index]} className="whitespace-nowrap px-3 py-2">
                {cell}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  </div>
);

/**
 * "Import data": pick several roster files (class + student list), see what each would do, then
 * create all the classes and add their students at once.
 */
const ImportDataPage = () => {
  const [files, setFiles] = useState<SelectedRosterFile[]>([]);
  const [preview, setPreview] = useState<ClassDataImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestCheck = useRef(0);
  const { mutate, isPending, variables } = useImportClassData();
  const isChecking = isPending && variables?.dryRun === true;
  const isImporting = isPending && variables?.dryRun === false;

  const usable = files.filter((file) => !file.parsed.error);

  /** Re-runs the preview for a new set of files. Only the newest answer is kept. */
  const check = (next: SelectedRosterFile[]) => {
    setPreview(null);
    setError(null);
    const payload = next
      .filter((f) => !f.parsed.error)
      .map((f) => toPayload(f.parsed));
    const id = ++latestCheck.current;
    if (payload.length === 0) return;
    mutate(
      { files: payload, dryRun: true },
      {
        onSuccess: (result) => {
          if (latestCheck.current === id) setPreview(result);
        },
        onError: (err) => {
          if (latestCheck.current === id) setError(getErrorMessage(err));
        },
      },
    );
  };

  const replaceFiles = (next: SelectedRosterFile[]) => {
    setFiles(next);
    check(next);
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const picked = Array.from(input.files ?? []);
    // Lets the same files be picked again after they have been corrected.
    input.value = "";
    if (picked.length === 0) return;

    const known = new Set(files.map((file) => file.id));
    const fresh = picked.filter((file) => !known.has(fileId(file)));
    const room = MAX_ROSTER_FILES - files.length;
    const accepted = fresh.slice(0, Math.max(room, 0));
    if (fresh.length > accepted.length) {
      toast.error(
        `You can import at most ${MAX_ROSTER_FILES} files at a time.`,
      );
    }
    if (accepted.length === 0) return;

    const parsed = await Promise.all(accepted.map(readFile));
    replaceFiles([...files, ...parsed]);
  };

  const handleImport = () => {
    setError(null);
    mutate(
      { files: usable.map((f) => toPayload(f.parsed)), dryRun: false },
      {
        onSuccess: (result) => {
          toast.success(
            `${pluralize(result.createdClasses, "class")} created, ${pluralize(result.addedStudents, "student")} added.`,
          );
          latestCheck.current++;
          setFiles([]);
          setPreview(null);
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  const handleTemplate = async () => {
    downloadBlob(await buildRosterTemplate(), TEMPLATE_FILE_NAME);
  };

  const canImport = !!preview && preview.createdClasses > 0 && !isPending;

  return (
    <>
      <PageHeader
        title="Import data"
        subtitle="Create classes and add their students from several Excel files at once."
      />

      <div className="max-w-4xl space-y-4">
        <section className="space-y-3 rounded-lg border bg-card p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="m-0 text-base font-semibold">
              1. Download the template
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleTemplate()}
            >
              <Download className="h-4 w-4" />
              Download Excel template
            </Button>
          </div>
          <p className="m-0 text-sm text-muted-foreground">
            One file per class list. Each file has a "Classes" sheet that
            defines the class and a "Students" sheet that lists its students. A
            file with a single class may leave the class code out of the student
            rows; one file may also define several classes. A class whose code
            already exists, or that repeats in another file, is skipped together
            with its students.
          </p>
          <SampleTable
            caption='Sheet "Classes"'
            headers={CLASS_IMPORT_HEADERS}
            row={CLASS_IMPORT_SAMPLE_ROW}
          />
          <SampleTable
            caption='Sheet "Students" (student code or email)'
            headers={STUDENT_HEADERS}
            row={STUDENT_SAMPLE_ROW}
          />
        </section>

        <section className="space-y-3 rounded-lg border bg-card p-4">
          <h2 className="m-0 text-base font-semibold">
            2. Choose the filled files
          </h2>
          <input
            id="import-data-files"
            aria-label="Excel files"
            type="file"
            multiple
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            onChange={(event) => void handleFiles(event)}
            disabled={isImporting || files.length >= MAX_ROSTER_FILES}
            className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
          />
          <p className="m-0 text-xs text-muted-foreground">
            Select several files at once, or come back to add more. Up to{" "}
            {MAX_ROSTER_FILES} files, 2 MB each.
          </p>
          {files.length > 0 && (
            <>
              <RosterFileList
                files={files}
                disabled={isImporting}
                onRemove={(id) =>
                  replaceFiles(files.filter((file) => file.id !== id))
                }
              />
              <Button
                variant="ghost"
                size="sm"
                disabled={isImporting}
                onClick={() => replaceFiles([])}
              >
                Remove all files
              </Button>
            </>
          )}
        </section>

        {isChecking && (
          <p className="m-0 text-sm text-muted-foreground" role="status">
            Checking the files…
          </p>
        )}
        {preview && (
          <section className="space-y-3 rounded-lg border bg-card p-4">
            <h2 className="m-0 text-base font-semibold">
              3. Review and import
            </h2>
            <ImportDataPreview result={preview} />
          </section>
        )}
        {preview && preview.createdClasses === 0 && (
          <p className="m-0 text-sm text-muted-foreground">
            There is nothing to create from these files.
          </p>
        )}
        {error && (
          <p role="alert" className={ERROR_BOX}>
            {error}
          </p>
        )}

        <div className="flex justify-end">
          <Button
            onClick={handleImport}
            disabled={!canImport}
            isLoading={isImporting}
          >
            {preview && preview.createdClasses > 0
              ? `Create ${pluralize(preview.createdClasses, "class")} and add ${pluralize(preview.addedStudents, "student")}`
              : "Create classes"}
          </Button>
        </div>
      </div>
    </>
  );
};

export default ImportDataPage;