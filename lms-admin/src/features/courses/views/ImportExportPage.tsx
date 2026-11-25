import { useState } from "react";
import { PageHeader } from "@/shared/components/PageHeader";
import { Segmented } from "@/shared/components/ui/Segmented";
import { ClassDataImportPanel } from "../components/ClassDataImportPanel";
import { ExportPanel } from "../components/ExportPanel";
import { SemesterImportPanel } from "../components/SemesterImportPanel";
import { SubjectImportPanel } from "../components/SubjectImportPanel";

type Direction = "import" | "export";
type ImportKind = "classes" | "subjects" | "semesters";

const DIRECTIONS: { value: Direction; label: string }[] = [
  { value: "import", label: "Import" },
  { value: "export", label: "Export" },
];

const IMPORT_KINDS: { value: ImportKind; label: string }[] = [
  { value: "classes", label: "Classes & students" },
  { value: "subjects", label: "Subjects" },
  { value: "semesters", label: "Semesters" },
];

/**
 * "Import / Export": bulk-create classes (with their students), subjects and semesters from Excel
 * files, or download class rosters and the reference codes the templates ask for. Every panel stays
 * mounted while hidden, so switching tabs does not throw away a file that was already chosen.
 */
const ImportExportPage = () => {
  const [direction, setDirection] = useState<Direction>("import");
  const [kind, setKind] = useState<ImportKind>("classes");

  return (
    <>
      <PageHeader
        title="Import / Export"
        subtitle="Create data from Excel files, or download it as Excel."
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented
          label="Import or export"
          value={direction}
          options={DIRECTIONS}
          onChange={setDirection}
        />
        {direction === "import" && (
          <Segmented
            label="What to import"
            value={kind}
            options={IMPORT_KINDS}
            onChange={setKind}
          />
        )}
      </div>

      <div hidden={direction !== "import" || kind !== "classes"}>
        <ClassDataImportPanel />
      </div>
      <div hidden={direction !== "import" || kind !== "subjects"}>
        <SubjectImportPanel />
      </div>
      <div hidden={direction !== "import" || kind !== "semesters"}>
        <SemesterImportPanel />
      </div>
      <div hidden={direction !== "export"}>
        <ExportPanel />
      </div>
    </>
  );
};

export default ImportExportPage;
