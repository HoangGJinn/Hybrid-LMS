import { useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { getErrorMessage } from "@/core/api/errors";
import { Modal } from "@/shared/components/Modal";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { downloadBlob } from "@/shared/utils/download";
import { useImportClasses } from "../hooks/useImportClasses";
import type {
  ClassImportResult,
  ClassImportRowPayload,
  ClassImportRowResult,
} from "../types/courses.types";
import {
  CLASS_IMPORT_HEADERS,
  CLASS_IMPORT_SAMPLE_ROW,
  MAX_IMPORT_ROWS,
  buildClassTemplate,
  parseClassWorkbook,
} from "../utils/class-excel";

/** Larger files are certainly not a class list; reading them would only freeze the page. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_LISTED_PROBLEMS = 100;
const TEMPLATE_FILE_NAME = "classes-template.xlsx";

interface ImportClassesModalProps {
  open: boolean;
  onClose: () => void;
}

const ERROR_BOX =
  "m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive";

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

const ProblemRow = ({ row }: { row: ClassImportRowResult }) => (
  <tr className="align-top">
    <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
      {row.line}
    </td>
    <td className="px-3 py-2">
      {row.classCode ?? "—"}
      {row.name && (
        <span className="block text-xs text-muted-foreground">{row.name}</span>
      )}
    </td>
    <td className="px-3 py-2">
      <Badge variant={row.status === "error" ? "destructive" : "default"}>
        {row.status === "error" ? "Error" : "Skipped"}
      </Badge>
      {row.message && <span className="ml-2">{row.message}</span>}
    </td>
  </tr>
);

const ImportBody = ({ onClose }: { onClose: () => void }) => {
  const [rows, setRows] = useState<ClassImportRowPayload[] | null>(null);
  const [preview, setPreview] = useState<ClassImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending, variables } = useImportClasses();
  const isChecking = isPending && variables?.dryRun === true;
  const isImporting = isPending && variables?.dryRun === false;

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target;
    const file = input.files?.[0];
    setRows(null);
    setPreview(null);
    setError(null);
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) {
      setError("This file is too large. Use an Excel file of at most 2 MB.");
      input.value = "";
      return;
    }

    const parsed = await parseClassWorkbook(await file.arrayBuffer());
    // Lets the same file be picked again after it has been corrected.
    input.value = "";
    if (parsed.error) {
      setError(parsed.error);
      return;
    }
    setRows(parsed.rows);
    mutate(
      { rows: parsed.rows, dryRun: true },
      {
        onSuccess: setPreview,
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  const handleImport = () => {
    if (!rows) return;
    setError(null);
    mutate(
      { rows, dryRun: false },
      {
        onSuccess: (result) => {
          toast.success(`${pluralize(result.created, "class")} created.`);
          onClose();
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  const handleTemplate = async () => {
    downloadBlob(await buildClassTemplate(), TEMPLATE_FILE_NAME);
  };

  const problems =
    preview?.rows.filter((row) => row.status !== "created") ?? [];

  return (
    <div className="space-y-4">
      <p className="m-0 text-sm text-muted-foreground">
        Create many classes at once from an Excel (.xlsx) file. Each row needs a
        class code, a class name, a subject code, a semester code and a lecturer
        code or email (up to {MAX_IMPORT_ROWS} rows). A class whose code already
        exists, or that appears twice in the file, is skipped.
      </p>

      <section className="space-y-2 rounded-md border p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="m-0 text-sm font-semibold">
            1. Download the template
          </h3>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleTemplate()}
          >
            <Download className="h-4 w-4" />
            Download Excel template
          </Button>
        </div>
        <p className="m-0 text-xs text-muted-foreground">
          Fill in one class per row under the header, keeping the column order
          below. The template also has a "Guide" sheet.
        </p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/80 text-muted-foreground">
              <tr>
                {CLASS_IMPORT_HEADERS.map((header) => (
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
                {CLASS_IMPORT_SAMPLE_ROW.map((cell, index) => (
                  <td
                    key={CLASS_IMPORT_HEADERS[index]}
                    className="whitespace-nowrap px-3 py-2"
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section className="space-y-2 rounded-md border p-3">
        <label
          htmlFor="import-classes-file"
          className="block text-sm font-semibold"
        >
          2. Choose the filled Excel file
        </label>
        <input
          id="import-classes-file"
          type="file"
          accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          onChange={(event) => void handleFile(event)}
          disabled={isImporting}
          className="block w-full text-sm file:mr-3 file:cursor-pointer file:rounded-md file:border file:border-input file:bg-background file:px-3 file:py-1.5 file:text-sm file:font-medium hover:file:bg-accent"
        />
      </section>

      {isChecking && (
        <p className="m-0 text-sm text-muted-foreground" role="status">
          Checking the file…
        </p>
      )}

      {preview && (
        <div className="space-y-3" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <Badge variant="success">{preview.created} to create</Badge>
            <Badge>{preview.skipped} skipped</Badge>
            <Badge variant={preview.failed > 0 ? "destructive" : "default"}>
              {pluralize(preview.failed, "error")}
            </Badge>
            <span className="text-muted-foreground">
              in {pluralize(preview.total, "row")}
            </span>
          </div>
          {problems.length > 0 && (
            <div className="max-h-56 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b bg-muted/80 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Row
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Class
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {problems.slice(0, MAX_LISTED_PROBLEMS).map((row) => (
                    <ProblemRow key={row.line} row={row} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {problems.length > MAX_LISTED_PROBLEMS && (
            <p className="m-0 text-xs text-muted-foreground">
              Showing the first {MAX_LISTED_PROBLEMS} of {problems.length} rows
              that need attention.
            </p>
          )}
          {preview.created === 0 && (
            <p className="m-0 text-sm text-muted-foreground">
              There is nothing to create from this file.
            </p>
          )}
        </div>
      )}

      {error && (
        <p role="alert" className={ERROR_BOX}>
          {error}
        </p>
      )}

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose} disabled={isImporting}>
          Cancel
        </Button>
        <Button
          onClick={handleImport}
          disabled={!preview || preview.created === 0 || isChecking}
          isLoading={isImporting}
        >
          {preview && preview.created > 0
            ? `Create ${pluralize(preview.created, "class")}`
            : "Create"}
        </Button>
      </div>
    </div>
  );
};

/** Bulk "Add course" from an Excel file, with a preview of the outcome (duplicates included) before anything is written. */
export const ImportClassesModal = ({
  open,
  onClose,
}: ImportClassesModalProps) => (
  <Modal open={open} title="Import courses" size="lg" onClose={onClose}>
    {/* Mounted only while open, so every opening starts without a file or a preview. */}
    {open && <ImportBody onClose={onClose} />}
  </Modal>
);