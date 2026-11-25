import { useState } from "react";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { getErrorMessage } from "@/core/api/errors";
import { Button } from "@/shared/components/ui/Button";
import { Segmented } from "@/shared/components/ui/Segmented";
import { Select } from "@/shared/components/ui/Select";
import { useSemesters } from "../hooks/useCourseLookups";
import {
  useExportClassRosters,
  useExportReferenceCodes,
} from "../hooks/useExportData";
import type { RosterExportStatus } from "../types/courses.types";

/** Same limit as the backend; only used to explain it. */
const MAX_EXPORT_CLASSES = 2000;
const ERROR_BOX =
  "m-0 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive";

const STATUS_OPTIONS: { value: RosterExportStatus; label: string }[] = [
  { value: "active", label: "Running" },
  { value: "ended", label: "Ended" },
  { value: "all", label: "All" },
];

const RosterExportCard = () => {
  const [semesterId, setSemesterId] = useState("");
  const [status, setStatus] = useState<RosterExportStatus>("active");
  const [error, setError] = useState<string | null>(null);
  const { data: semesters = [] } = useSemesters();
  const { mutate, isPending } = useExportClassRosters();

  const handleExport = () => {
    setError(null);
    const semester = semesters.find((s) => s.id === semesterId);
    mutate(
      {
        semesterId: semesterId || undefined,
        semesterCode: semester?.semesterCode ?? null,
        status,
      },
      {
        onSuccess: () => toast.success("Class rosters exported to Excel."),
        onError: (err) => setError(getErrorMessage(err)),
      },
    );
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="m-0 text-base font-semibold">Class rosters</h2>
      <p className="m-0 text-sm text-muted-foreground">
        Classes and their students. The file has a "Classes" sheet and a
        "Students" sheet laid out like the import template, so it can be
        imported again as it is, for example to copy classes to another system
        or to keep a backup. The extra columns (subject, semester and lecturer
        names, student count, status) are only for reading and are ignored by the
        import. One export holds at most {MAX_EXPORT_CLASSES} classes; above
        that, choose a semester.
      </p>
      <div className="flex flex-wrap items-end gap-4">
        <div className="w-full max-w-xs">
          <Select
            label="Semester"
            value={semesterId}
            placeholder="All semesters"
            onChange={(event) => setSemesterId(event.target.value)}
            options={semesters.map((s) => ({
              value: s.id,
              label: `${s.semesterCode} — ${s.name}`,
            }))}
            disabled={isPending}
          />
        </div>
        <div className="space-y-1.5">
          <span className="block text-xs font-semibold">Classes</span>
          <Segmented
            label="Class status"
            value={status}
            options={STATUS_OPTIONS}
            onChange={setStatus}
          />
        </div>
        <Button onClick={handleExport} isLoading={isPending}>
          <Download className="h-4 w-4" />
          Export class rosters
        </Button>
      </div>
      {error && (
        <p role="alert" className={ERROR_BOX}>
          {error}
        </p>
      )}
    </section>
  );
};

const ReferenceCodesCard = () => {
  const [error, setError] = useState<string | null>(null);
  const { mutate, isPending } = useExportReferenceCodes();

  const handleExport = () => {
    setError(null);
    mutate(undefined, {
      onSuccess: () => toast.success("Reference codes exported to Excel."),
      onError: (err) => setError(getErrorMessage(err)),
    });
  };

  return (
    <section className="space-y-3 rounded-lg border bg-card p-4">
      <h2 className="m-0 text-base font-semibold">Reference codes</h2>
      <p className="m-0 text-sm text-muted-foreground">
        The codes you type into the import templates, in one file: "Subjects",
        "Semesters" (with start and end dates, Vietnam time) and "Lecturers". The
        Availability column of a lecturer says "Available" or why they cannot be
        given a class right now.
      </p>
      <div>
        <Button onClick={handleExport} isLoading={isPending}>
          <Download className="h-4 w-4" />
          Export reference codes
        </Button>
      </div>
      {error && (
        <p role="alert" className={ERROR_BOX}>
          {error}
        </p>
      )}
    </section>
  );
};

/** The two Excel exports of the "Import / Export" page. */
export const ExportPanel = () => (
  <div className="max-w-4xl space-y-4">
    <RosterExportCard />
    <ReferenceCodesCard />
  </div>
);
