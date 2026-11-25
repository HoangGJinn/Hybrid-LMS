import { semesterService } from "../api/semester.service";
import { courseKeys } from "../api/queryKeys";
import type { SemesterImportRowPayload } from "../types/courses.types";
import {
  SEMESTER_IMPORT_HEADERS,
  SEMESTER_IMPORT_SAMPLE_ROW,
  buildSemesterTemplate,
  parseSemesterWorkbook,
} from "../utils/catalog-excel";
import { MAX_IMPORT_ROWS } from "../utils/class-excel";
import {
  CatalogImportPanel,
  type CatalogImportConfig,
} from "./CatalogImportPanel";

const CONFIG: CatalogImportConfig<SemesterImportRowPayload> = {
  id: "semesters",
  noun: "semester",
  description: (
    <>
      One semester per row, up to {MAX_IMPORT_ROWS} rows. Each row needs a
      semester code, a name and a start and end date written as dd/MM/yyyy or
      yyyy-MM-dd. Dates are days in Vietnam time: a semester starts at 00:00 on
      its start date and ends at 23:59 on its end date. A semester whose code
      already exists, or that appears twice in the file, is skipped. The
      template also has a "Guide" sheet.
    </>
  ),
  headers: SEMESTER_IMPORT_HEADERS,
  sampleRow: SEMESTER_IMPORT_SAMPLE_ROW,
  templateFileName: "semesters-template.xlsx",
  buildTemplate: buildSemesterTemplate,
  parseWorkbook: parseSemesterWorkbook,
  importRows: semesterService.importSemesters,
  invalidateKey: courseKeys.semesters(),
};

/** Bulk "Create semester" from an Excel file. */
export const SemesterImportPanel = () => <CatalogImportPanel config={CONFIG} />;
