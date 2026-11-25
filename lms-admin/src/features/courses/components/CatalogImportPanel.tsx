import { useState, type ChangeEvent, type ReactNode } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/core/api/errors";
import { Badge } from "@/shared/components/ui/Badge";
import { Button } from "@/shared/components/ui/Button";
import { downloadBlob } from "@/shared/utils/download";
import type { CatalogImportResult } from "../types/courses.types";
import type { ParsedCatalogFile } from "../utils/catalog-excel";

/** Larger files are certainly not a list of subjects or semesters; reading them would only freeze the page. */
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_LISTED_PROBLEMS = 100;
const ERROR_BOX =
  "m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive";

const pluralize = (count: number, word: string): string =>
  `${count} ${word}${count === 1 ? "" : "s"}`;

/** Everything that differs between importing subjects and importing semesters. */
export interface CatalogImportConfig<Row> {
  /** Used for element ids, so two panels on one page do not clash. */
  id: string;
  /** What a row is: "subject". */
  noun: string;
  /** Introduction above the steps. */
  description: ReactNode;
  headers: readonly string[];
  sampleRow: readonly string[];
  templateFileName: string;
  buildTemplate: () => Promise<Blob>;
  parseWorkbook: (content: ArrayBuffer) => Promise<ParsedCatalogFile<Row>>;
  importRows: (rows: Row[], dryRun: boolean) => Promise<CatalogImportResult>;
  /** Cached lists that are stale once rows were created. */
  invalidateKey: readonly unknown[];
}

interface ImportVariables<Row> {
  rows: Row[];
  /** true = preview only: nothing changes, so nothing is refreshed. */
  dryRun: boolean;
}

/**
 * One-file import of a simple list (subjects or semesters): download the template, choose the
 * filled file, see per row what would happen, then create everything valid.
 */
export const CatalogImportPanel = <Row,>({
  config,
}: {
  config: CatalogImportConfig<Row>;
}) => {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [preview, setPreview] = useState<CatalogImportResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { mutate, isPending, variables } = useMutation({
    mutationFn: ({ rows: payload, dryRun }: ImportVariables<Row>) =>
      config.importRows(payload, dryRun),
    onSuccess: (_result, { dryRun }) =>
      dryRun
        ? undefined
        : queryClient.invalidateQueries({ queryKey: config.invalidateKey }),
  });
  const isChecking = isPending && variables?.dryRun === true;
  const isImporting = isPending && variables?.dryRun === false;
  const fileInputId = `import-${config.id}-file`;

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

    const parsed = await config.parseWorkbook(await file.arrayBuffer());
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
          toast.success(`${pluralize(result.created, config.noun)} created.`);
          setRows(null);
          setPreview(null);
        },
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  const handleTemplate = async () => {
    downloadBlob(await config.buildTemplate(), config.templateFileName);
  };

  const problems =
    preview?.rows.filter((row) => row.status !== "created") ?? [];

  return (
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
        <p className="m-0 text-sm text-muted-foreground">{config.description}</p>
        <div className="overflow-x-auto rounded-md border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/80 text-muted-foreground">
              <tr>
                {config.headers.map((header) => (
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
                {config.sampleRow.map((cell, index) => (
                  <td
                    key={config.headers[index]}
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

      <section className="space-y-3 rounded-lg border bg-card p-4">
        <label htmlFor={fileInputId} className="block text-base font-semibold">
          2. Choose the filled Excel file
        </label>
        <input
          id={fileInputId}
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
        <section
          className="space-y-3 rounded-lg border bg-card p-4"
          aria-live="polite"
        >
          <h2 className="m-0 text-base font-semibold">3. Review and import</h2>
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
            <div className="max-h-64 overflow-auto rounded-md border">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b bg-muted/80 text-xs uppercase tracking-wider text-muted-foreground">
                  <tr>
                    <th scope="col" className="px-3 py-2">
                      Row
                    </th>
                    <th scope="col" className="px-3 py-2">
                      {config.noun.charAt(0).toUpperCase() +
                        config.noun.slice(1)}
                    </th>
                    <th scope="col" className="px-3 py-2">
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {problems.slice(0, MAX_LISTED_PROBLEMS).map((row) => (
                    <tr key={row.line} className="align-top">
                      <td className="whitespace-nowrap px-3 py-2 text-muted-foreground">
                        {row.line}
                      </td>
                      <td className="px-3 py-2">
                        {row.code ?? "—"}
                        {row.name && (
                          <span className="block text-xs text-muted-foreground">
                            {row.name}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <Badge
                          variant={
                            row.status === "error" ? "destructive" : "default"
                          }
                        >
                          {row.status === "error" ? "Error" : "Skipped"}
                        </Badge>
                        {row.message && (
                          <span className="ml-2">{row.message}</span>
                        )}
                      </td>
                    </tr>
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
        </section>
      )}

      {error && (
        <p role="alert" className={ERROR_BOX}>
          {error}
        </p>
      )}

      <div className="flex justify-end">
        <Button
          onClick={handleImport}
          disabled={!preview || preview.created === 0 || isChecking}
          isLoading={isImporting}
        >
          {preview && preview.created > 0
            ? `Create ${pluralize(preview.created, config.noun)}`
            : `Create ${config.noun}s`}
        </Button>
      </div>
    </div>
  );
};
